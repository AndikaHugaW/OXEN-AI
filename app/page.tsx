'use client';

import { useState } from 'react';
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
          <div className="text-center py-6 border-b border-cyan-500/20">
            <div className="flex items-center justify-center mb-2">
              <img 
                src="/logos/oxen.svg" 
                alt="OXEN Logo" 
                className="h-12 w-auto"
              />
            </div>
            <p className="text-cyan-200/70 text-sm">
              Generator Surat Resmi
            </p>
          </div>
        )}

        {/* Tabs - Only show for Letter Generator */}
        {activeTab === 'letter' && (
          <div className="bg-black backdrop-blur-xl border-b border-cyan-500/20">
            <div className="flex max-w-7xl mx-auto">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-8 py-4 text-center font-semibold transition-all relative ${
                  activeTab === 'chat'
                    ? 'text-cyan-400'
                    : 'text-cyan-200/70 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                💬 Chat / Jawaban
              </button>
              <button
                onClick={() => setActiveTab('letter')}
                className={`px-8 py-4 text-center font-semibold transition-all relative ${
                  activeTab === 'letter'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-cyan-200/70 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                📄 Generator Surat
              </button>
            </div>
          </div>
        )}

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

