
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, 
  BarChart2, 
  Layout, 
  Share2, 
  Sparkles, 
  ArrowRight,
  Menu,
  X,
  LogOut,
  Shield,
  User as UserIcon,
  Users,
  Settings,
  CheckCircle,
  Zap,
  Globe,
  Image as ImageIcon,
  Search,
  Filter,
  Tag,
  Heart,
  Mail,
  Lock,
  Loader2,
  Trash2,
  AlertTriangle,
  Crown,
  FileText,
  EyeOff,
  Eye,
  Ban,
  Unlock,
  LogIn,
  Key,
  Cloud,
  Database,
  Info,
  TrendingUp,
  Calendar,
  MoreVertical,
  Copy,
  ExternalLink,
  Wand2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { generateCampaignDetails } from './services/geminiService';
import PhotoEditor from './components/PhotoEditor';
import TextTemplateBuilder from './components/TextTemplateBuilder';
import CampaignAnalytics from './components/CampaignAnalytics';
import { Campaign, SubscriptionTier, UserRole, User, CampaignCategory, CampaignType, TextFieldConfig } from './types';
import { auth, db, storage, googleProvider, isConfigured as isFirebaseReady } from './services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  updateDoc,
  increment
} from 'firebase/firestore';

// --- PROFILS PAR DÉFAUT (SIMULATION) ---
const MOCK_USERS_INIT: User[] = [
  {
    id: 'u_admin',
    name: 'Super Admin',
    email: 'admin@frameflow.com',
    role: UserRole.ADMIN,
    subscription: SubscriptionTier.PREMIUM,
    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff&size=128',
    bio: 'Gestionnaire suprême de la plateforme.',
    isBanned: false
  },
  {
    id: 'u_creator',
    name: 'Créateur Pro',
    email: 'creator@frameflow.com',
    role: UserRole.CREATOR,
    subscription: SubscriptionTier.PREMIUM,
    avatar: 'https://ui-avatars.com/api/?name=Createur+Pro&background=2563eb&color=fff&size=128',
    bio: 'Créateur de contenu viral et de certificats.',
    isBanned: false
  },
  {
    id: 'u_free',
    name: 'Créateur Free',
    email: 'free@frameflow.com',
    role: UserRole.CREATOR,
    subscription: SubscriptionTier.FREE,
    avatar: 'https://ui-avatars.com/api/?name=Createur+Free&background=94a3b8&color=fff&size=128',
    bio: 'Utilisateur standard.',
    isBanned: false
  }
];

// Données fictives pour peupler le dashboard si Firebase est vide/désactivé
const MOCK_CAMPAIGNS: Campaign[] = [];

// --- AUTH CONTEXT ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginAsProfile: (userId: string) => void; // Nouvelle méthode simplifiée
  logout: () => void;
  deleteUser: (id: string) => void;
  toggleBanUser: (id: string) => void;
  deleteCampaign: (id: string) => void;
  addCampaign: (campaign: Campaign) => Promise<void>;
  mockUsers: User[];
  allUsers: User[];
}

const AuthContext = createContext<AuthContextType>(null!);

// Helper to Compress Image to Base64 (Max 1MB for Firestore)
const compressAndConvertToBase64 = (file: File): Promise<string> => {
   return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
         const img = new Image();
         img.src = event.target?.result as string;
         img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
         };
         img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
   });
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to={user ? "/dashboard" : "/"} className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold transform -rotate-3">F</div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">FrameFlow</span>
            </Link>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-full border border-yellow-200">
               <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
               <span className="text-[10px] font-bold text-yellow-700">MODE SIMULATION</span>
            </div>

            <div className="hidden md:flex items-center space-x-6">
               <Link to="/explore" className="text-slate-600 hover:text-blue-600 font-medium text-sm flex items-center gap-1">
                 <Search size={16} /> Explorer
               </Link>
            </div>
          </div>
          
          {user ? (
            <div className="hidden sm:flex sm:items-center sm:space-x-8">
              {user.role === UserRole.ADMIN ? (
                 <Link to="/admin" className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2">
                   <Shield size={16}/> Admin Panel
                 </Link>
              ) : (
                <>
                  <Link to="/dashboard" className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Tableau de bord</Link>
                  <Link to="/create" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    + Créer
                  </Link>
                </>
              )}
              
              <div className="border-l border-slate-200 h-6 mx-2"></div>
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-bold text-slate-800 flex items-center justify-end gap-1">
                    {user.name}
                    {user.subscription === SubscriptionTier.PREMIUM && <Crown size={14} className="text-yellow-500 fill-yellow-500" />}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">{user.role === UserRole.ADMIN ? 'Administrateur' : user.subscription}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                    <img src={user.avatar} alt="" className="w-full h-full object-cover"/>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Déconnexion">
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex sm:items-center sm:space-x-6">
              <Link to="/login" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                Connexion
              </Link>
            </div>
          )}

          <div className="flex items-center sm:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-500 hover:text-slate-700 p-2">
               {isOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 animate-fade-in">
          <Link to="/explore" className="block px-4 py-3 text-slate-800 font-medium border-b border-slate-50" onClick={() => setIsOpen(false)}>
             🔍 Explorer les cadres
          </Link>
          {user ? (
            <div className="pt-2 pb-3 space-y-1 px-4">
              <Link to="/dashboard" className="block text-slate-600 py-2 font-medium" onClick={() => setIsOpen(false)}>Tableau de bord</Link>
              <Link to="/create" className="block text-blue-600 py-2 font-medium" onClick={() => setIsOpen(false)}>+ Créer une campagne</Link>
              <button onClick={handleLogout} className="w-full text-left text-red-600 py-2 font-medium mt-2">Déconnexion</button>
            </div>
          ) : (
             <div className="pt-2 pb-3 space-y-1 px-4">
                <Link to="/login" className="block py-2 text-slate-800 font-bold" onClick={() => setIsOpen(false)}>Connexion</Link>
             </div>
          )}
        </div>
      )}
    </nav>
  );
};

// ... [CampaignCard, ExplorePage, PublicCreatorProfile, LandingPage remain identical] ...
const CampaignCard: React.FC<{ campaign: Campaign, creator?: User }> = ({ campaign, creator }) => {
  return (
    <Link to={`/campaign/${campaign.id}`} className="block group h-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all h-full flex flex-col relative">
        {campaign.isPrivate && (
           <div className="absolute top-2 left-2 z-20 bg-slate-900/80 backdrop-blur text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
             <EyeOff size={10} /> PRIVÉ
           </div>
        )}

        <div className="relative aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-slate-100" />
          <div 
             className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-20 blur-xl scale-110"
             style={{ backgroundImage: `url(${campaign.frameUrl})` }}
          />
          <img 
            src={campaign.frameUrl} 
            alt={campaign.title} 
            className="w-full h-full object-contain p-4 relative z-10 group-hover:scale-105 transition-transform duration-300"
          />
           <div className="absolute top-2 right-2 z-20 flex gap-1">
               {campaign.type === CampaignType.DOCUMENT ? (
                 <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                   <FileText size={10} /> DOC
                 </span>
               ) : (
                 <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                   <ImageIcon size={10} /> PHOTO
                 </span>
               )}
           </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="mb-1 text-[10px] uppercase font-bold text-slate-400">{campaign.category}</div>
          <h3 className="font-bold text-slate-900 leading-tight mb-1 group-hover:text-blue-600 transition-colors">
            {campaign.title}
          </h3>
          <div className="flex items-center gap-2 mt-auto pt-3">
             {creator && (
               <img src={creator.avatar} alt={creator.name} className="w-5 h-5 rounded-full object-cover" />
             )}
             <span className="text-xs text-slate-500 truncate">
               {creator ? creator.name : 'Inconnu'}
             </span>
             {creator?.subscription === SubscriptionTier.PREMIUM && (
               <Crown size={10} className="text-yellow-500 fill-yellow-500" />
             )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
             <span className="flex items-center gap-1"><Users size={12}/> {campaign.stats.downloads}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const ExplorePage = ({ campaigns, users }: { campaigns: Campaign[], users: User[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  const categories = ['Tous', ...Object.values(CampaignCategory)];

  // Filter out private campaigns and apply search logic
  const filteredCampaigns = campaigns.filter(c => {
    if (c.isPrivate) return false; // HIDE PRIVATE CAMPAIGNS
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.hashtags.some(h => h.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Tous' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <div className="bg-white border-b border-slate-200 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Explorez les créations de la communauté</h1>
          <div className="relative max-w-xl mx-auto">
            <input 
              type="text" 
              placeholder="Rechercher une campagne, un événement..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-lg"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="mt-8">
           <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
             {selectedCategory === 'Tous' ? 'Tendances' : selectedCategory}
             <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredCampaigns.length}</span>
           </h2>
           {filteredCampaigns.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 auto-rows-fr">
               {filteredCampaigns.map(c => (
                 <CampaignCard key={c.id} campaign={c} creator={users.find(u => u.id === c.creatorId)} />
               ))}
             </div>
           ) : (
             <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <Search size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Aucune campagne publique trouvée.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const PublicCreatorProfile = ({ users, campaigns }: { users: User[], campaigns: Campaign[] }) => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const creator = users.find(u => u.id === creatorId);
  const creatorCampaigns = campaigns.filter(c => c.creatorId === creatorId && !c.isPrivate);
  if (!creator) return <div className="text-center py-20">Utilisateur introuvable</div>;
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
           <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-lg relative">
                 <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-center md:text-left">
                 <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
                   {creator.name}
                   {creator.subscription === SubscriptionTier.PREMIUM && <Crown size={24} className="text-yellow-500 fill-yellow-500" />}
                 </h1>
                 {creator.bio && <p className="text-slate-600 mt-2 max-w-xl">{creator.bio}</p>}
                 <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Layout size={16}/> {creatorCampaigns.length} Campagnes</span>
                    {creator.subscription === SubscriptionTier.PREMIUM && (
                      <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200"><Crown size={12}/> Créateur Pro</span>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Campagnes Publiques</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 auto-rows-fr">
           {creatorCampaigns.map(c => (
             <CampaignCard key={c.id} campaign={c} creator={creator} />
           ))}
        </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { user } = useContext(AuthContext);
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
               Générez des cadres et des <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Documents Dynamiques</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-10">
               Créez des campagnes virales ou des générateurs de certificats en quelques clics.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
               <Link to="/explore" className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                  <Search size={20}/> Explorer
               </Link>
               <Link to="/login" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <Plus size={20}/> Créer
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
};

// 4. NEW SIMPLIFIED LOGIN PAGE (No Forms, Just Profiles)
const LoginPage = () => {
  const { loginAsProfile, mockUsers } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleProfileClick = (userId: string) => {
    loginAsProfile(userId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
       <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
             <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold shadow-lg transform -rotate-3">F</div>
             <h2 className="text-3xl font-bold text-slate-900">Qui êtes-vous ?</h2>
             <p className="text-slate-600 mt-2">Mode Simulation : Choisissez un profil pour tester l'application.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {mockUsers.map(user => (
               <button 
                  key={user.id}
                  onClick={() => handleProfileClick(user.id)}
                  className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all group text-left"
               >
                  <div className="flex items-start gap-6">
                     <div className="relative">
                        <img src={user.avatar} className="w-16 h-16 rounded-full object-cover border-4 border-slate-50 group-hover:border-blue-50 transition-colors" alt={user.name} />
                        {user.subscription === SubscriptionTier.PREMIUM && (
                           <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white p-1.5 rounded-full border-2 border-white">
                              <Crown size={10} fill="white" />
                           </div>
                        )}
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{user.name}</h3>
                        <div className="flex items-center gap-2 mt-1 mb-3">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${user.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {user.role}
                           </span>
                           <span className="text-[10px] text-slate-400 font-medium border border-slate-200 px-2 py-0.5 rounded-full">{user.subscription}</span>
                        </div>
                     </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400 group-hover:text-blue-600">
                     <span className="text-xs font-medium">Se connecter</span>
                     <ArrowRight size={16} />
                  </div>
               </button>
             ))}
          </div>
          
          <div className="text-center mt-12">
             <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm font-medium">Retour à l'accueil</Link>
          </div>
       </div>
    </div>
  );
};

// No Signup Page needed in Simulation Mode
const SignupPage = () => {
   return <Navigate to="/login" replace />;
};

const AdminDashboard = ({ campaigns }: { campaigns: Campaign[] }) => {
    return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 m-8">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Panneau Super Admin</h2>
      <p className="mb-4">Simulation de l'interface d'administration.</p>
      <div className="grid grid-cols-3 gap-4 text-left">
         <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <div className="text-sm text-slate-500">Campagnes Totales</div>
         </div>
      </div>
    </div>;
};

// 7. NEW ENHANCED CREATOR DASHBOARD
const CreatorDashboard = ({ campaigns }: { campaigns: Campaign[] }) => {
  const { user, addCampaign } = useContext(AuthContext);
  const [filterType, setFilterType] = useState<'ALL' | CampaignType>('ALL');
  const [search, setSearch] = useState('');
  const [loadingSamples, setLoadingSamples] = useState(false);

  const myCampaigns = campaigns.filter(c => c.creatorId === user?.id);
  
  // Calculate Stats
  const totalViews = myCampaigns.reduce((acc, c) => acc + (c.stats.views || 0), 0);
  const totalDownloads = myCampaigns.reduce((acc, c) => acc + (c.stats.downloads || 0), 0);
  const topCampaign = [...myCampaigns].sort((a,b) => b.stats.downloads - a.stats.downloads)[0];

  const filteredCampaigns = myCampaigns.filter(c => {
     const matchesType = filterType === 'ALL' || c.type === filterType;
     const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
     return matchesType && matchesSearch;
  });

  const handleAddSamples = async () => {
     if(!user) return;
     setLoadingSamples(true);
     
     const sampleFrame: Campaign = {
        id: `c_sample_frame_${Date.now()}`,
        creatorId: user.id,
        type: CampaignType.PHOTO_FRAME,
        title: "Supporter Officiel (Exemple)",
        description: "Un cadre pour montrer votre soutien à l'équipe nationale.",
        category: CampaignCategory.ENTERTAINMENT,
        frameUrl: "https://placehold.co/1080x1080/2563eb/FFF/png?text=CADRE+PHOTO+DEMO",
        hashtags: ["#Supporter", "#Team", "#Demo"],
        createdAt: new Date().toISOString(),
        stats: { views: 120, downloads: 45, shares: 10 },
        creatorTier: user.subscription,
        isPrivate: false
     };

     const sampleDoc: Campaign = {
        id: `c_sample_doc_${Date.now()}`,
        creatorId: user.id,
        type: CampaignType.DOCUMENT,
        title: "Diplôme d'Honneur (Exemple)",
        description: "Modèle de certificat pour vos formations.",
        category: CampaignCategory.EDUCATION,
        frameUrl: "https://placehold.co/1080x720/f8fafc/0f172a/png?text=DIPLOME+VIERGE",
        hashtags: ["#Diplome", "#Formation", "#Demo"],
        createdAt: new Date().toISOString(),
        stats: { views: 300, downloads: 89, shares: 25 },
        creatorTier: user.subscription,
        isPrivate: false,
        textFieldsConfig: [
           { id: 'f1', label: 'Nom du Bénéficiaire', defaultValue: 'Jean Dupont', x: 50, y: 40, fontFamily: 'Great Vibes', fontSize: 60, color: '#1e293b', align: 'center' },
           { id: 'f2', label: 'Titre', defaultValue: 'Formation React', x: 50, y: 55, fontFamily: 'Montserrat', fontSize: 30, color: '#334155', align: 'center' },
           { id: 'f3', label: 'Date', defaultValue: '12 Octobre 2024', x: 50, y: 70, fontFamily: 'Inter', fontSize: 20, color: '#64748b', align: 'center' }
        ]
     };

     await addCampaign(sampleFrame);
     await addCampaign(sampleDoc);
     setLoadingSamples(false);
  };

  const copyLink = (id: string) => {
     const url = `${window.location.origin}/#/campaign/${id}`;
     navigator.clipboard.writeText(url);
     alert("Lien copié !");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER / WELCOME BANNER */}
      <div className="bg-white border-b border-slate-200">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-slate-900">Bonjour, {user?.name} 👋</h1>
                  <p className="text-slate-500">Voici ce qui se passe avec vos campagnes aujourd'hui.</p>
               </div>
               <div className="flex gap-3">
                  <button 
                     onClick={handleAddSamples}
                     disabled={loadingSamples}
                     className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                     {loadingSamples ? <Loader2 size={18} className="animate-spin"/> : <Wand2 size={18} className="text-purple-500"/>}
                     Charger modèles
                  </button>
                  <Link to="/create" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5">
                     <Plus size={18} /> Créer une campagne
                  </Link>
               </div>
            </div>

            {/* KPI STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
               <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                     <Users size={24}/>
                  </div>
                  <div>
                     <div className="text-sm text-slate-500 font-medium">Total Téléchargements</div>
                     <div className="text-2xl font-bold text-slate-900">{totalDownloads}</div>
                  </div>
               </div>
               <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                     <TrendingUp size={24}/>
                  </div>
                  <div>
                     <div className="text-sm text-slate-500 font-medium">Vues Totales</div>
                     <div className="text-2xl font-bold text-slate-900">{totalViews}</div>
                  </div>
               </div>
               <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                     <CheckCircle size={24}/>
                  </div>
                  <div>
                     <div className="text-sm text-slate-500 font-medium">Campagnes Actives</div>
                     <div className="text-2xl font-bold text-slate-900">{myCampaigns.length}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* FILTERS & LIST */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800">Vos Campagnes</h2>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input 
                     type="text" 
                     placeholder="Rechercher..." 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
               </div>
               <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
               >
                  <option value="ALL">Tous les types</option>
                  <option value={CampaignType.PHOTO_FRAME}>Cadres Photo</option>
                  <option value={CampaignType.DOCUMENT}>Documents</option>
               </select>
            </div>
         </div>

         {/* CAMPAIGN GRID */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map(campaign => (
               <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                  <div className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                     <div 
                        className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-40 blur-sm"
                        style={{ backgroundImage: `url(${campaign.frameUrl})` }}
                     />
                     <img src={campaign.frameUrl} alt={campaign.title} className="h-36 w-36 object-contain z-10 drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />
                     
                     <div className="absolute top-2 right-2 flex gap-1">
                        {campaign.type === CampaignType.DOCUMENT ? (
                           <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full border border-purple-200">DOC</span>
                        ) : (
                           <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-200">PHOTO</span>
                        )}
                     </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-800 truncate pr-2 flex-1" title={campaign.title}>{campaign.title}</h3>
                        <button onClick={() => copyLink(campaign.id)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Copier le lien public">
                           <Copy size={16}/>
                        </button>
                     </div>
                     <div className="text-xs text-slate-500 mb-4 line-clamp-2">{campaign.description}</div>
                     
                     <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                           <span className="flex items-center gap-1 font-medium"><Users size={14}/> {campaign.stats.downloads}</span>
                           <span className="flex items-center gap-1"><Eye size={14}/> {campaign.stats.views}</span>
                        </div>
                        
                        <div className="flex gap-2">
                           {/* Bouton Analytics - Seulement pour Premium ou Admin */}
                           {(user?.subscription === SubscriptionTier.PREMIUM || user?.role === UserRole.ADMIN) && (
                              <Link 
                                 to={`/analytics/${campaign.id}`}
                                 className="text-yellow-600 bg-yellow-50 hover:bg-yellow-100 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                                 title="Statistiques Détaillées (Premium)"
                              >
                                 <BarChart2 size={16}/>
                              </Link>
                           )}

                           <Link 
                              to={`/campaign/${campaign.id}`} 
                              className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1"
                           >
                              Gérer <ArrowRight size={14}/>
                           </Link>
                        </div>
                     </div>
                  </div>
               </div>
            ))}

            {filteredCampaigns.length === 0 && (
               <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                     <Search size={32}/>
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">Aucune campagne trouvée</h3>
                  <p className="text-slate-500 mb-6">Essayez de changer vos filtres ou créez une nouvelle campagne.</p>
                  <button onClick={handleAddSamples} disabled={loadingSamples} className="text-blue-600 font-bold hover:underline">
                     Charger des exemples de test
                  </button>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

// ... [CreateCampaign, ParticipantView, ProtectedRoute remain same] ...
const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles?: UserRole[] }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== UserRole.ADMIN) {
     return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">Accès non autorisé.</div>;
  }
  return <>{children}</>;
};

const CreateCampaign = ({ onAdd }: { onAdd: (c: Campaign) => Promise<void> }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CampaignCategory>(CampaignCategory.EVENT);
  const [type, setType] = useState<CampaignType>(CampaignType.PHOTO_FRAME);
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [framePreview, setFramePreview] = useState('');
  
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  
  const [textFields, setTextFields] = useState<TextFieldConfig[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       setFrameFile(file);
       // Preview local
       const url = URL.createObjectURL(file);
       setFramePreview(url);
    }
  };

  const handleGenerateAI = async () => {
     setAiLoading(true);
     const result = await generateCampaignDetails(title, category);
     setDescription(result.description);
     setHashtags(result.hashtags);
     setAiLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !frameFile) return;
    setLoading(true);

    try {
      // 1. Convert Image to Base64 (No Storage Bucket needed)
      const base64Image = await compressAndConvertToBase64(frameFile);

      // 2. Create Campaign Object
      const newCampaign: Campaign = {
        id: `c_${Date.now()}`,
        creatorId: user.id,
        type: type,
        title,
        description,
        category,
        frameUrl: base64Image,
        hashtags,
        createdAt: new Date().toISOString(),
        stats: { views: 0, downloads: 0, shares: 0 },
        creatorTier: user.subscription,
        textFieldsConfig: type === CampaignType.DOCUMENT ? textFields : undefined,
        isPrivate: false
      };

      await onAdd(newCampaign);
      navigate('/dashboard');

    } catch (e) {
      console.error(e);
      alert("Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
       <Navbar />
       <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             {/* Header steps */}
             <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
                <h1 className="text-xl font-bold text-slate-900">Créer une campagne</h1>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                   <span className={step >= 1 ? 'text-blue-600' : ''}>1. Détails</span>
                   <span>&rarr;</span>
                   <span className={step >= 2 ? 'text-blue-600' : ''}>2. Design</span>
                   <span>&rarr;</span>
                   <span className={step >= 3 ? 'text-blue-600' : ''}>3. Finalisation</span>
                </div>
             </div>

             <div className="p-8">
                {step === 1 && (
                   <div className="space-y-6">
                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Titre de la campagne</label>
                         <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Cadre Supporter 2024" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Catégorie</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value as CampaignCategory)} className="w-full p-3 border border-slate-300 rounded-lg bg-white">
                               {Object.values(CampaignCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Type de Campagne</label>
                            <div className="grid grid-cols-2 gap-3">
                               <button 
                                  onClick={() => setType(CampaignType.PHOTO_FRAME)}
                                  className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 ${type === CampaignType.PHOTO_FRAME ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                               >
                                  <ImageIcon size={16}/> Cadre Photo
                               </button>
                               <button 
                                  onClick={() => setType(CampaignType.DOCUMENT)}
                                  className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 ${type === CampaignType.DOCUMENT ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                               >
                                  <FileText size={16}/> Document
                               </button>
                            </div>
                         </div>
                      </div>
                      <div className="pt-4 flex justify-end">
                         <button onClick={() => { if(title) setStep(2); }} disabled={!title} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">Suivant</button>
                      </div>
                   </div>
                )}

                {step === 2 && (
                   <div className="space-y-6">
                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-4">
                            {type === CampaignType.PHOTO_FRAME ? "Importer le cadre (PNG transparent recommandé)" : "Importer le fond du document"}
                         </label>
                         
                         {!framePreview ? (
                            <label className="border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                               <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                  <Cloud size={32}/>
                               </div>
                               <span className="font-bold text-slate-600">Cliquez pour importer une image</span>
                               <span className="text-sm text-slate-400 mt-2">Max 2 Mo • PNG, JPG</span>
                               <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
                            </label>
                         ) : (
                            <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                               <img src={framePreview} alt="Preview" className="max-h-[400px] w-auto mx-auto object-contain"/>
                               <button onClick={() => { setFrameFile(null); setFramePreview(''); }} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md text-red-500 hover:bg-red-50">
                                  <Trash2 size={20}/>
                               </button>
                            </div>
                         )}
                      </div>

                      {/* Configurator for Documents */}
                      {type === CampaignType.DOCUMENT && framePreview && (
                         <div className="mt-8 border-t border-slate-200 pt-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                               <Settings size={20} className="text-purple-600"/> Configuration des champs dynamiques
                            </h3>
                            <TextTemplateBuilder 
                               frameUrl={framePreview}
                               onConfigChange={setTextFields}
                            />
                         </div>
                      )}

                      <div className="pt-4 flex justify-between">
                         <button onClick={() => setStep(1)} className="text-slate-600 font-bold hover:bg-slate-100 px-4 py-2 rounded-lg">Retour</button>
                         <button onClick={() => { if(frameFile) setStep(3); }} disabled={!frameFile} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">Suivant</button>
                      </div>
                   </div>
                )}

                {step === 3 && (
                   <div className="space-y-6">
                      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                         <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-blue-900 flex items-center gap-2"><Sparkles size={20}/> Assistant IA (Gemini)</h3>
                            <button 
                               onClick={handleGenerateAI}
                               disabled={aiLoading}
                               className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-70"
                            >
                               {aiLoading ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                               Générer le contenu
                            </button>
                         </div>
                         <p className="text-sm text-blue-700 mb-4">Laissez l'IA rédiger une description accrocheuse et trouver les meilleurs hashtags pour votre campagne.</p>
                      </div>

                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                         <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Décrivez votre campagne..."/>
                      </div>

                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Hashtags</label>
                         <div className="flex flex-wrap gap-2 mb-2">
                            {hashtags.map((tag, i) => (
                               <span key={i} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                  {tag}
                                  <button onClick={() => setHashtags(hashtags.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X size={14}/></button>
                               </span>
                            ))}
                         </div>
                         <input 
                            type="text" 
                            placeholder="Ajouter un hashtag (Entrée)" 
                            onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                     setHashtags([...hashtags, val.startsWith('#') ? val : `#${val}`]);
                                     e.currentTarget.value = '';
                                  }
                               }
                            }}
                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                         />
                      </div>

                      <div className="pt-4 flex justify-between border-t border-slate-100 mt-8">
                         <button onClick={() => setStep(2)} className="text-slate-600 font-bold hover:bg-slate-100 px-4 py-2 rounded-lg">Retour</button>
                         <button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-70 flex items-center gap-2 shadow-lg hover:shadow-green-200 transition-all">
                            {loading ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle size={20}/>}
                            Publier la campagne
                         </button>
                      </div>
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

const ParticipantView = ({ campaigns, users }: { campaigns: Campaign[], users: User[] }) => {
  const { id } = useParams<{ id: string }>();
  const campaign = campaigns.find(c => c.id === id);
  const creator = users.find(u => u.id === campaign?.creatorId);
  const [downloaded, setDownloaded] = useState(false);

  if (!campaign) return <div className="text-center py-20 font-bold text-slate-500">Campagne introuvable</div>;

  return (
    <div className="min-h-screen bg-slate-50">
       <Navbar />
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          
          {/* Header */}
          <div className="mb-8 text-center md:text-left">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide mb-3">
                      {campaign.category}
                   </div>
                   <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 leading-tight">
                      {campaign.title}
                   </h1>
                   <p className="text-lg text-slate-600 max-w-2xl">
                      {campaign.description}
                   </p>
                </div>
                {creator && (
                   <Link to={`/u/${creator.id}`} className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full border border-slate-200 hover:border-blue-300 transition-colors shadow-sm">
                      <img src={creator.avatar} alt={creator.name} className="w-10 h-10 rounded-full object-cover"/>
                      <div className="text-left">
                         <div className="text-xs text-slate-500 font-bold uppercase">Créé par</div>
                         <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                            {creator.name}
                            {creator.subscription === SubscriptionTier.PREMIUM && <Crown size={12} className="text-yellow-500 fill-yellow-500"/>}
                         </div>
                      </div>
                   </Link>
                )}
             </div>

             {/* Hashtags */}
             <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                {campaign.hashtags.map(tag => (
                   <span key={tag} className="text-blue-600 font-medium text-sm hover:underline cursor-pointer">
                      {tag}
                   </span>
                ))}
             </div>
          </div>

          {/* Editor Area */}
          <PhotoEditor 
             campaign={campaign} 
             onDownloadComplete={() => setDownloaded(true)}
          />

          {/* Success Message */}
          {downloaded && (
             <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-bounce-in z-50">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-slate-900">
                   <CheckCircle size={24}/>
                </div>
                <div>
                   <h4 className="font-bold">Téléchargement réussi !</h4>
                   <p className="text-sm text-slate-300">Partagez votre création sur les réseaux sociaux.</p>
                </div>
                <button onClick={() => setDownloaded(false)} className="text-slate-400 hover:text-white"><X/></button>
             </div>
          )}
       </div>
    </div>
  );
};

// COMPONENT WRAPPER FOR ANALYTICS
// Needed to extract params and find campaign
const AnalyticsWrapper = ({ campaigns, user }: { campaigns: Campaign[], user: User | null }) => {
   const { id } = useParams<{ id: string }>();
   const campaign = campaigns.find(c => c.id === id);
   
   if (!campaign) return <div className="text-center py-20">Campagne introuvable</div>;
   
   return <CampaignAnalytics campaign={campaign} currentUser={user} />;
};

const App = () => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS_INIT);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);

  // --- LOGIC AUTH SIMULÉE ---
  
  const loginAsProfile = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const deleteUser = async (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const toggleBanUser = async (id: string) => {
     setUsers(prev => prev.map(u => u.id === id ? { ...u, isBanned: !u.isBanned } : u));
  };

  // --- LOGIC DATA SIMULÉE (In-Memory) ---

  const addCampaign = async (campaign: Campaign) => {
     setCampaigns(prev => [...prev, campaign]);
  };

  const deleteCampaign = async (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  // Note: On ne charge plus les données Firebase pour l'instant
  // pour éviter les conflits et rester en "mode test".

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        loginAsProfile, 
        logout, 
        deleteUser, 
        toggleBanUser, 
        deleteCampaign, 
        addCampaign, 
        mockUsers: MOCK_USERS_INIT, 
        allUsers: users 
    }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/explore" element={<ExplorePage campaigns={campaigns} users={users} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<ProtectedRoute>{user?.role === UserRole.ADMIN ? <AdminDashboard campaigns={campaigns} /> : <CreatorDashboard campaigns={campaigns} />}</ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute allowedRoles={[UserRole.CREATOR, UserRole.ADMIN]}><CreateCampaign onAdd={addCampaign} /></ProtectedRoute>} />
          <Route path="/campaign/:id" element={<ParticipantView campaigns={campaigns} users={users} />} />
          
          {/* NOUVELLE ROUTE ANALYTICS */}
          <Route path="/analytics/:id" element={<AnalyticsWrapper campaigns={campaigns} user={user} />} />
          
          <Route path="/u/:creatorId" element={<PublicCreatorProfile users={users} campaigns={campaigns} />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><AdminDashboard campaigns={campaigns} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
