'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. Access Check (Optional but good for UX)
      // Check if user is actually admin
      if (data.user) {
         const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
         
         if (profile?.role !== 'admin') {
             // Sign out if not admin trying to access admin portal
             await supabase.auth.signOut();
             throw new Error('Access Denied: Insufficient Clearance Level');
         }
      }

      // Success
      router.push('/admin/dashboard');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
       {/* Background Effects */}
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 opacity-50"></div>
       <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-600/10 rounded-full blur-[100px]"></div>
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px] animate-pulse"></div>

       <div className="w-full max-w-md z-10">
          <div className="text-center mb-10">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#18181b] to-[#09090b] border border-red-900/30 shadow-[0_0_30px_-5px_rgba(220,38,38,0.3)] mb-6">
                <ShieldCheck className="w-8 h-8 text-red-500" />
             </div>
             <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 tracking-tight">
                Admin <span className="text-red-500">Portal</span>
             </h1>
             <p className="text-gray-500 mt-2 text-sm uppercase tracking-widest font-medium">Restricted Access Area</p>
          </div>

          <div className="bg-[#09090b] border border-[#27272a] rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
             <form onSubmit={handleLogin} className="space-y-5">
                
                {error && (
                   <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-sm text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                   </div>
                )}

                <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-gray-400 uppercase ml-1">Identity ID (Email)</label>
                   <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder-gray-700"
                        placeholder="admin@oxen.ai"
                      />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-gray-400 uppercase ml-1">Passcode</label>
                   <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder-gray-700"
                        placeholder="••••••••"
                     />
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                >
                   {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                      <>
                        Authenticate
                        <ChevronRight className="w-5 h-5" />
                      </>
                   )}
                </button>

             </form>
          </div>

          <div className="text-center mt-8 space-y-4">
             <p className="text-xs text-gray-600">
                Unauthorized access attempts are monitored and logged. <br/>
                IP: Locked. Session: Secure.
             </p>
             <a href="/admin/register" className="inline-block text-xs font-medium text-red-500/50 hover:text-red-400 transition-colors border-b border-dashed border-red-500/20 pb-0.5">
                New Admin Initialization
             </a>
          </div>
       </div>
    </div>
  );
}
