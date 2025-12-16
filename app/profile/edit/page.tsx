'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    avatar_url: '',
  });

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

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        if (profileData) {
          setProfile({
            full_name: profileData.full_name || '',
            username: profileData.username || '',
            avatar_url: profileData.avatar_url || '',
          });
        } else {
          // Use user metadata as fallback
          setProfile({
            full_name: currentUser.user_metadata?.full_name || '',
            username: currentUser.email?.split('@')[0] || '',
            avatar_url: currentUser.user_metadata?.avatar_url || '',
          });
        }
      } catch (err: any) {
        console.error('Error:', err);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndProfile();
  }, [router, supabase]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!user) {
        setError('User not found');
        setIsSaving(false);
        return;
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        throw updateError;
      }

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
      });

      if (metadataError) {
        console.warn('Failed to update user metadata:', metadataError);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Edit Profile</h1>
          <p className="text-cyan-400/70">Update your profile information</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
            <p className="text-sm">Profile updated successfully! Redirecting...</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Section */}
          <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6">
            <label className="text-sm font-medium text-cyan-400 mb-4 block">Profile Picture</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-cyan-500/20 border border-cyan-500/30 overflow-hidden flex-shrink-0">
                <img
                  src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=06b6d4&color=fff&size=128`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=06b6d4&color=fff&size=128`;
                  }}
                />
              </div>
              <div className="flex-1">
                <input
                  type="url"
                  value={profile.avatar_url}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  placeholder="Enter avatar URL"
                  className="w-full px-4 py-2 bg-gray-800 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-cyan-400/60 mt-2">Enter a URL for your profile picture</p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6">
            <label className="text-sm font-medium text-cyan-400 mb-2 block">Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-gray-800 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Username */}
          <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6">
            <label className="text-sm font-medium text-cyan-400 mb-2 block">Username</label>
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              placeholder="Enter your username"
              className="w-full px-4 py-3 bg-gray-800 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
            <p className="text-xs text-cyan-400/60 mt-2">This will be your unique username</p>
          </div>

          {/* Email (Read-only) */}
          <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6">
            <label className="text-sm font-medium text-cyan-400 mb-2 block">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-gray-800/50 border border-cyan-500/20 rounded-lg text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-cyan-400/60 mt-2">Email cannot be changed</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

