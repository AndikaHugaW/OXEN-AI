'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Clock, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';

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
}

export default function Sidebar({
  onNewChat,
  chatHistories,
  currentChatId,
  onLoadChat,
  onDeleteChat,
}: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-black border-r border-cyan-500/30 z-50 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
      style={{ height: '100vh' }}
    >
      <div className="h-full flex flex-col p-4">
        {/* Logo */}
        <div className="mb-8 flex items-center">
          {sidebarOpen ? (
            <img 
              src="/logos/oxen.svg" 
              alt="OXEN Logo" 
              className="h-12 w-auto"
            />
          ) : (
            <div className="flex items-center justify-center mx-auto">
              <img 
                src="/logos/oxen.svg" 
                alt="OXEN Logo" 
                className="h-10 w-auto"
              />
            </div>
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
          <button
            className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
              sidebarOpen ? 'justify-start' : 'justify-center'
            } ${
              true // Chat is active
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-cyan-200/70 hover:bg-cyan-500/10 hover:text-cyan-300'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">Chat</span>}
          </button>

          <button
            className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
              sidebarOpen ? 'justify-start' : 'justify-center'
            } text-cyan-200/70 hover:bg-cyan-500/10 hover:text-cyan-300`}
          >
            <Clock className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">History</span>}
          </button>
        </div>

        {/* Chat History */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto">
            <div className="text-cyan-400/60 text-xs font-semibold uppercase mb-2 px-2">
              Recent
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

        {/* Toggle Sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mt-auto p-2 text-cyan-400/60 hover:text-cyan-400 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}

