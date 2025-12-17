'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button-1';
import { ShieldCheck, Download, Search, Bell, BarChart2, PieChart, TrendingUp, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Shared Header Component (bisa dipisah jadi komponen reusable nanti)
const AdminHeader = () => (
    <header className="hidden lg:flex border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-40">
       <div className="w-full max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="flex items-center justify-center">
                <img src="/logos/oxen.svg" alt="Oxen Logo" className="h-10 w-auto" />
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
);

const AdminTabs = () => {
    const pathname = usePathname();
    const tabs = [
        { name: 'Overview', href: '/admin/dashboard' },
        { name: 'Analytics', href: '/admin/dashboard/analytics' },
        { name: 'Reports', href: '/admin/dashboard/reports' },
        { name: 'Notifications', href: '/admin/dashboard/notifications' },
    ];

    return (
        <div className="flex items-center gap-1 border-b border-zinc-800 pb-1 overflow-x-auto scrollbar-hide mb-6">
           {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                  <Link key={tab.name} href={tab.href}>
                      <button className={cn(
                         "px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                         isActive ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                      )}>
                         {tab.name}
                      </button>
                  </Link>
              );
           })}
        </div>
    );
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
        <AdminHeader />
        
        <main className="w-full max-w-[1800px] mx-auto p-4 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Analytics</h1>
                  <p className="text-zinc-400 text-sm">Deep dive into user behavior and system performance.</p>
               </div>
               <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
               </Button>
            </div>

            <AdminTabs />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-400">Total Users</p>
                                <h3 className="text-2xl font-bold">12,450</h3>
                            </div>
                        </div>
                        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-[65%]"></div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">+12% from last month</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
                                <BarChart2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-400">Active Sessions</p>
                                <h3 className="text-2xl font-bold">845</h3>
                            </div>
                        </div>
                        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 w-[45%]"></div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">+5% from last week</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-400">Retention Rate</p>
                                <h3 className="text-2xl font-bold">88.2%</h3>
                            </div>
                        </div>
                        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[88%]"></div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">+2% from last month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for detailed charts */}
            <Card className="bg-zinc-950 border-zinc-800 min-h-[400px] flex items-center justify-center">
                <div className="text-center text-zinc-500">
                    <PieChart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Detailed analytics visualizations coming soon...</p>
                </div>
            </Card>
        </main>
    </div>
  );
}
