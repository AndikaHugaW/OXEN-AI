'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  onUpdate: () => void;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  user,
  profile,
  onUpdate
}: ProfileEditModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile?.full_name || user?.user_metadata?.full_name || '');
      setUsername(profile?.username || user?.email?.split('@')[0] || '');
      setAvatarUrl(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
    }
  }, [isOpen, profile, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (data) {
        setAvatarUrl(data.publicUrl);
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(`Error uploading avatar: ${error.message || 'Unknown error'}\n\nHint: Ensure you have a public 'avatars' bucket in your Supabase project.`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const updates: any = {
        id: user.id,
        full_name: displayName,
        username: username,
        updated_at: new Date().toISOString(),
      };

      if (avatarUrl) {
        updates.avatar_url = avatarUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayAvatarUrl = avatarUrl || 
    profile?.avatar_url || 
    user?.user_metadata?.avatar_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=2563eb&color=fff&size=128`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Edit profile</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div 
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-900/30 ring-4 ring-[#27272a]">
                <img 
                  src={displayAvatarUrl} 
                  alt="Profile" 
                  className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-50' : 'opacity-100'}`}
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <div className="absolute bottom-0 right-0 p-1.5 bg-[#27272a] rounded-full border border-[#18181b]">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
              disabled={uploading}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent border border-[#27272a] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border border-[#27272a] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="mt-8 text-xs text-gray-500 text-center px-4">
            Your profile helps people recognize you. Your name and username are also used in the app.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-[#27272a]/50 border-t border-[#27272a]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white hover:bg-[#27272a] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium bg-white text-black hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
