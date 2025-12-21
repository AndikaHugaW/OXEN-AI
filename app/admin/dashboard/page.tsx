'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge-2';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/line-charts-6'; 
import { Loader2, ShieldCheck, Activity, Zap, DollarSign, TrendingUp, Calendar, Download, Search, Bell, CircleDollarSign, UserPlus, Menu, X } from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, Bar, Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// --- CONFIG ---
const chartConfig = {
  requests: { label: 'Requests', color: 'var(--color-teal-500)' },
  errors: { label: 'Errors', color: 'var(--color-violet-500)' },
  successRate: { label: 'Success Rate', color: 'var(--color-lime-500)' },
  latency: { label: 'Latency (ms)', color: 'var(--color-sky-500)' },
};

// Custom Tooltip for Main Chart
const CustomMainTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="rounded-lg border bg-zinc-900 border-zinc-800 p-3 shadow-xl min-w-[140px]">
        <div className="flex items-center gap-2 text-sm mb-1">
           <span className="text-zinc-400 text-xs uppercase font-medium">{new Date(entry.payload.date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
          <span className="text-zinc-200 font-semibold text-lg">
             {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
          <span className="text-zinc-500 text-xs ml-auto">
             {entry.name}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics?range=30d`);
      if (res.status === 403) { router.push('/'); return; }
      if (res.ok) { setData(await res.json()); } 
      else { setError('Failed to load data'); }
    } catch (e) { setError('Connection error'); } 
    finally { setLoading(false); }
  };

  // Process data for charts
  const mainChartData = data?.chartData?.map((day: any) => ({
      date: day.date,
      requests: day.requests,
      errors: day.errors,
      successRate: day.requests > 0 ? Math.round(((day.requests - day.errors) / day.requests) * 100) : 100,
      tokens: day.requests * 150 + Math.floor(Math.random() * 5000), // Mock tokens roughly based on requests if not present
      cost: (day.requests * 0.002).toFixed(2), // Mock cost
      latency: Math.floor(Math.random() * 400) + 50 
  })) || [];

  // Prepare data for Mini Area Charts (Sparklines)
  const sparklineRequests = mainChartData.map((d: any) => ({ value: d.requests }));
  const sparklineTokens = mainChartData.map((d: any) => ({ value: d.tokens }));
  const sparklineCost = mainChartData.map((d: any) => ({ value: Number(d.cost) * 1000 })); // Scale up for visuals
  const sparklineSuccess = mainChartData.map((d: any) => ({ value: d.successRate }));

  const kpiCards = [
    {
      title: 'Est. Cost',
      period: 'Last 30 days',
      value: `$${data?.summary?.estimatedCost || 0}`,
      timestamp: 'Real-time',
      data: sparklineCost.length ? sparklineCost : [{value:0}, {value:10}],
      color: '#10b981', // Emerald 500
      icon: CircleDollarSign,
      gradientId: 'costGradient',
    },
    {
      title: 'Total Requests',
      period: 'Last 30 days',
      value: data?.summary?.totalRequests?.toLocaleString() || '0',
      timestamp: 'Real-time',
      data: sparklineRequests.length ? sparklineRequests : [{value:0}, {value:10}],
      color: '#3b82f6', // Blue 500
      icon: Activity,
      gradientId: 'reqGradient',
    },
    {
      title: 'Token Usage',
      period: 'Last 30 days',
      value: `${((data?.summary?.totalTokens || 0) / 1000).toFixed(1)}k`,
      timestamp: 'Real-time',
      data: sparklineTokens.length ? sparklineTokens : [{value:0}, {value:10}],
      color: '#a855f7', // Violet 500
      icon: Zap,
      gradientId: 'tokenGradient',
    },
    {
      title: 'Success Rate',
      period: 'Average',
      value: `${data?.summary?.successRate || 100}%`,
      timestamp: 'Real-time',
      data: sparklineSuccess.length ? sparklineSuccess : [{value:100}, {value:100}],
      color: '#f59e0b', // Amber 500
      icon: TrendingUp,
      gradientId: 'successGradient',
    },
  ];

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-indigo-500"><Loader2 className="animate-spin w-8 h-8"/></div>;
  if (error) return <div className="h-screen bg-black flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
        
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-50">
            <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-500" />
                <span className="font-bold">Oxen Admin</span>
            </div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                {isSidebarOpen ? <X /> : <Menu />}
            </button>
        </div>

        {/* Top Navigation Bar (Desktop) */}
        <header className="hidden lg:flex border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-40">
           <div className="w-full max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="flex items-center justify-center">
                    <img 
                      src="/logos/oxen.svg" 
                      alt="Oxen Logo" 
                      className="h-10 w-auto" 
                    />
                 </div>
                 <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-white font-bold text-lg tracking-tight">ADMIN</span>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="hidden md:flex items-center px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-400 w-64 focus-within:border-zinc-700 transition-colors">
                    <Search className="w-4 h-4 mr-2 text-zinc-600" />
                    <input className="bg-transparent outline-none w-full placeholder:text-zinc-600" placeholder="Search analytics..." />
                 </div>
                 <button className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                 </button>
                 <Avatar className="h-8 w-8 border border-zinc-800">
                    <AvatarImage src="/admin-avatar.png" />
                    <AvatarFallback className="bg-indigo-500/10 text-indigo-400">AD</AvatarFallback>
                 </Avatar>
              </div>
           </div>
        </header>

        <main className="w-full max-w-[1800px] mx-auto p-4 lg:p-8 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Overview</h1>
                  <p className="text-zinc-400 text-sm">System performance metrics and usage tracking.</p>
               </div>
               <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-300">
                     <Calendar className="w-4 h-4 mr-2 text-zinc-500" />
                     Last 30 Days
                  </div>
                  <button onClick={() => router.push('/')} className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-md transition-colors flex items-center gap-2">
                     <Download className="w-4 h-4" />
                     Export Report
                  </button>
               </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 border-b border-zinc-800 pb-1 overflow-x-auto scrollbar-hide mb-6">
                {[
                  { name: 'Overview', href: '/admin/dashboard' },
                  { name: 'Analytics', href: '/admin/dashboard/analytics' },
                  { name: 'Reports', href: '/admin/dashboard/reports' },
                  { name: 'Notifications', href: '/admin/dashboard/notifications' },
                ].map((tab) => {
                  const isActive = tab.href === '/admin/dashboard'; // Since this is the main page
                  
                  return (
                      <a key={tab.name} href={tab.href}>
                          <button className={cn(
                             "px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                             isActive ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                          )}>
                             {tab.name}
                          </button>
                      </a>
                  );
               })}
            </div>


            {/* KPI Cards Row (Area Charts) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {kpiCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                     <Card key={i} className="bg-zinc-950 border-zinc-800 shadow-sm overflow-hidden group hover:border-zinc-700 transition-all duration-300">
                        <CardContent className="p-0">
                           <div className="p-5 pb-0 space-y-4">
                              {/* Header */}
                              <div className="flex items-center gap-3">
                                 <div className="p-2 rounded-lg bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                                     <Icon className="size-5" style={{ color: card.color }} />
                                 </div>
                                 <span className="text-sm font-medium text-zinc-300">{card.title}</span>
                              </div>

                              <div className="flex items-end justify-between gap-4">
                                 <div className="space-y-1">
                                    <div className="text-xs text-zinc-500">{card.period}</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
                                 </div>
                                 
                                 {/* Mini Chart Container */}
                                 <div className="h-16 w-32 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                       <AreaChart data={card.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                          <defs>
                                             <linearGradient id={card.gradientId} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={card.color} stopOpacity={0.4} />
                                                <stop offset="100%" stopColor={card.color} stopOpacity={0.0} />
                                             </linearGradient>
                                          </defs>
                                          <Area
                                             type="monotone"
                                             dataKey="value"
                                             stroke={card.color}
                                             fill={`url(#${card.gradientId})`}
                                             strokeWidth={2}
                                             dot={false}
                                             activeDot={{ r: 4, fill: card.color, stroke: '#000' }}
                                          />
                                       </AreaChart>
                                    </ResponsiveContainer>
                                 </div>
                              </div>
                           </div>
                           {/* Decorative bottom line */}
                           <div className="h-1 w-full mt-4" style={{ backgroundColor: `${card.color}20` }}>
                              <div className="h-full w-1/3" style={{ backgroundColor: card.color }}></div>
                           </div>
                        </CardContent>
                     </Card>
                  );
               })}
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
               
               {/* Left: Main Chart (Overview) */}
               <div className="lg:col-span-5 flex flex-col gap-6">
                  <Card className="bg-zinc-950 border-zinc-800 shadow-sm flex flex-col h-full min-h-[450px]">
                     <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                        <div>
                           <h3 className="text-lg font-semibold text-white">Traffic Overview</h3>
                           <p className="text-sm text-zinc-400">Request volume over time</p>
                        </div>
                        <div className="flex gap-2">
                           <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <span className="w-2 h-2 rounded-full bg-teal-500"></span> Requests
                           </span>
                        </div>
                     </div>
                     <div className="flex-1 p-6 pl-0">
                        <ChartContainer config={chartConfig} className="w-full h-full min-h-[350px]">
                           <LineChart data={mainChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                              <defs>
                                  <linearGradient id="fillRequests" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="var(--color-teal-500)" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="var(--color-teal-500)" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <XAxis 
                                 dataKey="date" 
                                 stroke="#52525b" 
                                 fontSize={11} 
                                 tickLine={false} 
                                 axisLine={false}
                                 tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                              />
                              <YAxis 
                                 stroke="#52525b" 
                                 fontSize={11} 
                                 tickLine={false} 
                                 axisLine={false}
                              />
                              <Tooltip content={<CustomMainTooltip />} cursor={{fill: 'transparent', stroke: '#52525b', strokeDasharray: '3 3'}} />
                              
                              <Bar 
                                 dataKey="requests" 
                                 fill="var(--color-teal-500)" 
                                 radius={[4, 4, 0, 0]}
                                 maxBarSize={50}
                              />
                           </LineChart>
                        </ChartContainer>
                     </div>
                  </Card>
               </div>

               {/* Right: Query Distribution */}
               <div className="lg:col-span-2 flex flex-col gap-6">
                  <Card className="bg-zinc-950 border-zinc-800 shadow-sm flex flex-col h-full">
                     <div className="p-6 border-b border-zinc-800">
                        <h3 className="text-lg font-semibold text-white">Top Queries</h3>
                        <p className="text-sm text-zinc-400">By category type</p>
                     </div>
                     <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[500px]">
                        
                        {data?.typeDistribution && Object.keys(data.typeDistribution).length > 0 ? (
                           Object.entries(data.typeDistribution)
                              .filter(([type]: any) => !type.includes('ADMIN') && !type.includes('MODE')) // Filter out system/admin queries
                              .map(([type, count]: any, i) => {
                              // Feature Mapping Configuration
                              const featureMap: Record<string, { label: string, icon: any, color: string, bg: string }> = {
                                 'general': { label: 'General Chat', icon: Menu, color: 'text-zinc-400', bg: 'bg-zinc-800' },
                                 'market_analysis': { label: 'Market Intelligence', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                 'letter_generator': { label: 'Letter Generator', icon: Calendar, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                                 'report_generator': { label: 'Report Generator', icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                                 'visualization': { label: 'Data Visualization', icon: Zap, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                                 // Fallback
                                 'default': { label: type.replace(/_/g, ' ').trim(), icon: ShieldCheck, color: 'text-zinc-400', bg: 'bg-zinc-800' }
                              };

                              // Normalize type key
                              let key = 'default';
                              if (type.includes('market')) key = 'market_analysis';
                              else if (type.includes('letter')) key = 'letter_generator';
                              else if (type.includes('report') || type.includes('business')) key = 'report_generator';
                              else if (type.includes('visual') || type.includes('chart')) key = 'visualization';
                              else if (type.includes('general') || type === 'chat') key = 'general';
                              
                              const config = featureMap[key] || featureMap['default'];
                              const Icon = config.icon;
                              
                              // Calculate percentage relative to total requests
                              const percentage = Math.round((count / (data.summary.totalRequests || 1)) * 100);

                              return (
                                 <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                       <div className={`h-9 w-9 border border-zinc-800 rounded-lg flex items-center justify-center ${config.bg}`}>
                                          <Icon className={`w-4 h-4 ${config.color}`} />
                                       </div>
                                       <div className="space-y-0.5">
                                          <p className="text-sm font-medium leading-none text-white capitalize group-hover:text-indigo-400 transition-colors">
                                             {config.label}
                                          </p>
                                          <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
                                              <div className={`h-full rounded-full ${config.color.replace('text-', 'bg-')}`} style={{ width: `${Math.max(percentage, 5)}%` }}></div>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <div className="text-sm font-bold text-white">{count}</div>
                                       <div className="text-xs text-zinc-500">{percentage}%</div>
                                    </div>
                                 </div>
                              );
                           })
                        ) : (
                           <div className="text-zinc-500 text-sm py-4 text-center">No usage data available yet</div>
                        )}

                        <div className="mt-auto pt-6 border-t border-zinc-900">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Most Used Feature</span>
                                <Badge variant="primary" size="sm" className="bg-zinc-800 text-zinc-300 border-zinc-700">
                                   {data?.typeDistribution ? 
                                      (()=>{
                                         const sorted = Object.entries(data.typeDistribution).sort(([,a]:any, [,b]:any) => b - a);
                                         if(!sorted.length) return '-';
                                         const topType = sorted[0][0];
                                         if (topType.includes('market')) return 'Market Intel';
                                         if (topType.includes('letter')) return 'Letter Gen';
                                         if (topType.includes('visual')) return 'Data Viz';
                                         if (topType.includes('report')) return 'Report Gen';
                                         return 'General Chat';
                                      })() 
                                   : '-'}
                                </Badge>
                            </div>
                        </div>
                     </div>
                  </Card>
               </div>

            </div>
        </main>
    </div>
  );
}
