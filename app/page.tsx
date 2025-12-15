'use client';

import { useState } from 'react';
import { MessageSquare, FileText } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import LetterGenerator from '@/components/LetterGenerator';

type TabType = 'chat' | 'letter';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  return (
    <main className="min-h-screen bg-black">
      <div className="w-full">
        {/* Header - Only show for Letter Generator */}
        {activeTab === 'letter' && (
          <div className="text-center py-6 border-b border-[hsl(var(--border))]">
            <div className="flex items-center justify-center mb-2">
              <img 
                src="/logos/oxen.svg" 
                alt="OXEN Logo" 
                className="h-12 w-auto"
              />
            </div>
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              Generator Surat Resmi
            </p>
          </div>
        )}

        {/* Tabs - Web3 Modern Style */}
        <div className="relative bg-gradient-to-b from-black/80 via-black/60 to-black/40 backdrop-blur-2xl border-b border-cyan-500/20 shadow-[0_4px_20px_rgba(6,182,212,0.1)]">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <div className="relative flex max-w-7xl mx-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`group px-8 py-4 text-center font-semibold transition-all duration-300 relative overflow-hidden ${
                activeTab === 'chat'
                  ? 'text-cyan-400'
                  : 'text-gray-400 hover:text-cyan-300'
              }`}
            >
              {/* Active indicator with glow */}
              {activeTab === 'chat' && (
                <>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
                </>
              )}
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative flex items-center justify-center gap-2">
                <MessageSquare className={`w-5 h-5 transition-all duration-300 ${
                  activeTab === 'chat' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'group-hover:text-cyan-300'
                }`} />
                <span className="relative z-10">{activeTab === 'chat' ? 'Chat / Jawaban' : 'Chat / Jawaban'}</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('letter')}
              className={`group px-8 py-4 text-center font-semibold transition-all duration-300 relative overflow-hidden ${
                activeTab === 'letter'
                  ? 'text-cyan-400'
                  : 'text-gray-400 hover:text-cyan-300'
              }`}
            >
              {/* Active indicator with glow */}
              {activeTab === 'letter' && (
                <>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
                </>
              )}
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative flex items-center justify-center gap-2">
                <FileText className={`w-5 h-5 transition-all duration-300 ${
                  activeTab === 'letter' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'group-hover:text-cyan-300'
                }`} />
                <span className="relative z-10">Generator Surat</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'letter' && (
            <div className="max-w-6xl mx-auto p-8">
              <LetterGenerator />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

