'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Mail, Calendar, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        // Check if Supabase is configured
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
          router.push('/');
          return;
        }

        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          router.push('/auth/sign-in');
          return;
        }

        setUser(currentUser);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData);
        }
      } catch (err: any) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndProfile();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const displayName = profile?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'User';
  
  const avatarUrl = profile?.avatar_url || 
                   user?.user_metadata?.avatar_url || 
                   `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=128`;

  // Web3 Design Implementation (Neon Blue Theme)
  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-hidden relative selection:bg-blue-500/30">
      {/* Background Gradients - Unified Cyan/Teal Theme */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto p-6 md:p-12">
        <div className="mb-12 space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-400 to-blue-500 animate-gradient-x neon-text">
            Profile Dashboard
          </h1>
          <p className="text-blue-400/80 text-lg">Manage your digital identity and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Card */}
          <div className="lg:col-span-3">
            <div className="backdrop-blur-xl bg-black/40 border border-blue-500/30 rounded-3xl p-8 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden group hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-[3px] bg-gradient-to-tr from-blue-400 via-blue-400 to-blue-500 glow-cyan">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#030014] bg-[#030014]">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=128`;
                        }}
                      />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-blue-400 border-4 border-[#030014] rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                  <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-[0_0_5px_rgba(37,99,235,0.5)]">{displayName}</h2>
                  <div className="flex flex-col md:flex-row items-center gap-3 text-blue-100/70">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/30 border border-blue-500/20 text-sm hover:border-blue-500/50 transition-colors">
                      <Mail className="w-4 h-4 text-blue-400" />
                      {user?.email}
                    </span>
                    {profile?.username && (
                      <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/30 border border-blue-500/20 text-sm hover:border-blue-500/50 transition-colors">
                        <UserIcon className="w-4 h-4 text-blue-400" />
                        @{profile.username}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => router.push('/profile/edit')}
                  className="group relative px-8 py-3 rounded-xl bg-blue-500 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:bg-blue-400 transition-all hover:scale-105 active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group backdrop-blur-md bg-black/40 border border-blue-500/20 rounded-2xl p-6 hover:bg-blue-950/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all">
                <UserIcon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-blue-400/70 text-sm font-medium mb-1">Full Name</h3>
              <p className="text-xl font-semibold text-white tracking-wide">
                {profile?.full_name || 'Not set'}
              </p>
            </div>

            <div className="group backdrop-blur-md bg-black/40 border border-blue-500/20 rounded-2xl p-6 hover:bg-blue-950/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-blue-400/70 text-sm font-medium mb-1">Email Address</h3>
              <p className="text-xl font-semibold text-white tracking-wide truncate" title={user?.email}>
                {user?.email || 'Not available'}
              </p>
            </div>

            <div className="group backdrop-blur-md bg-black/40 border border-blue-500/20 rounded-2xl p-6 hover:bg-blue-950/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-blue-400/70 text-sm font-medium mb-1">Member Since</h3>
              <p className="text-xl font-semibold text-white tracking-wide">
                {user?.created_at 
                  ? new Date(user.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

