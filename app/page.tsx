'use client';

import ChatInterface from '@/components/ChatInterface';
import { Suspense } from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Suspense fallback={<div className="h-screen bg-black" />}>
        <ChatInterface />
      </Suspense>
    </main>
  );
}

