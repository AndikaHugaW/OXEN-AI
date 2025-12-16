'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, MessageSquare, Clock, ChevronLeft, ChevronRight, Trash2, X, User as UserIcon, LogOut, Settings, Edit, Sparkles, Sliders, HelpCircle, PanelLeft, Bot, FileText, Activity, TrendingUp, PieChart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ProfileEditModal from './ProfileEditModal';

interface SidebarProps {
  onNewChat: () => void;
  chatHistories: Array<{
    id: string;
    title: string;
    updatedAt: Date;
  }>;
  currentChatId: string | null;
  onLoadChat: (chatId: string) => void;
  onDeleteChat: (chatId: string, e: React.MouseEvent) => void;
  activeView: 'chat' | 'letter' | 'market' | 'reports' | 'visualization';
  onViewChange: (view: 'chat' | 'letter' | 'market' | 'reports' | 'visualization') => void;
}

export default function Sidebar({
  onNewChat,
  chatHistories,
  currentChatId,
  onLoadChat,
  onDeleteChat,
  activeView,
  onViewChange,
}: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };

    fetchUser();
  }, [supabase]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const displayName = profile?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'User';
  
  const avatarUrl = profile?.avatar_url || 
                   user?.user_metadata?.avatar_url || 
                   `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=06b6d4&color=fff&size=128`;

  return (
    <>
      <div
        className={`flex-shrink-0 h-full bg-[#09090b] border-r border-cyan-500/30 z-[100] transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-full flex flex-col p-4">
          {/* Header - Logo & Toggle */}
          <div className={`mb-8 flex items-center ${
            sidebarOpen ? 'justify-between' : 'justify-center'
          } relative h-10`}>
            {sidebarOpen ? (
              <>
                <img 
                  src="/logos/oxen.svg" 
                  alt="OXEN Logo" 
                  className="h-10 w-auto"
                  onError={(e) => {
                    console.error('Logo not found');
                  }}
                />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-cyan-400/60 hover:text-cyan-400 transition-colors p-1"
                >
                  <PanelLeft className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="group relative flex items-center justify-center w-full h-full"
              >
                {/* Logo visible by default, hidden on hover */}
                <img 
                  src="/logos/oxen.svg" 
                  alt="OXEN Logo" 
                  className="h-8 w-auto absolute transition-opacity duration-200 group-hover:opacity-0"
                />
                
                {/* Toggle visible on hover, hidden by default */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                   <div className="p-1.5 rounded-md hover:bg-[#27272a] text-cyan-400">
                      <PanelLeft className="w-5 h-5" />
                   </div>
                </div>

                {/* Tooltip */}
                <div className="absolute left-full ml-4 px-2 py-1 bg-black border border-gray-800 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  Open sidebar
                </div>
              </button>
            )}
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className={`w-full mb-6 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/50 flex items-center justify-center gap-2 ${
              !sidebarOpen && 'px-2'
            }`}
          >
            {sidebarOpen ? (
              <>
                <Plus className="w-5 h-5" />
                <span>New Chat</span>
              </>
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>

          {/* Navigation Icons */}
          <div className="space-y-2 mb-6">


            {/* Letter Generator */}
            <button
              onClick={() => onViewChange('letter')}
              className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
                sidebarOpen ? 'justify-start' : 'justify-center'
              } ${
                activeView === 'letter'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-cyan-200/70 hover:bg-cyan-500/10 hover:text-cyan-300'
              }`}
            >
              <FileText className="w-5 h-5" />
              {sidebarOpen && <span className="text-sm font-medium">Letter Generator</span>}
            </button>

            {/* Market Trends */}
            <button
              onClick={() => onViewChange('market')}
              className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
                sidebarOpen ? 'justify-start' : 'justify-center'
              } ${
                activeView === 'market'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-cyan-200/70 hover:bg-cyan-500/10 hover:text-cyan-300'
              }`}
            >
              <Activity className="w-5 h-5" />
              {sidebarOpen && <span className="text-sm font-medium">Market Trends</span>}
            </button>

            {/* Generate Reports */}
            <button
              onClick={() => onViewChange('reports')}
              className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
                sidebarOpen ? 'justify-start' : 'justify-center'
              } ${
                activeView === 'reports'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-cyan-200/70 hover:bg-cyan-500/10 hover:text-cyan-300'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              {sidebarOpen && <span className="text-sm font-medium">Generate Reports</span>}
            </button>

            {/* Data Visualization */}
            <button
              onClick={() => onViewChange('visualization')}
              className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
                sidebarOpen ? 'justify-start' : 'justify-center'
              } ${
                activeView === 'visualization'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-cyan-200/70 hover:bg-cyan-500/10 hover:text-cyan-300'
              }`}
            >
              <PieChart className="w-5 h-5" />
              {sidebarOpen && <span className="text-sm font-medium">Data Visualization</span>}
            </button>

            {/* History Section Header (Visual only currently) */}

          </div>

          {/* Chat History */}
          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="text-cyan-400/60 text-xs font-semibold uppercase mb-2 px-2">
                Your History
              </div>
              <div className="space-y-1">
                {chatHistories.slice(0, 10).map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => onLoadChat(chat.id)}
                    className={`group p-2 rounded-lg cursor-pointer transition-all ${
                      currentChatId === chat.id
                        ? 'bg-cyan-500/20 border border-cyan-400/50'
                        : 'hover:bg-cyan-500/10 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{chat.title}</p>
                        <p className="text-cyan-400/50 text-xs">
                          {chat.updatedAt.toLocaleDateString('id-ID', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => onDeleteChat(chat.id, e)}
                        className="ml-2 text-cyan-400/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spacer if sidebar closed */}
          {!sidebarOpen && <div className="flex-1" />}

          {/* User Profile Section */}
          <div className="border-t border-cyan-500/20 pt-4 mt-auto mb-4 relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-cyan-500/10 transition-colors ${
                sidebarOpen ? 'justify-start' : 'justify-center'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-cyan-900/30 overflow-hidden border border-cyan-500/30 flex-shrink-0">
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{displayName}</p>
                  <p className="text-xs text-cyan-400/60 truncate">Free Plan</p>
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className={`absolute bottom-full mb-2 bg-[#09090b] border border-cyan-500/30 rounded-xl shadow-xl overflow-hidden w-64 z-50 ${
                sidebarOpen ? 'left-0' : 'left-full ml-2'
              }`}>
                {/* Header Section */}
                <div className="p-3 border-b border-[#27272a]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-900/30 overflow-hidden border border-cyan-500/30 flex-shrink-0">
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{displayName}</p>
                      <p className="text-xs text-gray-400 truncate">@{profile?.username || displayName.replace(/\s+/g, '').toLowerCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  {/* Upgrade Plan */}
                  <button 
                    onClick={() => {
                      // Implement upgrade logic or modal
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-[#27272a] hover:text-white transition-colors flex items-center gap-3"
                  >
                    <Sparkles className="w-4 h-4" />
                    Upgrade plan
                  </button>

                  {/* Personalization (Edit Profile) */}
                  <button 
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-[#27272a] hover:text-white transition-colors flex items-center gap-3"
                  >
                    <Sliders className="w-4 h-4" />
                    Personalization
                  </button>

                  {/* Settings */}
                  <button 
                    onClick={() => {
                      window.location.href = '/settings';
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-[#27272a] hover:text-white transition-colors flex items-center gap-3"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>

                <div className="h-px bg-[#27272a] my-1" />

                <div className="py-1">
                  {/* Help */}
                  <button 
                    onClick={() => {
                      // Implement help logic
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-[#27272a] hover:text-white transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4 h-4" />
                      Help
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>

                  {/* Log out */}
                  <button 
                    onClick={handleSignOut}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-[#27272a] hover:text-white transition-colors flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>


        </div>
      </div>

      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        profile={profile}
        onUpdate={() => {
          // Re-fetch profile
          const fetchUser = async () => {
            if (user) {
              const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
              setProfile(data);
            }
          };
          fetchUser();
        }}
      />
    </>
  );
}

