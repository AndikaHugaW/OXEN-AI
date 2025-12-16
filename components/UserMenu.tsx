'use client';

import { useState, useEffect, useRef } from 'react';
import { LogOut, User, Settings, ChevronDown, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserMenuProps {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user.id, supabase]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // Add event listener after a short delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/sign-in');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const displayName = profile?.full_name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 
                     'User';
  
  const avatarUrl = profile?.avatar_url || 
                   user.user_metadata?.avatar_url || 
                   `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=06b6d4&color=fff&size=128`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-cyan-500/10 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 overflow-hidden flex-shrink-0">
          <img 
            src={avatarUrl} 
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=06b6d4&color=fff&size=128`;
            }}
          />
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white">{displayName}</p>
          <p className="text-xs text-cyan-400/70">{user.email}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-cyan-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-cyan-500/30 rounded-xl shadow-xl backdrop-blur-xl overflow-hidden"
          style={{ zIndex: 10000 }}
        >
          <div className="p-3 border-b border-cyan-500/20">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-cyan-400/70 truncate">{user.email}</p>
          </div>
          
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-cyan-200/80 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
            
            <Link
              href="/profile/edit"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-cyan-200/80 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Link>
            
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-cyan-200/80 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>

          <div className="border-t border-cyan-500/20 py-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
