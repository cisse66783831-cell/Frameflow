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
  Database
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { generateCampaignDetails } from './services/geminiService';
import PhotoEditor from './components/PhotoEditor';
import TextTemplateBuilder from './components/TextTemplateBuilder';
import { Campaign, SubscriptionTier, UserRole, User, CampaignCategory, CampaignType, TextFieldConfig } from './types';
import { auth, db, storage, isConfigured as isFirebaseReady } from './services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
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
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// --- MOCK DATA (Fallback) ---
const MOCK_USERS_INIT: User[] = [
  {
    id: 'u_admin',
    name: 'Sarah Connor',
    email: 'admin@frameflow.com',
    role: UserRole.ADMIN,
    subscription: SubscriptionTier.PREMIUM,
    avatar: 'https://i.pravatar.cc/150?u=admin',
    bio: 'Administrateur système',
    isBanned: false
  },
  {
    id: 'u_creator_free',
    name: 'ONG Terre Verte',
    email: 'contact@greenearth.org',
    role: UserRole.CREATOR,
    subscription: SubscriptionTier.FREE,
    avatar: 'https://i.pravatar.cc/150?u=green',
    bio: 'Nous luttons pour un avenir durable et écologique.',
    isBanned: false
  }
];

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'c_123',
    creatorId: 'u_creator_free',
    type: CampaignType.PHOTO_FRAME,
    title: 'Exemple Local (Mode Démo)',
    description: 'Ceci est une donnée fictive car Firebase n\'est pas configuré.',
    category: CampaignCategory.POLITICS,
    frameUrl: 'https://placehold.co/1080x1080/22c55e/FFF/png?text=Mode+Demo',
    hashtags: ['#Demo', '#FrameFlow'],
    createdAt: '2023-10-15',
    stats: { views: 120, downloads: 45, shares: 12 },
    creatorTier: SubscriptionTier.FREE,
    isPrivate: false
  }
];

// --- AUTH CONTEXT ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  deleteUser: (id: string) => void;
  toggleBanUser: (id: string) => void;
  deleteCampaign: (id: string) => void;
  mockUsers: User[];
  allUsers: User[];
}

const AuthContext = createContext<AuthContextType>(null!);

// --- COMPONENTS ---

// 1. Navigation
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

            {/* Connection Status Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
               {isFirebaseReady ? (
                 <>
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-[10px] font-bold text-slate-500">CLOUD CONNECTÉ</span>
                 </>
               ) : (
                 <>
                   <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                   <span className="text-[10px] font-bold text-slate-500">MODE LOCAL</span>
                 </>
               )}
            </div>

            {/* Public Links */}
            <div className="hidden md:flex items-center space-x-6">
               <Link to="/explore" className="text-slate-600 hover:text-blue-600 font-medium text-sm flex items-center gap-1">
                 <Search size={16} /> Explorer
               </Link>
            </div>
          </div>
          
          {user ? (
            // LOGGED IN NAV
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
                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt="" className="w-full h-full object-cover"/>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Déconnexion">
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          ) : (
            // PUBLIC NAV
            <div className="hidden sm:flex sm:items-center sm:space-x-6">
              <Link to="/login" className="text-slate-700 hover:text-blue-600 font-medium text-sm">Connexion</Link>
              <Link to="/signup" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                Commencer
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
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 animate-fade-in">
          <Link to="/explore" className="block px-4 py-3 text-slate-800 font-medium border-b border-slate-50" onClick={() => setIsOpen(false)}>
             🔍 Explorer les cadres
          </Link>
          {user ? (
            <div className="pt-2 pb-3 space-y-1 px-4">
              <div className="py-2 border-b border-slate-100 mb-2 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt="" className="w-full h-full object-cover"/>
                 </div>
                 <div>
                    <div className="font-bold flex items-center gap-1">
                      {user.name} 
                      {user.subscription === SubscriptionTier.PREMIUM && <Crown size={14} className="text-yellow-500 fill-yellow-500" />}
                    </div>
                    <div className="text-xs text-slate-500">{user.role} - {user.subscription}</div>
                 </div>
              </div>
              <Link to="/dashboard" className="block text-slate-600 py-2 font-medium" onClick={() => setIsOpen(false)}>Tableau de bord</Link>
              <Link to="/create" className="block text-blue-600 py-2 font-medium" onClick={() => setIsOpen(false)}>+ Créer une campagne</Link>
              <button onClick={handleLogout} className="w-full text-left text-red-600 py-2 font-medium mt-2">Déconnexion</button>
            </div>
          ) : (
             <div className="pt-2 pb-3 space-y-1 px-4">
                <Link to="/login" className="block py-2 text-slate-800 font-bold" onClick={() => setIsOpen(false)}>Connexion</Link>
                <Link to="/signup" className="block py-2 text-blue-600 font-bold" onClick={() => setIsOpen(false)}>Créer un compte</Link>
             </div>
          )}
        </div>
      )}
    </nav>
  );
};

// ... [Keep CampaignCard, ExplorePage, PublicCreatorProfile, LandingPage components same as before] ...
// Component: CampaignCard
const CampaignCard: React.FC<{ campaign: Campaign, creator?: User }> = ({ campaign, creator }) => {
  return (
    <Link to={`/campaign/${campaign.id}`} className="block group h-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all h-full flex flex-col relative">
        {/* Private Badge */}
        {campaign.isPrivate && (
           <div className="absolute top-2 left-2 z-20 bg-slate-900/80 backdrop-blur text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
             <EyeOff size={10} /> PRIVÉ
           </div>
        )}

        <div className="relative aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
          {/* Background blurred pattern */}
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

// 2. Explore Page
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
      
      {/* Search Hero */}
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

      {/* Category Pills */}
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

        {/* Results Grid */}
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

// 3. Public Creator Profile
const PublicCreatorProfile = ({ users, campaigns }: { users: User[], campaigns: Campaign[] }) => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const creator = users.find(u => u.id === creatorId);
  // Show public campaigns OR private ones if I am the creator (simplified logic here: show public only for visitors)
  const creatorCampaigns = campaigns.filter(c => c.creatorId === creatorId && !c.isPrivate);

  if (!creator) return <div className="text-center py-20">Utilisateur introuvable</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      {/* Profile Header */}
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

      {/* Campaigns Grid */}
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
               <Link to="/create" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <Plus size={20}/> Créer
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
};

const LoginPage = () => {
  const { login, mockUsers, allUsers } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isFirebaseReady) {
      // FIREBASE LOGIN
      try {
        const success = await login(email, password);
        if (success) navigate('/dashboard');
        else setError("Email ou mot de passe incorrect.");
      } catch (err) {
        setError("Erreur de connexion. Vérifiez vos identifiants.");
      }
    } else {
      // MOCK LOGIN
      const foundUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (foundUser) {
        if (foundUser.isBanned) {
          setError("Ce compte a été suspendu par l'administrateur.");
        } else {
          // Fake password check
          if (password === 'password' || password.length > 3) {
             login(email, password); // This mock fn signature needs adaptation or simple use logic
             navigate('/dashboard');
          } else {
             setError("Mot de passe incorrect (Mode démo : essayez 'password')");
          }
        }
      } else {
        setError("Compte introuvable en mode Démo.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-white">
       {/* Left Column: Visuals */}
       <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-900 opacity-90"></div>
          <div className="relative z-10 max-w-lg px-10 text-white text-center">
             <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold">F</span>
             </div>
             <h2 className="text-4xl font-bold mb-4">Bienvenue sur FrameFlow</h2>
             <p className="text-blue-100 text-lg leading-relaxed">
                La plateforme n°1 pour créer des campagnes virales et des documents dynamiques en quelques clics.
             </p>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
       </div>

       {/* Right Column: Login Form */}
       <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
          <div className="w-full max-w-md space-y-8">
             <div className="text-center lg:text-left">
                <Link to="/" className="inline-block lg:hidden mb-8 text-blue-600 font-bold text-xl">FrameFlow</Link>
                <h2 className="text-3xl font-bold text-slate-900">Bon retour !</h2>
                <p className="mt-2 text-slate-600">Connectez-vous pour gérer vos campagnes.</p>
                {!isFirebaseReady && <div className="mt-2 text-xs font-bold text-orange-500">MODE DÉMO LOCAL ACTIVÉ</div>}
             </div>

             {error && (
               <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
                 <AlertTriangle className="text-red-500 mt-0.5" size={18} />
                 <p className="text-sm text-red-700">{error}</p>
               </div>
             )}

             <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Adresse email</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <Mail size={18} className="text-slate-400"/>
                      </div>
                      <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                        placeholder="vous@exemple.com"
                      />
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
                      <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">Oublié ?</a>
                   </div>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <Key size={18} className="text-slate-400"/>
                      </div>
                      <input 
                        type="password" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                        placeholder="••••••••"
                      />
                   </div>
                </div>

                <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70">
                   {loading ? <Loader2 className="animate-spin" /> : 'Se connecter'}
                </button>
             </form>

             {!isFirebaseReady && (
               <>
                 <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                       <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                       <span className="px-2 bg-slate-50 text-slate-500">Comptes de démonstration</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-3">
                    {mockUsers.map(u => (
                       <button 
                         key={u.id} 
                         onClick={() => { setEmail(u.email); setPassword('password'); }} 
                         className={`flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-left group ${u.isBanned ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                         disabled={u.isBanned}
                       >
                          <div className="relative">
                            <img src={u.avatar} className="w-10 h-10 rounded-full bg-slate-100" alt={u.name} />
                            {u.role === UserRole.ADMIN && <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[8px] px-1 rounded font-bold">ADM</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                               {u.name}
                               {u.subscription === SubscriptionTier.PREMIUM && <Crown size={12} className="text-yellow-500 fill-yellow-500"/>}
                             </div>
                             <div className="text-xs text-slate-500 truncate">{u.email}</div>
                          </div>
                          <div className="text-slate-300 group-hover:text-blue-500">
                             <ArrowRight size={16} />
                          </div>
                       </button>
                    ))}
                 </div>
               </>
             )}

             <div className="text-center mt-6">
                <p className="text-sm text-slate-600">
                   Pas encore de compte ? {' '}
                   <Link to="/signup" className="font-bold text-blue-600 hover:text-blue-500">S'inscrire gratuitement</Link>
                </p>
             </div>
          </div>
       </div>
    </div>
  );
};

const SignupPage = () => {
   const { signup } = useContext(AuthContext);
   const navigate = useNavigate();
   const [name, setName] = useState('');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');

   const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
         const success = await signup(name, email, password);
         if (success) navigate('/dashboard');
         else setError("Erreur lors de l'inscription.");
      } catch (e) {
         setError("Erreur : " + (e as any).message);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
         <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-center">Créer un compte Créateur</h2>
            {error && <div className="mb-4 text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
            
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700">Nom complet (ou Organisation)</label>
                 <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded mt-1"/>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700">Email</label>
                 <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded mt-1"/>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
                 <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-2 rounded mt-1"/>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : 'S\'inscrire'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-blue-600">Déjà un compte ? Se connecter</Link>
            </div>
         </div>
      </div>
   );
};

// ... [Keep AdminDashboard, CreatorDashboard as is - they just consume data] ...
// ADMIN DASHBOARD - FIXED
const AdminDashboard = ({ campaigns }: { campaigns: Campaign[] }) => {
   const { allUsers, deleteUser, toggleBanUser, deleteCampaign } = useContext(AuthContext);
   const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'campaigns'>('overview');

   // Stats Calculation
   const totalUsers = allUsers.length;
   const totalCampaigns = campaigns.length;
   const totalDownloads = campaigns.reduce((acc, curr) => acc + curr.stats.downloads, 0);

   return (
      <div className="min-h-screen bg-slate-50 pb-20">
         {/* Admin Header */}
         <div className="bg-slate-900 text-white pt-8 pb-16 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
               <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                     <Shield className="text-red-500" /> Panneau Administration
                  </h1>
               </div>
               
               {/* Admin Stats Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                     <div className="text-slate-400 text-sm font-medium uppercase mb-2">Utilisateurs Totaux</div>
                     <div className="text-3xl font-bold">{totalUsers}</div>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                     <div className="text-slate-400 text-sm font-medium uppercase mb-2">Campagnes Actives</div>
                     <div className="text-3xl font-bold">{totalCampaigns}</div>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                     <div className="text-slate-400 text-sm font-medium uppercase mb-2">Téléchargements</div>
                     <div className="text-3xl font-bold text-blue-400">{totalDownloads}</div>
                  </div>
               </div>
            </div>
         </div>

         {/* Admin Tabs & Content */}
         <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-8">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-h-[500px]">
               {/* Tabs Navigation */}
               <div className="flex border-b border-slate-200">
                  <button 
                     onClick={() => setActiveTab('overview')}
                     className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                     Vue d'ensemble
                  </button>
                  <button 
                     onClick={() => setActiveTab('users')}
                     className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                     Utilisateurs
                  </button>
                  <button 
                     onClick={() => setActiveTab('campaigns')}
                     className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'campaigns' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                     Toutes les Campagnes
                  </button>
               </div>

               <div className="p-6">
                  {/* TAB: OVERVIEW */}
                  {activeTab === 'overview' && (
                     <div className="space-y-6">
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 flex items-start gap-4">
                           <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Settings size={24}/></div>
                           <div>
                              <h3 className="font-bold text-blue-900 mb-1">État du Système</h3>
                              <p className="text-blue-800 text-sm">Tous les systèmes sont opérationnels. API Gemini connecté.</p>
                           </div>
                        </div>
                        <div className="h-64 flex items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-400">
                           Graphique d'activité globale (Placeholder)
                        </div>
                     </div>
                  )}

                  {/* TAB: USERS */}
                  {activeTab === 'users' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                                 <th className="p-4">Utilisateur</th>
                                 <th className="p-4">Rôle</th>
                                 <th className="p-4">Statut</th>
                                 <th className="p-4 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {allUsers.map(u => (
                                 <tr key={u.id} className="hover:bg-slate-50 group">
                                    <td className="p-4 flex items-center gap-3">
                                       <img src={u.avatar} className="w-10 h-10 rounded-full bg-slate-200" alt=""/>
                                       <div>
                                          <div className="font-bold text-slate-800">{u.name}</div>
                                          <div className="text-xs text-slate-500">{u.email}</div>
                                       </div>
                                    </td>
                                    <td className="p-4">
                                       <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {u.role}
                                       </span>
                                    </td>
                                    <td className="p-4">
                                       {u.isBanned ? (
                                          <span className="flex items-center gap-1 text-red-600 font-bold text-xs"><Ban size={12}/> BANNI</span>
                                       ) : (
                                          <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><CheckCircle size={12}/> ACTIF</span>
                                       )}
                                    </td>
                                    <td className="p-4 text-right">
                                       <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                          <button 
                                             onClick={() => toggleBanUser(u.id)}
                                             className={`p-2 rounded hover:bg-slate-200 transition-colors ${u.isBanned ? 'text-green-600' : 'text-orange-500'}`}
                                             title={u.isBanned ? "Débannir" : "Bannir"}
                                          >
                                             {u.isBanned ? <Unlock size={18}/> : <Ban size={18}/>}
                                          </button>
                                          <button 
                                             onClick={() => { if(window.confirm('Supprimer définitivement ?')) deleteUser(u.id); }}
                                             className="p-2 rounded hover:bg-red-50 text-red-500 transition-colors"
                                             title="Supprimer"
                                          >
                                             <Trash2 size={18}/>
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}

                  {/* TAB: CAMPAIGNS */}
                  {activeTab === 'campaigns' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                                 <th className="p-4">Campagne</th>
                                 <th className="p-4">Type</th>
                                 <th className="p-4">Visibilité</th>
                                 <th className="p-4">Stats</th>
                                 <th className="p-4 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {campaigns.map(c => (
                                 <tr key={c.id} className="hover:bg-slate-50 group">
                                    <td className="p-4 flex items-center gap-3">
                                       <img src={c.frameUrl} className="w-12 h-12 rounded bg-slate-100 object-contain" alt=""/>
                                       <div>
                                          <Link to={`/campaign/${c.id}`} className="font-bold text-blue-600 hover:underline">{c.title}</Link>
                                          <div className="text-xs text-slate-500">{c.category}</div>
                                       </div>
                                    </td>
                                    <td className="p-4">
                                       <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                                          {c.type}
                                       </span>
                                    </td>
                                    <td className="p-4">
                                       {c.isPrivate ? (
                                          <span className="flex items-center gap-1 text-slate-500 text-xs"><EyeOff size={12}/> Privé</span>
                                       ) : (
                                          <span className="flex items-center gap-1 text-green-600 text-xs"><Globe size={12}/> Public</span>
                                       )}
                                    </td>
                                    <td className="p-4 text-xs font-mono">
                                       ⬇️ {c.stats.downloads}
                                    </td>
                                    <td className="p-4 text-right">
                                       <button 
                                          onClick={() => { if(window.confirm('Supprimer cette campagne ?')) deleteCampaign(c.id); }}
                                          className="p-2 rounded hover:bg-red-50 text-red-500 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                          title="Supprimer la campagne"
                                       >
                                          <Trash2 size={18}/>
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

// 7. Creator Dashboard
const CreatorDashboard = ({ campaigns }: { campaigns: Campaign[] }) => {
  const { user } = useContext(AuthContext);
  const myCampaigns = campaigns.filter(c => c.creatorId === user?.id);
  const isPremium = user?.subscription === SubscriptionTier.PREMIUM;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-xl font-bold text-slate-800">Mes Campagnes</h2>
        <Link to="/create" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm">
          <Plus size={18} /> Créer
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCampaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group relative">
              {campaign.isPrivate && (
                 <div className="absolute top-2 left-2 z-20 bg-slate-900/80 backdrop-blur text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                   <EyeOff size={10} /> PRIVÉ
                 </div>
              )}
              <div className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                <div 
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-50 blur-sm"
                  style={{ backgroundImage: `url(${campaign.frameUrl})` }}
                />
                <img src={campaign.frameUrl} alt={campaign.title} className="h-40 w-40 object-contain z-10 drop-shadow-md group-hover:scale-105 transition-transform" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                 <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-slate-800 truncate">{campaign.title}</h3>
                    <div className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase h-fit">
                       {campaign.type === CampaignType.DOCUMENT ? 'DOC' : 'PHOTO'}
                    </div>
                 </div>
                 <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-500 flex items-center gap-1"><Users size={14}/> {campaign.stats.downloads}</span>
                    <Link to={`/campaign/${campaign.id}`} className="text-blue-600 text-sm font-bold hover:underline">Gérer</Link>
                 </div>
              </div>
            </div>
          ))}
          
          {myCampaigns.length === 0 && (
             <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <p className="text-slate-500 mb-4">Vous n'avez pas encore de campagne.</p>
                <Link to="/create" className="text-blue-600 font-bold hover:underline">Commencer maintenant</Link>
             </div>
          )}
      </div>
    </div>
  );
};

// 8. Create Campaign Form (Updated for Firebase Storage)
const CreateCampaign = ({ onAdd }: { onAdd: (c: Campaign) => void }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // Step 1: Type Selection
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<CampaignType>(CampaignType.PHOTO_FRAME);

  // Step 2: Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CampaignCategory>(CampaignCategory.OTHER);
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [textConfig, setTextConfig] = useState<TextFieldConfig[]>([]);

  // States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAiGeneration = async () => {
    if (!title) {
       alert("Veuillez d'abord entrer un titre pour la campagne.");
       return;
    }
    setIsGenerating(true);
    try {
       const result = await generateCampaignDetails(title, category);
       setDescription(result.description);
       setHashtagsInput(result.hashtags.join(' '));
    } catch (e) {
       console.error(e);
       alert("Erreur lors de la génération IA.");
    } finally {
       setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    // Parse hashtags
    const hashtagsArray = hashtagsInput.split(' ').filter(tag => tag.startsWith('#'));

    try {
      let frameUrl = 'https://placehold.co/1080x1080/png'; // Default

      // 1. Upload Image to Firebase Storage if connected
      if (frameFile && isFirebaseReady && storage) {
        const storageRef = ref(storage, `campaigns/${Date.now()}_${frameFile.name}`);
        const snapshot = await uploadBytes(storageRef, frameFile);
        frameUrl = await getDownloadURL(snapshot.ref);
      } else if (frameFile) {
        // Fallback for Local Mode
        frameUrl = URL.createObjectURL(frameFile);
      }

      const newCampaign: Campaign = {
         id: `c_${Date.now()}`, // Temporary ID, will be replaced by Firestore ID
         creatorId: user.id,
         type: type,
         title,
         description,
         category,
         frameUrl,
         hashtags: hashtagsArray,
         createdAt: new Date().toISOString(),
         stats: { views: 0, downloads: 0, shares: 0 },
         creatorTier: user.subscription,
         isPrivate,
         textFieldsConfig: type === CampaignType.DOCUMENT ? textConfig : undefined
      };

      // 2. Save to Firestore
      if (isFirebaseReady && db) {
         // Remove ID to let Firestore generate it
         const { id, ...data } = newCampaign;
         await addDoc(collection(db, 'campaigns'), data);
      } else {
         // Local Mock
         onAdd(newCampaign);
      }

      navigate('/dashboard');
    } catch (error) {
      console.error("Error creating campaign", error);
      alert("Erreur lors de la création.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
         <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">Que voulez-vous créer ?</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div 
               onClick={() => { setType(CampaignType.PHOTO_FRAME); setStep(2); }}
               className="bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all group text-center"
            >
               <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <ImageIcon size={40} className="text-blue-600" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Campagne Cadre Photo</h3>
               <p className="text-slate-500">
                  Les utilisateurs ajoutent leur photo derrière votre cadre. Idéal pour la viralité et le soutien.
               </p>
            </div>

            <div 
               onClick={() => { setType(CampaignType.DOCUMENT); setStep(2); }}
               className="bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:shadow-xl cursor-pointer transition-all group text-center"
            >
               <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <FileText size={40} className="text-purple-600" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Document Dynamique</h3>
               <p className="text-slate-500">
                  Les utilisateurs remplissent un formulaire pour générer un document (Certificat, Carte, Badge).
               </p>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
           <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600">← Retour</button>
           <h2 className="text-2xl font-bold text-slate-900">
              {type === CampaignType.PHOTO_FRAME ? 'Nouveau Cadre Photo' : 'Nouveau Document'}
           </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre de la campagne</label>
                <input 
                   type="text" 
                   value={title} 
                   onChange={e => setTitle(e.target.value)} 
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                   placeholder="Ex: Soutien aux Étalons 2024"
                   required 
                />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                   <select value={category} onChange={e => setCategory(e.target.value as CampaignCategory)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {Object.values(CampaignCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Visibilité</label>
                   <div className="flex gap-2">
                      <button type="button" onClick={() => setIsPrivate(false)} className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${!isPrivate ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-300 text-slate-600'}`}>
                         <Globe size={16}/> Public
                      </button>
                      <button type="button" onClick={() => setIsPrivate(true)} className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${isPrivate ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-300 text-slate-600'}`}>
                         <EyeOff size={16}/> Privé
                      </button>
                   </div>
                </div>
             </div>

             {/* AI Generation Button */}
             <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={handleAiGeneration}
                  disabled={isGenerating || !title}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                     !title ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                     isGenerating ? 'bg-purple-100 text-purple-700' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-md'
                  }`}
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {isGenerating ? 'IA génère...' : 'Générer description & hashtags'}
                </button>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
               <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows={3} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Décrivez votre campagne pour encourager les gens à participer..."
                  required 
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Hashtags (séparés par des espaces)</label>
               <input 
                  type="text"
                  value={hashtagsInput}
                  onChange={e => setHashtagsInput(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 font-medium"
                  placeholder="#VotreEvent #2024"
               />
             </div>
          </div>

          <hr className="border-slate-100"/>

          {/* Section 2: Visual Builder */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Image de fond (Template)</label>
            {!frameFile ? (
               <div className="mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-slate-300 border-dashed rounded-xl hover:bg-slate-50 cursor-pointer relative bg-slate-50">
                  <input type="file" accept="image/png, image/jpeg" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setFrameFile(e.target.files?.[0] || null)} required />
                  <div className="text-center">
                     <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3">
                        <Layout className="h-6 w-6 text-slate-400" />
                     </div>
                     <p className="mt-1 text-sm font-medium text-slate-900">Cliquez pour téléverser votre design</p>
                     <p className="text-xs text-slate-500 mt-1">PNG ou JPG recommandé (1080x1080px)</p>
                  </div>
               </div>
            ) : (
               <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                     <span className="text-sm font-medium truncate">{frameFile.name}</span>
                     <button type="button" onClick={() => setFrameFile(null)} className="text-red-500 hover:text-red-700 text-sm font-bold">Changer</button>
                  </div>
                  
                  {type === CampaignType.DOCUMENT ? (
                     <TextTemplateBuilder 
                        frameUrl={URL.createObjectURL(frameFile)} 
                        onConfigChange={setTextConfig} 
                     />
                  ) : (
                     <div className="flex justify-center bg-slate-100 p-4 rounded-xl">
                        <img src={URL.createObjectURL(frameFile)} className="h-64 object-contain rounded shadow-sm" alt="Preview"/>
                     </div>
                  )}
               </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-md text-lg disabled:opacity-50 flex items-center justify-center gap-2">
             {isSubmitting && <Loader2 className="animate-spin" />}
             {isSubmitting ? 'Envoi en cours...' : 'Lancer la Campagne'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ... [ParticipantView remains mostly same, need to pass increment logic] ...
const ParticipantView = ({ campaigns, users }: { campaigns: Campaign[], users: User[] }) => {
  const { id } = useParams<{ id: string }>();
  const [downloaded, setDownloaded] = useState(false);
  
  const campaign = campaigns.find(c => c.id === id);

  // Stats increment
  const handleDownloadComplete = async () => {
    setDownloaded(true);
    if (isFirebaseReady && db && id) {
       // Increment download count in Firestore
       try {
         const campRef = doc(db, "campaigns", id);
         await updateDoc(campRef, {
            "stats.downloads": increment(1)
         });
       } catch (e) {
          console.error("Failed to update stats", e);
       }
    }
  };

  if (!campaign) return <div className="text-center py-20 font-bold text-slate-400">Campagne introuvable ou supprimée.</div>;

  const creator = users.find(u => u.id === campaign.creatorId);
  const relatedCampaigns = campaigns.filter(c => 
     c.id !== campaign.id && 
     !c.isPrivate &&
     (c.category === campaign.category || c.creatorId === campaign.creatorId)
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
       <Navbar />
       {campaign.isPrivate && (
          <div className="bg-slate-900 text-white text-center py-2 text-sm font-medium">
             <Lock size={12} className="inline mr-1"/> Cette campagne est privée et accessible uniquement via ce lien.
          </div>
       )}
       
       <div className="max-w-5xl mx-auto px-4 pt-8">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Editor */}
            <div className="lg:col-span-2">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1">
                  <PhotoEditor campaign={campaign} onDownloadComplete={handleDownloadComplete} />
               </div>
               {downloaded && (
                 <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center animate-fade-in-up">
                    <h3 className="text-green-800 font-bold mb-2 text-xl">Téléchargement prêt ! 🚀</h3>
                    <p className="text-green-700 text-sm mb-4">Votre création a été générée avec succès.</p>
                 </div>
               )}
            </div>

            {/* Right: Details & Metadata */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{campaign.title}</h1>
                  <Link to={`/u/${creator?.id}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 mb-4 group">
                     <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                        <img src={creator?.avatar} className="w-full h-full object-cover" alt=""/>
                     </div>
                     <div>
                        <div className="text-sm font-bold text-slate-900">{creator?.name || 'Anonyme'}</div>
                        <div className="text-xs text-slate-500">Organisateur</div>
                     </div>
                  </Link>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">{campaign.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500 pt-4 border-t border-slate-100">
                     <span className="flex items-center gap-1"><Users size={14}/> {campaign.stats.downloads} utilisations</span>
                     <span className="flex items-center gap-1"><Tag size={14}/> {campaign.category}</span>
                  </div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;
  
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS_INIT);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);

  // 1. Listen for Auth Changes
  useEffect(() => {
    if (isFirebaseReady && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
           // Fetch full user profile from Firestore
           const userRef = doc(db, "users", firebaseUser.uid);
           const userSnap = await getDoc(userRef);
           if (userSnap.exists()) {
              setUser(userSnap.data() as User);
           } else {
              // Fallback if profile doesn't exist yet (should be created on signup)
              setUser({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email || '',
                role: UserRole.CREATOR,
                subscription: SubscriptionTier.FREE,
                avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=User`
              });
           }
        } else {
           setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Listen for Campaigns (Real-time)
  useEffect(() => {
    if (isFirebaseReady && db) {
      const q = query(collection(db, "campaigns"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedCampaigns = snapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data()
        } as Campaign));
        setCampaigns(loadedCampaigns);
      });
      return () => unsubscribe();
    }
  }, []);

  // 3. Listen for All Users (For Admin View)
  useEffect(() => {
    if (isFirebaseReady && db && user?.role === UserRole.ADMIN) {
      const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
         const loadedUsers = snapshot.docs.map(doc => doc.data() as User);
         setUsers(loadedUsers);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Actions
  const login = async (email: string, pass: string): Promise<boolean> => {
     if (isFirebaseReady && auth) {
       try {
         await signInWithEmailAndPassword(auth, email, pass);
         return true;
       } catch (e) {
         console.error(e);
         return false;
       }
     } else {
       // Mock Login
       const found = users.find(u => u.email === email);
       if (found && !found.isBanned) {
         setUser(found);
         return true;
       }
       return false;
     }
  };

  const signup = async (name: string, email: string, pass: string): Promise<boolean> => {
     if (isFirebaseReady && auth) {
        try {
           const res = await createUserWithEmailAndPassword(auth, email, pass);
           await updateProfile(res.user, { displayName: name });
           
           // Create User Document in Firestore
           const newUser: User = {
             id: res.user.uid,
             name,
             email,
             role: UserRole.CREATOR,
             subscription: SubscriptionTier.FREE,
             avatar: `https://ui-avatars.com/api/?name=${name}`,
             isBanned: false
           };
           await setDoc(doc(db, "users", res.user.uid), newUser);
           return true;
        } catch (e) {
           console.error(e);
           throw e;
        }
     } else {
        // Mock Signup
        const newUser: User = {
          id: `u_${Date.now()}`,
          name,
          email,
          role: UserRole.CREATOR,
          subscription: SubscriptionTier.FREE,
          avatar: `https://ui-avatars.com/api/?name=${name}`,
          isBanned: false
        };
        setUsers([...users, newUser]);
        setUser(newUser);
        return true;
     }
  };

  const logout = () => {
    if (isFirebaseReady && auth) signOut(auth);
    else setUser(null);
  };

  const deleteUser = async (id: string) => {
    if (isFirebaseReady && db) {
       await deleteDoc(doc(db, "users", id));
    } else {
       setUsers(users.filter(u => u.id !== id));
       if (user?.id === id) setUser(null);
    }
  };

  const toggleBanUser = async (id: string) => {
    if (isFirebaseReady && db) {
       const u = users.find(x => x.id === id);
       if (u) {
          await updateDoc(doc(db, "users", id), { isBanned: !u.isBanned });
       }
    } else {
       setUsers(prev => prev.map(u => u.id === id ? { ...u, isBanned: !u.isBanned } : u));
    }
  };

  const deleteCampaign = async (id: string) => {
    if (isFirebaseReady && db) {
       await deleteDoc(doc(db, "campaigns", id));
    } else {
       setCampaigns(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, deleteUser, toggleBanUser, deleteCampaign, mockUsers: MOCK_USERS_INIT, allUsers: users }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/explore" element={<ExplorePage campaigns={campaigns} users={users} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {user?.role === UserRole.ADMIN ? (
                 <AdminDashboard campaigns={campaigns} />
              ) : (
                 <CreatorDashboard campaigns={campaigns} />
              )}
            </ProtectedRoute>
          } />
          
          <Route path="/create" element={
            <ProtectedRoute allowedRoles={[UserRole.CREATOR, UserRole.ADMIN]}>
               <CreateCampaign onAdd={() => {}} />
            </ProtectedRoute>
          } />
          
          <Route path="/campaign/:id" element={<ParticipantView campaigns={campaigns} users={users} />} />
          <Route path="/u/:creatorId" element={<PublicCreatorProfile users={users} campaigns={campaigns} />} />
          <Route path="/admin" element={
             <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminDashboard campaigns={campaigns} />
             </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;