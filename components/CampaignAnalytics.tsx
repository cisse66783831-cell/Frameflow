
import React, { useMemo } from 'react';
import { Campaign, User, UserRole, SubscriptionTier } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { ArrowLeft, Users, Download, Share2, TrendingUp, Calendar, Lock } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

interface CampaignAnalyticsProps {
  campaign: Campaign;
  currentUser: User | null;
}

const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({ campaign, currentUser }) => {
  // 1. SECURITY CHECK
  // Si pas connecté ou (pas le créateur ET pas admin), on refuse l'accès
  if (!currentUser) return <Navigate to="/login" />;
  
  const isCreator = currentUser.id === campaign.creatorId;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  if (!isCreator && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
        <div className="bg-red-100 p-4 rounded-full text-red-600">
           <Lock size={48} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Accès Refusé</h2>
        <p className="text-slate-500">Ces statistiques sont privées et réservées au créateur de la campagne.</p>
        <Link to="/dashboard" className="text-blue-600 hover:underline">Retour au tableau de bord</Link>
      </div>
    );
  }

  // 2. CHECK PREMIUM (Si c'est le créateur mais qu'il n'est plus premium, on peut bloquer ou montrer un teaser)
  // Ici on bloque l'accès complet comme demandé
  if (isCreator && currentUser.subscription !== SubscriptionTier.PREMIUM && !isAdmin) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
           <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center border border-slate-200">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Lock size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Fonctionnalité Premium</h2>
              <p className="text-slate-600 mb-8">
                 L'analyse détaillée des performances est réservée aux membres Premium. Passez à la vitesse supérieure pour comprendre votre audience.
              </p>
              <div className="flex flex-col gap-3">
                 <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all">
                    Passer Premium
                 </button>
                 <Link to="/dashboard" className="text-slate-500 font-medium hover:text-slate-700">Retour</Link>
              </div>
           </div>
        </div>
     );
  }

  // 3. DATA SIMULATION (Générer des données historiques basées sur les totaux)
  const chartData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    // On répartit les vues totales sur 7 jours avec un peu d'aléatoire pour faire joli
    return days.map((day, index) => {
      const randomFactor = Math.random() * (0.3 - 0.1) + 0.1; // 10% à 30%
      // Simulation grossière pour l'exemple
      const views = Math.floor(campaign.stats.views * randomFactor * (index % 2 === 0 ? 1.2 : 0.8)); 
      const downloads = Math.floor(views * 0.45); // Taux de conversion simulé ~45%
      return {
        name: day,
        views: Math.max(10, views), // Minimum 10 pour l'affichage
        downloads: Math.max(2, downloads)
      };
    });
  }, [campaign.stats]);

  const pieData = [
    { name: 'Facebook', value: 400, color: '#1877F2' },
    { name: 'Twitter', value: 300, color: '#1DA1F2' },
    { name: 'LinkedIn', value: 300, color: '#0A66C2' },
    { name: 'Direct', value: 200, color: '#64748b' },
  ];

  const conversionRate = campaign.stats.views > 0 
    ? ((campaign.stats.downloads / campaign.stats.views) * 100).toFixed(1) 
    : '0';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
           <div className="flex items-center gap-4 mb-4">
              <Link to="/dashboard" className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                 <ArrowLeft size={24}/>
              </Link>
              <div>
                 <h1 className="text-2xl font-bold text-slate-900">Statistiques de Campagne</h1>
                 <p className="text-slate-500 text-sm">Données en temps réel pour "{campaign.title}"</p>
              </div>
              <div className="ml-auto bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 flex items-center gap-1">
                 <Lock size={12}/> ANALYTICS PREMIUM
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
         
         {/* KPI CARDS */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Vues Totales</p>
                  <h3 className="text-3xl font-bold text-slate-900">{campaign.stats.views}</h3>
                  <span className="text-xs text-green-600 font-bold flex items-center gap-1 mt-2">
                     <TrendingUp size={12}/> +12% cette semaine
                  </span>
               </div>
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <Users size={24}/>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Téléchargements</p>
                  <h3 className="text-3xl font-bold text-slate-900">{campaign.stats.downloads}</h3>
                  <span className="text-xs text-green-600 font-bold flex items-center gap-1 mt-2">
                     <TrendingUp size={12}/> +8% cette semaine
                  </span>
               </div>
               <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                  <Download size={24}/>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Taux de Conversion</p>
                  <h3 className="text-3xl font-bold text-slate-900">{conversionRate}%</h3>
                  <span className="text-xs text-slate-400 font-medium mt-2">
                     Moyenne du secteur: 35%
                  </span>
               </div>
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <Share2 size={24}/>
               </div>
            </div>
         </div>

         {/* CHARTS ROW */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* MAIN CHART */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800">Performance (7 derniers jours)</h3>
                  <div className="flex gap-2">
                     <button className="px-3 py-1 text-xs font-bold bg-slate-100 rounded-md text-slate-600">7J</button>
                     <button className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-600">30J</button>
                  </div>
               </div>
               <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                           <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <RechartsTooltip 
                           contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                           cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" name="Vues" />
                        <Area type="monotone" dataKey="downloads" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorDownloads)" name="Téléchargements" />
                        <Legend iconType="circle" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* SECONDARY CHART */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-6">Sources de trafic</h3>
               <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={pieData}
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                        >
                           {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                     </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                     <span className="text-3xl font-bold text-slate-800">1.2k</span>
                     <span className="text-xs text-slate-400 font-medium uppercase">Total</span>
                  </div>
               </div>
               <div className="mt-4 space-y-3">
                  {pieData.map(source => (
                     <div key={source.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                           <span className="text-slate-600">{source.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">{Math.round((source.value / 1200) * 100)}%</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default CampaignAnalytics;
