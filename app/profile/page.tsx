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
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const displayName = profile?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'User';
  
  const avatarUrl = profile?.avatar_url || 
                   user?.user_metadata?.avatar_url || 
                   `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=06b6d4&color=fff&size=128`;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
          <p className="text-cyan-400/70">View and manage your profile information</p>
        </div>

        <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="w-32 h-32 rounded-full bg-cyan-500/20 border border-cyan-500/30 overflow-hidden flex-shrink-0">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=06b6d4&color=fff&size=128`;
                }}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{displayName}</h2>
              <p className="text-cyan-400/70 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              {profile?.username && (
                <p className="text-cyan-400/70 mt-1">@{profile.username}</p>
              )}
            </div>
            <button
              onClick={() => router.push('/profile/edit')}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/50"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 border border-cyan-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <UserIcon className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-medium text-cyan-400">Full Name</h3>
              </div>
              <p className="text-white">{profile?.full_name || 'Not set'}</p>
            </div>

            <div className="bg-gray-800/50 border border-cyan-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-medium text-cyan-400">Email</h3>
              </div>
              <p className="text-white">{user?.email || 'Not available'}</p>
            </div>

            {profile?.username && (
              <div className="bg-gray-800/50 border border-cyan-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <UserIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-medium text-cyan-400">Username</h3>
                </div>
                <p className="text-white">@{profile.username}</p>
              </div>
            )}

            <div className="bg-gray-800/50 border border-cyan-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-medium text-cyan-400">Member Since</h3>
              </div>
              <p className="text-white">
                {user?.created_at 
                  ? new Date(user.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : 'Not available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

