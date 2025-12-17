'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button-1';
import { Search, Bell, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Shared Header
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
                <input className="bg-transparent outline-none w-full placeholder:text-zinc-600" placeholder="Search..." />
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

export default function NotificationsPage() {
    const notifications = [
        { id: 1, type: 'critical', title: 'High CPU Usage Detected', message: 'Server CPU usage exceeded 90% at 14:00 today.', time: '2 hours ago' },
        { id: 2, type: 'success', title: 'Backup Completed', message: 'Daily database backup completed successfully.', time: '5 hours ago' },
        { id: 3, type: 'info', title: 'New User Registration', message: '50 new users registered in the last hour.', time: '8 hours ago' },
        { id: 4, type: 'warning', title: 'API Rate Limit Warning', message: 'Approaching monthly API limit (85%).', time: '1 day ago' },
        { id: 5, type: 'info', title: 'System Maintenance Scheduled', message: 'System maintenance scheduled for Dec 20, 02:00 AM.', time: '2 days ago' },
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'critical': return 'bg-red-500/10 border-red-500/20';
            case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
            case 'success': return 'bg-emerald-500/5 border-emerald-500/10';
            default: return 'bg-blue-500/5 border-blue-500/10';
        }
    };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
        <AdminHeader />
        
        <main className="w-full max-w-[1800px] mx-auto p-4 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Notifications</h1>
                  <p className="text-zinc-400 text-sm">System alerts and messages.</p>
               </div>
               <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800">
                  Mark all as read
               </Button>
            </div>

            <AdminTabs />

            <div className="space-y-4 max-w-4xl">
                {notifications.map((notif) => (
                    <div key={notif.id} className={cn("flex items-start gap-4 p-4 rounded-lg border", getBgColor(notif.type))}>
                        <div className="mt-1">{getIcon(notif.type)}</div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-sm">{notif.title}</h4>
                                <span className="text-xs text-zinc-500">{notif.time}</span>
                            </div>
                            <p className="text-sm text-zinc-400">{notif.message}</p>
                        </div>
                        <button className="text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </main>
    </div>
  );
}
