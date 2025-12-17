'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Key, Lock, Mail, User, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    secretKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/admin-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Success, redirect to login
      router.push('/admin/login');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
       {/* Background Effects */}
       <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-indigo-600 via-purple-500 to-indigo-600 opacity-50"></div>
       <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px]"></div>

       <div className="w-full max-w-md z-10">
          <div className="text-center mb-10">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#18181b] to-[#09090b] border border-indigo-900/30 shadow-[0_0_30px_-5px_rgba(79,70,229,0.3)] mb-6">
                <ShieldAlert className="w-8 h-8 text-indigo-500" />
             </div>
             <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 tracking-tight">
                Admin <span className="text-indigo-500">Initialization</span>
             </h1>
             <p className="text-gray-500 mt-2 text-sm uppercase tracking-widest font-medium">Create Secure Clearance Profile</p>
          </div>

          <div className="bg-[#09090b] border border-[#27272a] rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
             <form onSubmit={handleSubmit} className="space-y-4">
                
                {error && (
                   <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-sm text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                   </div>
                )}

                <div className="space-y-1.5">
                   <div className="relative group">
                      <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                      <input 
                        type="text" 
                        required
                        value={formData.fullName}
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-700"
                        placeholder="Full Name"
                      />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-700"
                        placeholder="Admin Email"
                      />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                      <input 
                        type="password" 
                        required
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-700"
                        placeholder="Secure Password"
                     />
                   </div>
                </div>

                <div className="border-t border-[#27272a] my-2 pt-2"></div>

                <div className="space-y-1.5 animate-pulse-slow">
                   <label className="text-xs font-semibold text-indigo-400 uppercase ml-1 flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      Security Clearance Key
                   </label>
                   <div className="relative group">
                      <ShieldAlert className="absolute left-4 top-3.5 w-5 h-5 text-indigo-500 group-focus-within:text-white transition-colors" />
                      <input 
                        type="text" 
                        required
                        value={formData.secretKey}
                        onChange={e => setFormData({...formData, secretKey: e.target.value})}
                        className="w-full bg-[#18181b] border border-indigo-500/30 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-indigo-500/30 font-mono tracking-wider"
                        placeholder="OXEN_MASTER_KEY_..."
                     />
                   </div>
                   <p className="text-[10px] text-gray-500 ml-1">Required for role escalation.</p>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                >
                   {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                      <>
                        Grant Access
                        <ChevronRight className="w-5 h-5" />
                      </>
                   )}
                </button>

             </form>
          </div>

          <div className="text-center mt-8">
             <a href="/admin/login" className="text-xs font-medium text-gray-500 hover:text-white transition-colors">
                Already have clearance? Login
             </a>
          </div>
       </div>
    </div>
  );
}
