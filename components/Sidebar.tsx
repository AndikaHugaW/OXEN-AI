'use client';

import { useState } from 'react';

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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {sidebarOpen && <span className="text-sm font-medium">Chat</span>}
          </button>

          <button
            className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
              sidebarOpen ? 'justify-start' : 'justify-center'
            } text-cyan-200/70 hover:bg-cyan-500/10 hover:text-cyan-300`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
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
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'}
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

