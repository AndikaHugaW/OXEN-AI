'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button-1';
import { Search, Bell, FileText, Download, Filter, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge-2';
import { cn } from '@/lib/utils';

// Shared Header (Duplicated for speed, ideally componentized)
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
                <input className="bg-transparent outline-none w-full placeholder:text-zinc-600" placeholder="Search reports..." />
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

export default function ReportsPage() {
    const reports = [
        { id: 'RPT-001', name: 'Monthly Financial Summary', date: '2024-12-01', user: 'System', status: 'Completed', size: '2.4 MB' },
        { id: 'RPT-002', name: 'User Activity Log', date: '2024-12-02', user: 'Admin', status: 'Completed', size: '1.1 MB' },
        { id: 'RPT-003', name: 'Error & Performance Audit', date: '2024-12-05', user: 'DevOps', status: 'Pending', size: '-' },
        { id: 'RPT-004', name: 'API Usage Breakdown', date: '2024-12-07', user: 'System', status: 'Completed', size: '4.5 MB' },
        { id: 'RPT-005', name: 'Feature Engagement Report', date: '2024-12-10', user: 'Product', status: 'Completed', size: '3.2 MB' },
    ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
        <AdminHeader />
        
        <main className="w-full max-w-[1800px] mx-auto p-4 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white mb-1">System Reports</h1>
                  <p className="text-zinc-400 text-sm">Download and manage generated system reports.</p>
               </div>
               <div className="flex gap-2">
                   <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                   </Button>
                   <Button className="bg-white text-black hover:bg-zinc-200">
                      Generate New Report
                   </Button>
               </div>
            </div>

            <AdminTabs />

            <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50 border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-3">Report Name</th>
                                    <th className="px-6 py-3">Generated By</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Size</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report) => (
                                    <tr key={report.id} className="border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500/10 rounded text-indigo-400">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            {report.name}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">{report.user}</td>
                                        <td className="px-6 py-4 text-zinc-400">{report.date}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={report.status === 'Completed' ? 'success' : 'warning'}>
                                                {report.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">{report.size}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-zinc-400 hover:text-white p-2">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
