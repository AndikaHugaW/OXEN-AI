'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, BarChart3, TrendingUp, FileText, ArrowUp, Sparkles, X, Paperclip, Mic, Settings, Grid3x3, PieChart, Activity, Share2, Bell, Reply, MessageCircle, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown, FileUp, Search, Image as ImageIcon, Globe, CheckCircle2, AlertCircle, Loader2, RotateCcw, Copy, Download, ZoomIn, RefreshCw, Paintbrush, Check } from 'lucide-react';
import Sidebar from './Sidebar';
import ChartRenderer, { ChartData } from './ChartRenderer';
import DataTable, { TableData } from './DataTable';
import LoginAlert from './LoginAlert';
import { createClient } from '@/lib/supabase/client';
import LetterGenerator from './LetterGenerator';
import OnboardCard from './ui/onboard-card';
import { extractDataFromUserInput, datasetToChartData } from '@/lib/llm/data-parser';
import MarkdownRenderer from './MarkdownRenderer';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

// --- Helper Components for Hero Sections ---

function MarketTrendsHero({ setInput }: { setInput: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
      <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_30px_-10px_rgba(37,99,235,0.3)]">
         <Activity className="w-10 h-10 text-blue-400" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
         Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-500">Intelligence</span>
      </h1>
      <p className="text-lg text-gray-400 mb-12 max-w-2xl leading-relaxed">
         Real-time data analysis for stocks and crypto. 
         Get deep insights, technical indicators, and market sentiment in seconds.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
         {[
           { title: "Analisis Saham", desc: "Analisis fundamental & teknikal", prompt: "Analisis saham BBCA secara lengkap" },
           { title: "Crypto Trends", desc: "Momentum pasar & prediksi", prompt: "Tren harga Bitcoin minggu ini" },
           { title: "Market Comparison", desc: "Bandingkan performa aset", prompt: "Bandingkan performa ETH vs SOL" }
         ].map((item, i) => (
           <button key={i} onClick={() => setInput(item.prompt)} 
              className="p-6 bg-[#18181b] border border-white/5 rounded-2xl hover:border-blue-500/50 hover:bg-white/5 transition-all text-left group relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                 </div>
                 <h3 className="font-semibold text-white">{item.title}</h3>
              </div>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 relative z-10">{item.desc}</p>
           </button>
         ))}
      </div>
    </div>
  );
}

function ReportGeneratorHero({ setInput, documents = [] }: { setInput: (s: string) => void, documents?: any[] }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 text-center px-4 animate-fade-in overflow-y-auto">
      <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]">
         <FileText className="w-10 h-10 text-indigo-400" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
         Professional <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Reports</span>
      </h1>
      <p className="text-lg text-gray-400 mb-12 max-w-2xl leading-relaxed">
         Generate comprehensive business reports, proposals, and analysis documents tailored to your needs.
      </p>

      {documents.length > 0 && (
        <div className="w-full max-w-5xl mb-12 text-left">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-md font-semibold text-white uppercase tracking-wider">Stored Knowledge</h3>
            </div>
            <span className="text-xs text-gray-500">{documents.length} Dokumen Tersimpan</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {documents.slice(0, 4).map((doc, i) => (
              <div key={i} className="group p-4 bg-[#111114] border border-white/5 rounded-xl hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4 text-indigo-400" onClick={() => setInput(`Analisis mendalam terhadap dokumen "${doc.title}"`)} />
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/5 flex items-center justify-center mb-3 group-hover:bg-indigo-500/10 transition-colors">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-white line-clamp-1 mb-1">{doc.title}</p>
                <p className="text-[10px] text-gray-500 uppercase">{doc.doc_type || 'General'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
         {[
           { title: "Startup Analysis", desc: "Evaluate market fit & growth", prompt: "Buat laporan analisis pasar untuk startup teknologi" },
           { title: "Monthly Report", desc: "Track KPIs and performance", prompt: "Buat laporan performa bulanan untuk klien" },
           { title: "Business Proposal", desc: "Win new clients with data", prompt: "Buat proposal bisnis untuk proyek baru" }
         ].map((item, i) => (
           <button key={i} onClick={() => setInput(item.prompt)} 
              className="p-6 bg-[#18181b] border border-white/5 rounded-2xl hover:border-indigo-500/50 hover:bg-white/5 transition-all text-left group relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                 <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                    <FileText className="w-4 h-4 text-indigo-400" />
                 </div>
                 <h3 className="font-semibold text-white">{item.title}</h3>
              </div>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 relative z-10">{item.desc}</p>
           </button>
         ))}
      </div>
    </div>
  );
}

function VisualizationHero({ setInput }: { setInput: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
      <div className="w-20 h-20 bg-pink-500/10 rounded-3xl flex items-center justify-center mb-6 border border-pink-500/20 shadow-[0_0_30px_-10px_rgba(236,72,153,0.3)]">
         <PieChart className="w-10 h-10 text-pink-400" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
         Data <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">Visualization</span>
      </h1>
      <p className="text-lg text-gray-400 mb-12 max-w-2xl leading-relaxed">
         Transform raw numbers into beautiful, interactive charts. 
         Paste your data or describe what you want to see.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
         {[
           { title: "Sales Overview", desc: "Visualise revenue trends", prompt: "Tampilkan grafik tren penjualan tahun ini", icon: <TrendingUp className="w-4 h-4 text-pink-400" /> },
           { title: "Budget Allocation", desc: "Pie charts for distribution", prompt: "Buat pie chart alokasi budget marketing", icon: <PieChart className="w-4 h-4 text-pink-400" /> },
           { title: "Comparative Data", desc: "Bar charts for comparison", prompt: "Bandingkan performa penjualan Q1 vs Q2", icon: <BarChart3 className="w-4 h-4 text-pink-400" /> }
         ].map((item, i) => (
           <button key={i} onClick={() => setInput(item.prompt)} 
              className="p-6 bg-[#18181b] border border-white/5 rounded-2xl hover:border-pink-500/50 hover:bg-white/5 transition-all text-left group relative overflow-hidden">
              <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                 <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                    {item.icon}
                 </div>
                 <h3 className="font-semibold text-white">{item.title}</h3>
              </div>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 relative z-10">{item.desc}</p>
           </button>
         ))}
      </div>
    </div>
  );
}

function DefaultHero({ 
  setInput, 
  setActiveView, 
  userName, 
  onSubmit, 
  inputValue, 
  onInputChange,
  onUploadClick,
  isWebSearchEnabled,
  setIsWebSearchEnabled,
  isImageGenEnabled,
  setIsImageGenEnabled
}: { 
  setInput: (s: string) => void, 
  setActiveView: (v: any) => void,
  userName?: string,
  onSubmit: (e: React.FormEvent) => void,
  inputValue: string,
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onUploadClick: () => void,
  isWebSearchEnabled: boolean,
  setIsWebSearchEnabled: (b: boolean) => void,
  isImageGenEnabled: boolean,
  setIsImageGenEnabled: (b: boolean) => void
}) {
  return (
    <div className="max-w-4xl w-full mx-auto flex flex-col items-center justify-center px-6 animate-fade-in py-12">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-950/30 border border-cyan-500/20 rounded-full mb-10 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-cyan-400">Free plan</span>
            <span className="w-1 h-1 rounded-full bg-cyan-400/20" />
            <button className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">Upgrade</button>
        </div>

        {/* Welcome Section */}
        <div className="flex items-center gap-5 mb-12">
            <div className="w-16 h-16 flex items-center justify-center">
                <img src="/logos/oxen-3.svg" alt="Oxen Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
                Hey there, <span className="text-white/90 font-bold">{userName || 'Minju'}</span>
            </h1>
        </div>

        {/* Main Search Bar */}
        <div className="w-full max-w-3xl mb-8 relative group">
            <form onSubmit={onSubmit} className="relative">
                <input
                    type="text"
                    value={inputValue}
                    onChange={onInputChange}
                    placeholder="How can I help you today"
                    className="w-full h-16 pl-6 pr-24 bg-[#18181b] border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-2xl"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" className="p-2.5 text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-xl transition-all">
                        <img 
                          src="/icon/microphone.svg" 
                          alt="Mic" 
                          className="w-[22px] h-[22px]" 
                          style={{ filter: 'invert(65%) sepia(80%) saturate(1000%) hue-rotate(150deg) brightness(1.4) contrast(1.1) drop-shadow(0 0 12px rgba(6, 182, 212, 1)) drop-shadow(0 0 20px rgba(6, 182, 212, 0.6))' }} 
                        />
                    </button>
                    <button 
                        type="submit" 
                        disabled={!inputValue.trim()}
                        className="p-2.5 transition-all group disabled:cursor-not-allowed"
                    >
                        <img 
                          src="/icon/send.svg" 
                          alt="Send" 
                          className="w-[22px] h-[22px] transition-all group-hover:scale-110" 
                          style={{ filter: 'invert(65%) sepia(80%) saturate(1000%) hue-rotate(150deg) brightness(1.4) contrast(1.1) drop-shadow(0 0 12px rgba(6, 182, 212, 1)) drop-shadow(0 0 20px rgba(6, 182, 212, 0.6))' }} 
                        />
                    </button>
                </div>
            </form>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
                type="button"
                onClick={onUploadClick}
                className="flex items-center gap-2.5 px-6 py-3 bg-cyan-500/5 border border-cyan-500/20 rounded-full text-[13px] font-semibold text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all backdrop-blur-md shadow-lg"
            >
                <FileUp className="w-4 h-4 shadow-sm" />
                <span>Upload Document</span>
            </button>
            <button 
                type="button"
                onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                className={`flex items-center gap-2.5 px-6 py-3 border rounded-full text-[13px] font-semibold transition-all backdrop-blur-md shadow-lg ${
                    isWebSearchEnabled 
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                    : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400/80 hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:text-cyan-400'
                }`}
            >
                <Globe className="w-4 h-4" />
                <span>Web Search</span>
            </button>
            <button 
                type="button"
                onClick={() => setIsImageGenEnabled(!isImageGenEnabled)}
                className={`flex items-center gap-2.5 px-6 py-3 border rounded-full text-[13px] font-semibold transition-all backdrop-blur-md shadow-lg ${
                    isImageGenEnabled 
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                    : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400/80 hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:text-cyan-400'
                }`}
            >
                <img 
                  src="/icon/Image-Gen.svg" 
                  alt="AI Image" 
                  className="w-4 h-4" 
                  style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.7))' }} 
                />
                <span>AI Image Gen</span>
            </button>
        </div>
    </div>
  );
}

interface Message {
  id?: string; // Unique ID for each message
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chart?: ChartData;
  charts?: ChartData[]; // Support multiple charts
  table?: TableData;
  imageUrl?: string;
  imageMeta?: {  // For image rating system
    seed: number;
    style: string;
    originalPrompt: string;
  };
  replyTo?: { // Reply reference
    id: string;
    content: string;
    role: 'user' | 'assistant';
  };
  recommendations?: string[]; // Follow-up suggestions
  webSearchActive?: boolean;
  documentAnalysisActive?: boolean;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeView, setActiveView] = useState<'chat' | 'letter' | 'market' | 'reports' | 'visualization'>('chat');
  
  // Initialize view from URL if present (must be in useEffect to avoid hydration mismatch)
  useEffect(() => {
    const view = searchParams.get('view');
    if (view && ['chat', 'letter', 'market', 'reports', 'visualization'].includes(view)) {
      setActiveView(view as any);
    }
  }, []); // Only run once on mount
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isImageGenEnabled, setIsImageGenEnabled] = useState(false);
  const [imageStyle, setImageStyle] = useState<'portrait' | 'product' | 'cinematic' | 'anime' | 'business' | 'minimalist' | 'infographic'>('portrait');
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{id: string, name: string, size?: number, ext?: string}[]>([]);
  const [storedDocuments, setStoredDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // For image zoom modal
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Only check auth if Supabase is configured
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
          setIsCheckingAuth(false);
          return;
        }

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
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsCheckingAuth(false);
      }
    };
    checkAuth();

    // Listen for auth changes (only if Supabase is configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          setShowLoginAlert(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [supabase]);

  // Load chat histories from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chatHistories');
    if (saved) {
      try {
        const histories = JSON.parse(saved).map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt),
          updatedAt: new Date(h.updatedAt),
          messages: h.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
        setChatHistories(histories);
      } catch (error) {
        console.error('Error loading chat histories:', error);
      }
    }
  }, []);

  // Reactive view management from URL (for back/forward navigation)
  useEffect(() => {
    const view = searchParams.get('view');
    if (view && ['chat', 'letter', 'market', 'reports', 'visualization'].includes(view)) {
      if (view !== activeView) {
        setMessages([]);
        setCurrentChatId(null);
        setActiveView(view as any);
      }
    } else if (mounted && !view && activeView !== 'chat') {
       // Only reset to chat if URL is explicitly empty and we have already mounted
       setMessages([]);
       setCurrentChatId(null);
       setActiveView('chat');
    }
  }, [searchParams, mounted]); 

  // Handle keyboard events for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        setLightboxImage(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  const [feedbackState, setFeedbackState] = useState<Record<string, number>>({});

  const handleFeedback = async (messageId: string, rating: number) => {
    // Prevent double voting same rating
    if (feedbackState[messageId] === rating) return;
    
    setFeedbackState(prev => ({...prev, [messageId]: rating}));
    
    try {
        await fetch('/api/chat/feedback', {
            method: 'POST',
            body: JSON.stringify({
                rating,
                messageId
            })
        });
    } catch (err) {
        console.error('Feedback failed:', err);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setToast({ type: 'success', message: 'Teks disalin ke clipboard!' });
    // Auto-clear toast
    setTimeout(() => setToast(null), 3000);
  };

  const handleShare = (message: Message) => {
    const shareText = `Oxen AI Analysis:\n\n${message.content}\n\nGenerated by Oxen AI`;
    navigator.clipboard.writeText(shareText);
    setToast({ type: 'success', message: 'Teks siap dibagikan!' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRegenerate = async (messageIndex: number) => {
    // Find the last user message before this assistant message
    let userMsgIndex = -1;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgIndex = i;
        break;
      }
    }

    if (userMsgIndex !== -1) {
      const userContent = messages[userMsgIndex].content;
      // Remove all messages from history AFTER the user message
      const historyToKeep = messages.slice(0, userMsgIndex + 1);
      setMessages(historyToKeep);
      // Re-trigger the submit
      await handleSubmit(null, userContent, true);
    }
  };

  // Save chat histories to localStorage
  const saveChatHistories = (histories: ChatHistory[]) => {
    localStorage.setItem('chatHistories', JSON.stringify(histories));
    setChatHistories(histories);
  };

  // Fetch documents for knowledge base
  const fetchStoredDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setStoredDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  useEffect(() => {
    if (activeView === 'reports') {
      fetchStoredDocuments();
    }
  }, [activeView]);

  // Create new chat (internal helper)
  const createNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
  };

  // Specifically for the "New Chat" button action
  const handleNewChatAction = () => {
    setMessages([]);
    setCurrentChatId(null);
    setActiveView('chat');
    router.push('/', { scroll: false });
  };

  // Handle view change - update state IMMEDIATELY then sync URL
  const handleViewChange = (view: 'chat' | 'letter' | 'market' | 'reports' | 'visualization') => {
    setMessages([]);
    setCurrentChatId(null);
    setActiveView(view);
    
    // Sync URL without triggering a full page reload or scrolling
    const url = view === 'chat' ? '/' : `/?view=${view}`;
    router.push(url, { scroll: false });
  };

  // Load chat from history
  const loadChat = (chatId: string) => {
    const chat = chatHistories.find((h) => h.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
    }
  };

  // Delete chat
  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chatHistories.filter((h) => h.id !== chatId);
    saveChatHistories(updated);
    if (currentChatId === chatId) {
      createNewChat();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper to determine mode from activeView
  const getModeFromView = (view: string) => {
    switch (view) {
      case 'market':
        return 'MODE_MARKET_ANALYSIS';
      case 'reports':
        return 'MODE_BUSINESS_ADMIN';
      case 'visualization':
        return 'MODE_BUSINESS_ADMIN'; // Data viz is part of business admin for now
      case 'letter':
        return 'MODE_LETTER_GENERATOR';
      default:
        return 'MODE_BUSINESS_ADMIN';
    }
  };

  // Helper to generate follow-up recommendations based on conversation context
  const generateRecommendations = (userInput: string, aiResponse: string, view: string): string[] => {
    const recommendations: string[] = [];
    const lowerInput = userInput.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();
    
    // Comprehensive Crypto & Stock Pattern
    // 🔥 FIX: Removed 'ada', 'sol', 'dot' to prevent false positives with Indonesian words
    // "ada" = "there is", "sol" = in "solusi", "dot" = in "dotcom"
    // Users can still mention full names: cardano, solana, polkadot
    const cryptoSymbols = 'btc|eth|bnb|xrp|doge|matic|avax|ltc|link|uni|atom|trx|etc|xlm|fil|hbar|apt|arb|op|ldo|qnt|vet|near|algo|grt|ftm|sand|mana|axs|theta|eos|aave|flow|xtz|imx|gala|chz|kcs|bsv|usdt|usdc|cardano|solana|polkadot';
    const stockSymbols = 'bbca|bbri|tlkm|goto|bca|bri|asii|bmri|icbp|unvr|adro|ptba|pgas|antm|mdka|indf|hmsp|ggrm|towr|exc|fren';
    const symbolRegex = new RegExp(`\\b(${cryptoSymbols}|${stockSymbols})\\b`, 'gi');
    
    // Check for symbols in input
    const symbolsMatch = lowerInput.match(symbolRegex);
    
    // 1. Market Analysis Scenario
    if (view === 'market' || symbolsMatch || lowerInput.includes('saham') || lowerInput.includes('stock') || lowerInput.includes('crypto')) {
      if (symbolsMatch && symbolsMatch.length > 0) {
        // Use the LAST mentioned symbol for freshness, or the first one if only one
        const symbol = symbolsMatch[0].toUpperCase();
        
        // Detect context of the question
        const isTechnical = lowerInput.includes('teknikal') || lowerInput.includes('chart') || lowerInput.includes('grafik') || lowerInput.includes('analisis');
        const isFundamental = lowerInput.includes('fundamental') || lowerInput.includes('berita') || lowerInput.includes('news') || lowerInput.includes('prospek');
        const isPrediction = lowerInput.includes('prediksi') || lowerInput.includes('harga') || lowerInput.includes('target') || lowerInput.includes('profict');
        
        if (isTechnical) {
          recommendations.push(`Apa level support & resistance ${symbol} terdekat?`);
          recommendations.push(`Indikator apa yang valid untuk ${symbol} saat ini?`);
          recommendations.push(`Apakah ${symbol} sudah overbought atau oversold?`);
        } else if (isFundamental) {
          recommendations.push(`Apakah sentimen pasar terhadap ${symbol} positif?`);
          recommendations.push(`Event penting apa untuk ${symbol} minggu ini?`);
          recommendations.push(`Bandingkan fundamental ${symbol} dengan kompetitornya`);
        } else if (isPrediction) { 
          recommendations.push(`Skenario bearish untuk ${symbol} seperti apa?`);
          recommendations.push(`Faktor apa yang bisa membatalkan kenaikan ${symbol}?`);
          recommendations.push(`Target harga realistis ${symbol} akhir tahun`);
        } else {
          // General mixture if no specific context detected
          recommendations.push(`Analisis tren jangka pendek ${symbol}`);
          recommendations.push(`Berita terbaru yang mempengaruhi ${symbol}`);
          recommendations.push(`Risk/Reward ratio entry ${symbol} sekarang`);
        }
      } else {
        // No symbol detected specific recommendations
        recommendations.push('Sektor apa yang sedang menarik minggu ini?');
        recommendations.push('Analisis korelasi BTC dengan Saham Tech');
        recommendations.push('Cara manajemen risiko saat market volatile');
        recommendations.push('Top 3 altcoin potensial bulan ini');
      }
    }
    // 2. Business/Report Scenario
    else if (view === 'reports' || lowerInput.includes('laporan') || lowerInput.includes('report') || lowerInput.includes('data')) {
      recommendations.push('Identifikasi anomali data yang signifikan');
      recommendations.push('Buat visualisasi tren pertumbuhan dari data ini');
      recommendations.push('Rangkum insight utama untuk C-Level');
      recommendations.push('Proyeksikan data ini untuk kuartal depan');
    }
    // 3. General Business Admin / Strategy
    else if (lowerInput.includes('bisnis') || lowerInput.includes('strategi') || lowerInput.includes('plan') || lowerInput.includes('pemasaran')) {
      if (lowerResponse.includes('langkah')) {
        recommendations.push('Detailkan langkah pertama agar lebih praktis');
        recommendations.push('KPI apa yang harus dipantau untuk strategi ini?');
      } else {
        recommendations.push('Buatkan timeline implementasi 30 hari');
        recommendations.push('Apa bottleneck terbesar dari rencana ini?');
        recommendations.push('Estimasi budget minimal untuk eksekusi');
      }
    }
    // 4. Default / Conversational
    else {
      if (lowerResponse.length > 200) {
        recommendations.push('Persingkat penjelasan di atas (TL;DR)');
      }
      recommendations.push('Jelaskan dengan analogi sederhana');
      recommendations.push('Apa pro dan kontra dari penjelasan tadi?');
      recommendations.push('Berikan contoh nyata yang relevan');
    }
    
    // Shuffle and pick 3 unique random ones to ensure variety
    return recommendations.sort(() => 0.5 - Math.random()).slice(0, 3);
  };

  // Handle document upload
const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || !files.length) return;

  const ALLOWED_MIME = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];
  const ALLOWED_EXT = ['pdf', 'docx', 'txt', 'xls', 'xlsx', 'csv'];

  setIsUploading(true);
  setUploadStatus('uploading');
  setUploadProgress(10);
  
  // Simulate progress steps
  const progressInterval = setInterval(() => {
    setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
  }, 400);
  
  const selectedFiles = Array.from(files);
  const successfullyUploaded: {id: string, name: string, size?: number, ext?: string}[] = [];

  for (const file of selectedFiles) {
    const extension = file.name.split('.').pop()?.toLowerCase();

    // Basic Frontend Validation
    if (!ALLOWED_MIME.includes(file.type) && !ALLOWED_EXT.includes(extension || '')) {
      setToast({ type: 'error', message: `Format file "${file.name}" tidak didukung.` });
      continue;
    }

    // Size validation (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setToast({ type: 'error', message: `File "${file.name}" terlalu besar (Max 10MB).` });
      continue;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Server returned non-JSON response:', responseText.substring(0, 200));
        setUploadStatus('error');
        setToast({ type: 'error', message: 'Respon server tidak valid.' });
        continue;
      }

      if (response.ok) {
        successfullyUploaded.push({ 
          id: data.id, 
          name: file.name,
          size: file.size,
          ext: extension || 'file'
        });
        setUploadedFiles(prev => [...prev, { 
          id: data.id, 
          name: file.name,
          size: file.size,
          ext: extension || 'file'
        }]);
      } else {
        setUploadStatus('error');
        setToast({ type: 'error', message: data.message || 'Gagal mengunggah file.' });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('error');
      setToast({ type: 'error', message: 'Gagal terhubung ke server.' });
    }
  }

  clearInterval(progressInterval);
  setUploadProgress(100);

  if (successfullyUploaded.length > 0) {
    setUploadStatus('success');
    setToast({ 
      type: 'success', 
      message: successfullyUploaded.length > 1 
        ? `${successfullyUploaded.length} file berhasil diunggah!` 
        : `File "${successfullyUploaded[0].name}" siap dianalisis!` 
    });

    const fileNames = successfullyUploaded.map(f => f.name).join(', ');
    const hasSpreadsheet = successfullyUploaded.some(f => 
      ['xls', 'xlsx', 'csv', 'txt'].includes(f.name.split('.').pop()?.toLowerCase() || '')
    );
    
    // Add a system message to confirm upload and guide user
    const systemMsg: Message = {
      role: 'assistant',
      content: `📄 **${successfullyUploaded.length > 1 ? successfullyUploaded.length + ' Dokumen' : 'Dokumen'} berhasil diunggah:** ${fileNames}

Dokumen Anda siap untuk dianalisis. Silakan ketik permintaan Anda, misalnya:
${hasSpreadsheet ? `- "Analisis file ini. Kolomnya: Date, Open, High, Low, Close, Volume" *(sesuaikan dengan kolom Anda)*
- "Berapa nilai Close tertinggi dan terendah dalam data ini?"
- "Buat visualisasi line chart dari kolom Close"` : `- "Buatkan ringkasan eksekutif dari dokumen ini"
- "Analisis poin-poin utama dan temuan penting"
- "Bandingkan antara dokumen yang diunggah"`}

💡 **Tips Hasil Akurat:**
- Sebutkan nama kolom jika mengupload data tabel (CSV/Excel)
- Beri konteks jenis data (saham, penjualan, laporan, dll.)
- Semakin spesifik permintaan, semakin akurat hasilnya`,
      timestamp: new Date(),
      documentAnalysisActive: false // No auto-analysis
    };
    setMessages(prev => [...prev, systemMsg]);

    // Reset status after a delay
    setTimeout(() => setUploadStatus('idle'), 3000);
    
    // ❌ REMOVED: Auto-analyze feature
    // Now user has full control to type their specific request
  } else {
    setUploadStatus('idle');
  }

  setIsUploading(false);
  if (fileInputRef.current) fileInputRef.current.value = '';
  
  // Clear toast after 3 seconds
  setTimeout(() => setToast(null), 4000);
};

  // Handle view change to reset chat
  useEffect(() => {
    if (activeView !== 'chat' && activeView !== 'letter') {
      // Just clear messages and chatId, but KEEP the activeView
      setMessages([]);
      setCurrentChatId(null);
    }
  }, [activeView]);

  const handleSubmit = async (e: React.FormEvent | null, forcedInput?: string, isRegenerate = false) => {
    if (e) e.preventDefault();
    
    const messageContent = forcedInput || input;
    if (!messageContent.trim() || isLoading) return;

    // 🔒 Check authentication before submitting (only if Supabase is configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setShowLoginAlert(true);
        return;
      }
    }

    let newMessages = messages;
    
    const activeReplyTo = !isRegenerate ? replyingTo : (messages[messages.length - 1]?.role === 'user' ? messages[messages.length - 1].replyTo : null);

    if (!isRegenerate) {
        const userMessage: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: messageContent,
          timestamp: new Date(),
          replyTo: activeReplyTo ? {
            id: activeReplyTo.id || '',
            content: activeReplyTo.content.substring(0, 150) + (activeReplyTo.content.length > 150 ? '...' : ''),
            role: activeReplyTo.role,
          } : undefined,
        };

        newMessages = [...messages, userMessage];
        setMessages(newMessages);
    }
    setInput('');
    setReplyingTo(null); // Clear reply reference
    setIsLoading(true);

    // Create or update chat history
    let chatId = currentChatId;
    if (!chatId) {
      chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setCurrentChatId(chatId);
    }

    // Template for the assistant message (will be added when response starts)
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    
    // Show loading indicator
    setIsLoading(true);

    // 🔥 PARSER V2: Try to extract data locally first (Chart-First Architecture)
    let parserChart: ChartData | null = null;
    let parserMessage = '';
    
    // Only run parser if we are in visualization mode OR input looks like data
    const looksLikeData = /[\d]+.*(jt|juta|m|b|rb|ribu|%)/i.test(messageContent) || /(:|=).*\d/.test(messageContent);
    
    if (activeView === 'visualization' || looksLikeData) {
      try {
        console.log('🔍 Running Local Parser V2 on input...');
        const extracted = extractDataFromUserInput(messageContent);
        
        if (extracted.success && extracted.dataPoints.length > 0) {
          console.log('✅ Parser Success:', extracted.dataPoints);
          const chartResult = datasetToChartData(extracted);
          
          if (chartResult) {
            console.log('📊 Chart Generated Locally:', chartResult.chart_type);
            parserChart = {
              type: chartResult.chart_type as any,
              title: chartResult.title,
              data: chartResult.data,
              xKey: chartResult.xKey,
              yKey: chartResult.yKey,
              source: 'internal',
              error: chartResult.error
            };
            parserMessage = chartResult.message;
          }
        }
      } catch (err) {
        console.error('❌ Parser failed:', err);
      }
    }

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Build message with reply context if replying to a specific message
      let messageToSend = messageContent;
      if (activeReplyTo) {
        messageToSend = `[Merespons pesan ${activeReplyTo.role === 'user' ? 'saya' : 'AI'}: "${activeReplyTo.content}"]\n\n${messageContent}`;
      }

      // 🎨 SHORTCUT: If image mode is enabled, directly call image-gen API
      if (isImageGenEnabled) {
        console.log('🎨 [Image Mode] Generating image directly...');
        console.log('   Style:', imageStyle);
        setIsLoading(true);
        
        try {
          const imageResponse = await fetch('/api/image-gen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt: messageContent,
              style: imageStyle,
              aspectRatio: '16:9' // Default landscape for presentations
            }),
          });
          
          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.success && imageData.imageUrl) {
              console.log('✅ [Image Mode] Image generated:', imageData.imageUrl.substring(0, 100));
              
              // Get style label
              const styleLabels: Record<string, string> = {
                portrait: '👤 Portrait',
                product: '📦 Produk',
                cinematic: '🎬 Cinematic',
                anime: '🎨 Anime',
                business: '💼 Bisnis',
                minimalist: '✨ Minimalis',
                infographic: '📊 Infografis'
              };
              
              // Generate seed for reproducibility
              const seed = Math.floor(Math.random() * 999999999);
              
              // Create assistant message with image + rating system metadata
              const imageMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `🎨 **Gambar Berhasil Dibuat!**\n\n**Deskripsi:** "${messageContent}"\n**Gaya:** ${styleLabels[imageStyle] || imageStyle}`,
                timestamp: new Date(),
                imageUrl: imageData.imageUrl,
                imageMeta: {
                  seed: seed,
                  style: imageStyle,
                  originalPrompt: messageContent
                }
              };
              
              setMessages(prev => [...prev, imageMessage]);
              setIsLoading(false);
              return; // Exit early - image is generated
            }
          }
          
          // If image generation failed, show error
          const errorData = await imageResponse.json().catch(() => ({ error: 'Unknown error' }));
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `⚠️ Maaf, terjadi kendala saat membuat gambar.\n\nError: ${errorData.error || 'Gagal terhubung ke image generator'}\n\nSilakan coba lagi dengan deskripsi yang berbeda.`,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
          
        } catch (imgError: any) {
          console.error('❌ [Image Mode] Error:', imgError);
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `⚠️ Gagal membuat gambar: ${imgError.message || 'Error tidak diketahui'}\n\nSilakan coba lagi.`,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }
      }

      let response: Response;
      
      try {
        // Add timeout for long-running comparison requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
             try { controller.abort(new Error('Request timed out')); } catch(e) { controller.abort(); }
        }, 300000); // 300 second timeout (5 minutes) for local models
        
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
            body: JSON.stringify({
              message: messageToSend,
              conversationHistory,
              stream: true, // Enable streaming for faster response
              mode: getModeFromView(activeView),
              webSearch: isWebSearchEnabled,
              imageGen: isImageGenEnabled,
              fileIds: uploadedFiles.map(f => f.id),
            }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        console.error('❌ Fetch failed:', fetchError);
        
        let userFriendlyError = 'Network error: Tidak dapat terhubung ke server.';
        
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
            userFriendlyError = '⏱️ Request timeout: Server membutuhkan waktu terlalu lama untuk merespons. Silakan coba lagi.';
        } else if (fetchError.message?.includes('Failed to fetch')) {
            userFriendlyError = '🌐 Network error: Gagal terhubung ke API. Pastikan server backend berjalan.';
        } else {
             userFriendlyError = `Error: ${fetchError.message || 'Unknown network error'}`;
        }

        throw new Error(userFriendlyError);
      }

      // Check if response is OK
      if (!response.ok) {
        // Handle 401 Unauthorized - show login alert
        if (response.status === 401) {
          setShowLoginAlert(true);
          // Remove the user message and placeholder
          setMessages(messages);
          setIsLoading(false);
          return;
        }
        
        const errorData = await response.json().catch(() => ({ 
          error: 'Unknown error', 
          message: `Server error: ${response.status} ${response.statusText}` 
        }));
        throw new Error(errorData.message || errorData.error || `Server error: ${response.status}`);
      }

      // Check if response is streaming (text/event-stream) or JSON
      const contentType = response.headers.get('content-type');
      const isStreaming = contentType?.includes('text/event-stream');

      if (isStreaming) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        if (!reader) {
          throw new Error('No response body for streaming');
        }

        let isFirstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          if (isFirstChunk) {
            setIsLoading(false); // Hide loading card now that we have content
            isFirstChunk = false;
          }

          // Update message in real-time
          setMessages([
            ...newMessages,
            {
              ...assistantMessage,
              content: accumulatedContent,
            },
          ]);
        }

        // Parse structured output dari AI response
        const { parseStructuredOutput } = await import('@/lib/llm/structured-output');
        const { needsVisualization, isMarketDataRequest, extractMultipleSymbols } = await import('@/lib/llm/chart-generator');
        const { extractDataFromUserInput, datasetToChartData, validateAIAgainstParser } = await import('@/lib/llm/data-parser');
        
        const structuredOutput = parseStructuredOutput(accumulatedContent);
        const needsChart = needsVisualization(input);
        const marketInfo = isMarketDataRequest(input);
        
        // 🔥 STRICT MODE V2: Extract literal data from user input (PARSER = KING)
        const userExtractedData = extractDataFromUserInput(input);
        const hasUserProvidedData = userExtractedData.success; // Use success flag from V2
        
        console.log('📊 User Extracted Data:', userExtractedData);
        
        // 🔥 FIX: Extract symbols from BOTH user input AND AI response
        // This ensures chart is generated even if AI response doesn't mention the symbol
        const inputSymbols = extractMultipleSymbols(input);
        const responseSymbols = extractMultipleSymbols(accumulatedContent);
        
        // Combine and deduplicate symbols
        const allSymbolsMap = new Map<string, { symbol: string; type: 'crypto' | 'stock' }>();
        [...inputSymbols, ...responseSymbols].forEach(s => {
          if (!allSymbolsMap.has(s.symbol)) {
            allSymbolsMap.set(s.symbol, s);
          }
        });
        const multipleSymbols = Array.from(allSymbolsMap.values());
        
        console.log('🔍 Symbols from user input:', inputSymbols);
        console.log('🔍 Symbols from AI response:', responseSymbols);
        console.log('🔍 Combined unique symbols:', multipleSymbols);
        
        // Debug logging - EXTENSIVE
        console.log('🔍 DEBUG Chart Detection:', {
          input,
          needsChart,
          marketInfo,
          structuredOutput,
          hasUserProvidedData,
          userDataPoints: userExtractedData.dataPoints.length,
          rawResponse: accumulatedContent.substring(0, 200),
        });

        // Final message with complete content
        const finalAssistantMessage: Message = {
          ...assistantMessage,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: structuredOutput?.message || accumulatedContent,
          recommendations: generateRecommendations(input, accumulatedContent, activeView),
        };

        // 🔥 PRIORITAS 0: Local Parser Result (Chart-First Architecture)
        // This ensures chart is shown even if AI streams text-only
        if (parserChart) {
          console.log('✅✅ USING LOCAL PARSER CHART (Bypassing AI logic)');
          finalAssistantMessage.chart = parserChart;
          
          // Helper to integrate parser insight
          if (parserMessage && (!finalAssistantMessage.content || finalAssistantMessage.content.length < 50)) {
             finalAssistantMessage.content = parserMessage;
          } else if (parserMessage && !finalAssistantMessage.content.includes(parserMessage.substring(0, 20))) {
             // Append parser insight as supplementary
             finalAssistantMessage.content += `\n\n${parserMessage}`;
          }
        }

        // Helper function to fetch market data via API
        const fetchMarketChart = async (symbol: string, type: 'crypto' | 'stock', days: number = 7) => {
          console.log(`📊 Fetching market chart: ${symbol} (${type}), ${days} days`);
          
          try {
            const endpoint = type === 'crypto' ? '/api/coingecko/ohlc' : '/api/market';
            const payload: Record<string, any> = { symbol, days };
            if (endpoint === '/api/market') payload.type = type;

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            
            console.log(`📡 Market API response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => response.statusText);
              console.error('❌ Market API error response:', errorText);
              throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📦 Market API response data:', { success: data.success, hasData: !!data.data });
            
            if (!data.success) {
              throw new Error(data.message || data.error || 'Failed to fetch market data');
            }
            
            if (!data.data || !data.data.data || !Array.isArray(data.data.data)) {
              throw new Error('Invalid data format from API');
            }
            
            // Format data for candlestick chart
            const candlestickData = data.data.data
              .filter((item: any) => item && item.time && item.open && item.close) // Filter invalid data
              .map((item: any) => ({
                time: item.time,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume || 0,
              }));
            
            if (candlestickData.length === 0) {
              throw new Error('No valid data points returned from API');
            }
            
            console.log(`✅ Successfully formatted ${candlestickData.length} data points`);
            
            return {
              type: 'candlestick' as const,
              title: `${symbol} Price Chart (${days} days)`,
              data: candlestickData,
              xKey: 'time',
              yKey: 'close',
              symbol: symbol,
              currentPrice: data.data.currentPrice,
              change24h: data.data.change24h,
              asset_type: type, // Use the type parameter instead of undefined assetType
              logoUrl: data.data.logoUrl, // Logo URL langsung dari API - bisa digunakan langsung di browser
              companyName: data.data.companyName, // Nama perusahaan dari API
            };
          } catch (error: any) {
            console.error('❌ Error in fetchMarketChart:', {
              symbol,
              type,
              days,
              error: error.message,
              stack: error.stack,
            });
            
            // Wrap error dengan message yang lebih user-friendly
            if (error.message.includes('fetch failed') || error.message.includes('NetworkError')) {
              throw new Error('Network error: Tidak dapat terhubung ke server. Pastikan server berjalan.');
            } else if (error.message.includes('Failed to fetch stock data') || error.message.includes('Failed to fetch crypto data')) {
              throw new Error(`Tidak dapat mengambil data untuk ${symbol}. Pastikan simbol benar dan koneksi internet stabil.`);
            } else {
              throw error;
            }
          }
        };

        // PRIORITAS 1: Check if this is a comparison request (only when 2+ symbols AND comparison keyword)
        const hasComparisonKeyword = input.toLowerCase().includes('bandingkan') || 
                            input.toLowerCase().includes('perbandingan') ||
                            input.toLowerCase().includes('compare') ||
                            input.toLowerCase().includes('comparison') ||
                            input.toLowerCase().includes('vs') ||
                            input.toLowerCase().includes('versus');
        const isComparison = hasComparisonKeyword && multipleSymbols.length >= 2;
        
        // 🔥 FIX: Only generate chart if user EXPLICITLY asked about market data
        // Not just because symbols appear somewhere in the conversation
        const inputLower = input.toLowerCase();
        const isExplicitMarketRequest = 
          inputSymbols.length >= 1 && (
            inputLower.includes('harga') ||
            inputLower.includes('chart') ||
            inputLower.includes('grafik') ||
            inputLower.includes('analisis') ||
            inputLower.includes('analysis') ||
            inputLower.includes('pergerakan') ||
            inputLower.includes('movement') ||
            inputLower.includes('trend') ||
            inputLower.includes('price') ||
            inputLower.includes('kinerja') ||
            inputLower.includes('performance') ||
            inputLower.includes('candlestick') ||
            inputLower.includes('tampilkan') ||
            hasComparisonKeyword
          );
        
        // 🔥 PRIORITAS 1A: Only generate chart for symbols detected in USER INPUT (not AI response)
        // AND only when user is explicitly asking about market data
        if (!parserChart && inputSymbols.length >= 1 && isExplicitMarketRequest) {
          console.log(`🚀 Generating chart(s) for ${inputSymbols.length} symbol(s) from user input...`);
          
          const chartPromises = inputSymbols.map(async ({ symbol, type }) => {
            try {
              const chart = await fetchMarketChart(symbol, type, 7);
              console.log(`✅ Chart fetched for ${symbol}:`, chart);
              return chart;
            } catch (error: any) {
              console.error(`❌ Error fetching chart for ${symbol}:`, error);
              return null;
            }
          });
          
          const charts = (await Promise.all(chartPromises)).filter((chart): chart is NonNullable<typeof chart> => chart !== null) as ChartData[];
          
          if (charts.length > 0) {
            // Single symbol → use chart property
            // Multiple symbols → use charts property
            if (charts.length === 1) {
              finalAssistantMessage.chart = charts[0];
              console.log(`✅✅ Single chart added to message.chart`);
            } else {
              finalAssistantMessage.charts = charts;
              console.log(`✅✅ ${charts.length} charts added to message.charts`);
            }
            
            // Keep the AI's text response as content
            if (!finalAssistantMessage.content || finalAssistantMessage.content.trim().length === 0) {
              finalAssistantMessage.content = accumulatedContent;
            }
          }
        } else if (!parserChart && inputSymbols.length >= 1) {
          // User mentioned symbols but wasn't asking for market data
          // Don't generate chart - just let AI respond with text
          console.log(`ℹ️ Symbols found in input but user didn't ask for market data, skipping chart generation`);
        }
        // 🔥 PRIORITAS 1.5: Parser detected literal data → BYPASS AI COMPLETELY
        // Parser V2 is the ONLY source of truth for Data Visualization
        else if (userExtractedData.success && activeView === 'visualization' && !marketInfo.isMarket) {
          console.log('🚀 STRICT MODE V2: Parser detected literal data - BYPASSING AI');
          console.log('📊 Parsed data points:', userExtractedData.dataPoints);
          
          // Convert parsed data to chart format (DETERMINISTIC, no AI)
          const chartFromUserData = datasetToChartData(userExtractedData);
          
          if (chartFromUserData) {
            const userChart: ChartData = {
              type: chartFromUserData.chart_type as ChartData['type'],
              title: chartFromUserData.title,
              data: chartFromUserData.data,
              xKey: chartFromUserData.xKey,
              yKey: chartFromUserData.yKey,
              source: 'internal' as const,
            };
            
            finalAssistantMessage.chart = userChart;
            finalAssistantMessage.content = chartFromUserData.message;
            
            console.log('✅✅ Chart from PARSER (not AI) successfully rendered:', {
              labels: userExtractedData.detectedLabels,
              dataPoints: userExtractedData.dataPoints.length,
              unit: userExtractedData.detectedUnit,
            });
          } else {
            console.warn('⚠️ Parser succeeded but datasetToChartData returned null');
            finalAssistantMessage.content = accumulatedContent;
          }
        }
        // PRIORITAS 2: Handle structured output dari AI (chart)
        // PENTING: Skip jika chart sudah di-set dari PRIORITAS 1A (market chart)
        else if (!parserChart && !finalAssistantMessage.chart && !finalAssistantMessage.charts && structuredOutput?.action === 'show_chart') {
          const symbol = structuredOutput.symbol || marketInfo.symbol;
          const hasInlineData = structuredOutput.data && Array.isArray(structuredOutput.data) && structuredOutput.data.length > 0;
          
          console.log('✅ FOUND structured output - Chart info:', { 
            symbol, 
            hasInlineData, 
            dataLength: structuredOutput.data?.length,
            chartType: structuredOutput.chart_type,
            structuredOutput 
          });
          
          // 🛡️ AI MIDDLEWARE VALIDATION
          const { aiMiddleware } = await import('@/lib/llm/ai-middleware');
          const middlewareResult = aiMiddleware({
            activeModule: activeView === 'visualization' ? 'data-visualization' : 
                         activeView === 'market' ? 'market' : 
                         activeView as any,
            userInput: input,
            aiResponse: structuredOutput,
            extractedUserData: hasUserProvidedData ? {
              labels: userExtractedData.detectedLabels,
              dataPoints: userExtractedData.dataPoints.length
            } : undefined,
          });
          
          console.log('🛡️ Middleware result:', middlewareResult);
          
          // If validation FAILED → show fallback message, DON'T render chart
          if (!middlewareResult.valid) {
            console.warn('❌ AI Middleware REJECTED response:', middlewareResult.errors);
            finalAssistantMessage.content = middlewareResult.fallbackMessage || 
              'Visualisasi tidak dapat ditampilkan karena data tidak sesuai dengan konteks menu aktif.';
            // Don't set chart - let the content show the error message
          }
          // CASE A: Business Chart (has inline data, no symbol) - render directly
          else if (hasInlineData && !symbol) {
            console.log('📊 Business chart detected - rendering from inline data');
            
            // Build chart from structured output
            const businessChart: ChartData = {
              type: (structuredOutput.chart_type as ChartData['type']) || 'bar',
              title: structuredOutput.title || 'Data Visualization',
              data: (structuredOutput.data || []) as Array<Record<string, any>>,
              xKey: structuredOutput.xKey || 'name',
              yKey: structuredOutput.yKey || 'value',
              source: 'internal' as const,
            };
            
            finalAssistantMessage.chart = businessChart;
            
            // Use message from structured output if available
            if (structuredOutput.message && structuredOutput.message.trim().length > 0) {
              finalAssistantMessage.content = structuredOutput.message;
            } else {
              finalAssistantMessage.content = `Berikut adalah ${structuredOutput.chart_type || 'bar'} chart untuk data yang diminta.`;
            }
            
            console.log('✅✅ Business chart successfully added to message');
          }
          // CASE B: Market Chart (has symbol) - fetch from API
          else if (symbol) {
            const assetType = structuredOutput.asset_type || marketInfo.type || 'stock';
            const timeframe = structuredOutput.timeframe || '7d';
            const days = parseInt(timeframe.replace('d', '')) || 7;
            
            console.log('📈 Market chart detected - fetching from API:', { symbol, assetType, days });
            
            try {
              const chart = await fetchMarketChart(symbol, assetType, days);
              console.log('✅ Chart fetched from API:', chart);
              
              finalAssistantMessage.chart = chart;
              
              // Gunakan message dari structured output jika ada (analisis dari AI)
              if (structuredOutput.message && structuredOutput.message.trim().length > 0) {
                finalAssistantMessage.content = structuredOutput.message;
                console.log('✅✅ Message dari structured output:', structuredOutput.message);
              } else {
                // Fallback message jika AI tidak memberikan analisis
                finalAssistantMessage.content = `Berikut adalah ${structuredOutput.chart_type || 'candlestick'} chart untuk ${symbol}. Analisis data menunjukkan pergerakan harga dalam ${days} hari terakhir.`;
              }
              
              console.log('✅✅ Market chart successfully added to message');
            } catch (error: any) {
              console.error('❌ Error fetching chart from API:', error);
              const errorMsg = error.message || 'Unknown error';
              
              // Show error message to user (no fallback sample data)
              if (structuredOutput.message) {
                finalAssistantMessage.content = `${structuredOutput.message}\n\n⚠️ Error: ${errorMsg}`;
              } else {
                finalAssistantMessage.content = `Maaf, gagal memuat chart untuk ${symbol}.\n\nError: ${errorMsg}\n\nPastikan simbol saham benar dan koneksi internet stabil. Untuk saham Indonesia seperti GOTO, sistem akan otomatis menambahkan suffix .JK.`;
              }
            }
          } else {
            console.warn('⚠️ Structured output shows show_chart but no data or symbol found');
            // Keep original AI response
            finalAssistantMessage.content = accumulatedContent;
          }
        } 
        // PRIORITAS 2: Jika ada multiple symbols tapi tidak ada structured output, generate charts
        // PENTING: Skip jika chart sudah di-set dari PRIORITAS 1A (market chart)
        else if (!finalAssistantMessage.chart && !finalAssistantMessage.charts && multipleSymbols.length > 0 && !structuredOutput) {
          console.log(`⚠️ Multiple symbols detected but no structured output - Generating charts for ${multipleSymbols.length} symbols`);
          
          const chartPromises = multipleSymbols.map(async ({ symbol, type }) => {
            try {
              const chart = await fetchMarketChart(symbol, type, 7);
              console.log(`✅ Chart fetched for ${symbol}:`, chart);
              return chart;
            } catch (error: any) {
              console.error(`❌ Error fetching chart for ${symbol}:`, error);
              return null;
            }
          });
          
          const charts = (await Promise.all(chartPromises)).filter((chart): chart is NonNullable<typeof chart> => chart !== null) as ChartData[];
          
          if (charts.length > 0) {
            finalAssistantMessage.charts = charts;
            console.log(`✅✅ ${charts.length} charts successfully added via multiple symbols detection`);
            
            // Keep the AI's text response
            if (!finalAssistantMessage.content || finalAssistantMessage.content.trim().length === 0) {
              finalAssistantMessage.content = accumulatedContent;
            }
          }
        }
        // PRIORITAS 3: Jika market request terdeteksi TAPI tidak ada structured output, generate chart langsung (fallback agresif)
        // BUT: Only if it's a clear market request (not a business question)
        // PENTING: Skip jika chart sudah di-set dari PRIORITAS sebelumnya
        else if (!finalAssistantMessage.chart && !finalAssistantMessage.charts && !parserChart && marketInfo.isMarket && marketInfo.symbol) {
          // Additional check: Make sure it's not a business question that was misclassified
          const isBusinessQuestion = /^(aku|saya|kami|kita|perusahaan|bisnis|produk|produkku|produk saya).*(masalah|problem|issue|kurang|tidak|belum|gimana|bagaimana|tolong|bisa|mau|ingin)/i.test(input) ||
                                    /^(gimana|bagaimana|tolong|bisa|mau|ingin).*(cara|strategi|solusi|solution|analisis|analysis|masalah|problem)/i.test(input) ||
                                    /(produk|product|masalah|problem|solusi|solution|strategi|strategy|bisnis|business|perusahaan|company).*(kurang|tidak|belum|gimana|bagaimana|tolong|bisa|mau|ingin)/i.test(input);
          
          const hasBusinessWord = /(solusi|solution|kasih solusi|beri solusi|memberikan solusi)/i.test(input);
          
          if (isBusinessQuestion || hasBusinessWord) {
            console.log('⚠️ Business question detected, skipping market chart generation');
            // Don't generate chart for business questions
          } else {
            console.log('⚠️ Market request detected but no structured output - Using fallback generation:', marketInfo);
            try {
              const chart = await fetchMarketChart(
                marketInfo.symbol, 
                marketInfo.type || 'stock', 
                marketInfo.days || 7
              );
              console.log('✅ Chart fetched from fallback (market detection):', chart);
              
              finalAssistantMessage.chart = chart;
              console.log('✅✅ Chart successfully added via fallback');
              
              // Update response text untuk inform user
              if (!finalAssistantMessage.content || finalAssistantMessage.content.trim().length < 50) {
                finalAssistantMessage.content = `Berikut adalah chart untuk ${marketInfo.symbol}.`;
              }
            } catch (error: any) {
              console.error('❌ Error fetching chart from fallback:', error);
              const errorMsg = error.message || 'Unknown error';
              const errorContent = `Maaf, gagal memuat chart untuk ${marketInfo.symbol}.\n\nError: ${errorMsg}\n\nPastikan simbol saham benar dan koneksi internet stabil.`;
              
              // Update atau set content dengan error message
              if (!finalAssistantMessage.content || finalAssistantMessage.content.trim().length < 50) {
                finalAssistantMessage.content = errorContent;
              } else {
                finalAssistantMessage.content = `${finalAssistantMessage.content}\n\n${errorContent}`;
              }
            }
          }
        }
        // PRIORITAS 3: Detection biasa (untuk chart non-market) - skip karena generateVisualization tidak bisa dipanggil di client
        else if (needsChart) {
          console.log('📊 Chart needed (non-market) - will be handled by backend');
          // Non-market charts should be handled by backend
        }

        // After streaming, if comparison was detected, fetch comparison chart from backend
        if (isComparison && multipleSymbols.length >= 2 && !finalAssistantMessage.chart) {
          console.log('📊 Comparison detected but no chart in streaming response, fetching from backend...');
          
          try {
            // Make a non-streaming request to get comparison chart
            const compareResponse = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: messageContent,
                conversationHistory: conversationHistory,
                stream: false, // Disable streaming to get chart in response
              }),
            });
            
            if (compareResponse.ok) {
              const compareData = await compareResponse.json();
              console.log('📊 Comparison API response:', compareData);
              
              if (compareData.success && compareData.chart && compareData.chart.type === 'comparison') {
                finalAssistantMessage.chart = compareData.chart;
                console.log('✅✅ Comparison chart successfully fetched and added');
              }
            }
          } catch (error: any) {
            console.error('❌ Error fetching comparison chart:', error);
            // Continue without chart - user will see text response
          }
        }
        
        // 🎨 IMAGE GENERATION: If user requested image AND isImageGenEnabled, generate it
        const lowerInput = input.toLowerCase();
        const wantsImage = isImageGenEnabled && (
          // Common patterns
          lowerInput.includes('buat gambar') || 
          lowerInput.includes('buatkan gambar') || 
          lowerInput.includes('buatkan saya gambar') ||
          lowerInput.includes('generate image') ||
          lowerInput.includes('create image') ||
          // Illustration patterns (with typo handling: illustrasi vs ilustrasi)
          lowerInput.includes('ilustrasi') ||
          lowerInput.includes('illustrasi') ||
          lowerInput.includes('buat ilustrasi') ||
          lowerInput.includes('buat illustrasi') ||
          lowerInput.includes('buatkan ilustrasi') ||
          lowerInput.includes('buatkan illustrasi') ||
          lowerInput.includes('buatkan saya ilustrasi') ||
          lowerInput.includes('buatkan saya illustrasi') ||
          // Visual/picture patterns
          lowerInput.includes('gambar untuk') ||
          lowerInput.includes('gambarkan') ||
          lowerInput.includes('visualkan') ||
          lowerInput.includes('buat visual') ||
          // Simple triggers when in image mode
          lowerInput.includes('gambar') ||
          lowerInput.includes('foto') ||
          lowerInput.includes('desain') ||
          lowerInput.includes('logo') ||
          lowerInput.includes('poster') ||
          lowerInput.includes('banner')
        );
        
        if (wantsImage && !finalAssistantMessage.imageUrl) {
          console.log('🎨 [Streaming Path] User wants image, generating...');
          try {
            const imageResponse = await fetch('/api/image-gen', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: input }),
            });
            
            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              if (imageData.success && imageData.imageUrl) {
                finalAssistantMessage.imageUrl = imageData.imageUrl;
                console.log('✅ [Streaming Path] Image generated:', imageData.imageUrl.substring(0, 100));
              }
            }
          } catch (imgError) {
            console.warn('⚠️ [Streaming Path] Image generation failed:', imgError);
          }
        }
        
        const finalMessages = [...newMessages, finalAssistantMessage];
        setMessages(finalMessages);

        // Save to history
        const title = newMessages[0]?.content.substring(0, 50) || 'New Chat';
        const existingIndex = chatHistories.findIndex((h) => h.id === chatId);
        const chatHistory: ChatHistory = {
          id: chatId!,
          title,
          messages: finalMessages,
          createdAt: existingIndex >= 0 ? chatHistories[existingIndex].createdAt : new Date(),
          updatedAt: new Date(),
        };

        let updatedHistories;
        if (existingIndex >= 0) {
          updatedHistories = [...chatHistories];
          updatedHistories[existingIndex] = chatHistory;
        } else {
          updatedHistories = [chatHistory, ...chatHistories];
        }
        saveChatHistories(updatedHistories);
      } else {
        // Handle non-streaming JSON response (fallback)
        const data = await response.json().catch((parseError) => {
          console.error('JSON parse error:', parseError);
          throw new Error('Invalid response from server. Please try again.');
        });

        if (data.success) {
          const structuredOutput = data.structuredOutput;
          let responseText = data.response;
          
          // Jika ada structured output dengan message, gunakan itu
          if (structuredOutput?.message) {
            responseText = structuredOutput.message;
          }
          
          // For comparison requests, ensure chart is displayed first, then text below
          const finalAssistantMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
            chart: data.chart || undefined,
            table: data.table || undefined,
            imageUrl: data.imageUrl || undefined,
            webSearchActive: data.webSearchActive,
            documentAnalysisActive: data.documentAnalysisActive || (uploadedFiles.length > 0),
            recommendations: generateRecommendations(messageContent, responseText, activeView),
          };
          
          // Log for debugging comparison requests
          if (data.chart?.type === 'comparison') {
            console.log('📊 ChatInterface: Comparison chart detected in non-streaming response');
            console.log('📊 Chart type:', data.chart.type);
            console.log('📊 Response text length:', responseText.length);
          }
          
          // Helper function to fetch market data via API (same as streaming path)
          const fetchMarketChart = async (symbol: string, type: 'crypto' | 'stock', days: number = 7) => {
            console.log(`📊 [Non-streaming] Fetching market chart: ${symbol} (${type}), ${days} days`);
            
            try {
              const endpoint = type === 'crypto' ? '/api/coingecko/ohlc' : '/api/market';
              const payload: Record<string, any> = { symbol, days };
              if (endpoint === '/api/market') payload.type = type;

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              
              console.log(`📡 [Non-streaming] Market API response status: ${response.status}`);
              
              if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                console.error('❌ [Non-streaming] Market API error:', errorText);
                throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
              }
              
              const marketData = await response.json();
              console.log('📦 [Non-streaming] Market API response:', { success: marketData.success, hasData: !!marketData.data });
              
              if (!marketData.success) {
                throw new Error(marketData.message || marketData.error || 'Failed to fetch market data');
              }
              
              if (!marketData.data || !marketData.data.data || !Array.isArray(marketData.data.data)) {
                throw new Error('Invalid data format from API');
              }
              
              // Format data for candlestick chart
              const candlestickData = marketData.data.data
                .filter((item: any) => item && item.time && item.open && item.close)
                .map((item: any) => ({
                  time: item.time,
                  open: item.open,
                  high: item.high,
                  low: item.low,
                  close: item.close,
                  volume: item.volume || 0,
                }));
              
              if (candlestickData.length === 0) {
                throw new Error('No valid data points returned from API');
              }
              
              console.log(`✅ [Non-streaming] Successfully formatted ${candlestickData.length} data points`);
              
              return {
                type: 'candlestick' as const,
                title: `${symbol} Price Chart (${days} days)`,
                data: candlestickData,
                xKey: 'time',
                yKey: 'close',
                symbol: symbol,
                currentPrice: marketData.data.currentPrice,
                change24h: marketData.data.change24h,
                asset_type: type,
              };
            } catch (error: any) {
              console.error('❌ [Non-streaming] Error in fetchMarketChart:', {
                symbol,
                type,
                days,
                error: error.message,
              });
              
              if (error.message.includes('fetch failed') || error.message.includes('NetworkError')) {
                throw new Error('Network error: Tidak dapat terhubung ke server.');
              } else if (error.message.includes('Failed to fetch stock data') || error.message.includes('Failed to fetch crypto data')) {
                throw new Error(`Tidak dapat mengambil data untuk ${symbol}.`);
              } else {
                throw error;
              }
            }
          };

          // Jika structured output menunjukkan show_chart tapi belum ada chart, fetch via API
          if (structuredOutput?.action === 'show_chart' && !data.chart) {
            try {
              const symbol = structuredOutput.symbol;
              const assetType = structuredOutput.asset_type || 'stock';
              const timeframe = structuredOutput.timeframe || '7d';
              const days = parseInt(timeframe.replace('d', '')) || 7;
              
              if (symbol) {
                const chart = await fetchMarketChart(symbol, assetType, days);
                finalAssistantMessage.chart = chart;
                console.log('✅ Chart fetched via API (non-streaming):', chart);
              }
            } catch (error: any) {
              console.error('❌ Error fetching chart from API (non-streaming):', error);
              finalAssistantMessage.content = `${finalAssistantMessage.content}\n\nMaaf, gagal memuat chart. Error: ${error.message}`;
            }
          }
          const finalMessages = [...newMessages, finalAssistantMessage];
          setMessages(finalMessages);

          // Save to history
          const title = newMessages[0]?.content.substring(0, 50) || 'New Chat';
          const existingIndex = chatHistories.findIndex((h) => h.id === chatId);
          const chatHistory: ChatHistory = {
            id: chatId!,
            title,
            messages: finalMessages,
            createdAt: existingIndex >= 0 ? chatHistories[existingIndex].createdAt : new Date(),
            updatedAt: new Date(),
          };

          let updatedHistories;
          if (existingIndex >= 0) {
            updatedHistories = [...chatHistories];
            updatedHistories[existingIndex] = chatHistory;
          } else {
            updatedHistories = [chatHistory, ...chatHistories];
          }
          saveChatHistories(updatedHistories);
        } else {
          const errorMsg = data.message || data.error || 'Failed to get response';
          throw new Error(errorMsg);
        }
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Terjadi kesalahan saat memproses permintaan';
      
      // Handle specific error types with user-friendly messages
      if (errorMessage.includes('tidak dikonfigurasi') || errorMessage.includes('not configured')) {
        errorMessage = `⚠️ API Key tidak dikonfigurasi!\n\n` +
          `Silakan setup API key di file .env.local:\n` +
          `- Untuk Groq (gratis): LLM_PROVIDER=groq dan GROQ_API_KEY=your_key\n` +
          `- Lihat panduan di ALTERNATIF_API_GRATIS.md`;
      } else if (errorMessage.includes('API error') || errorMessage.includes('API provider')) {
        errorMessage = `⚠️ Error dari API provider:\n${errorMessage}\n\nPeriksa API key Anda atau coba provider lain.`;
      } else if (errorMessage.includes('Network error') || errorMessage.includes('network error')) {
        // Network error already has user-friendly message, keep it as is
        errorMessage = errorMessage;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorMessage = `⏱️ Request timeout: Server membutuhkan waktu terlalu lama untuk merespons.\n\n` +
          `Silakan coba lagi atau periksa koneksi internet Anda.`;
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch failed')) {
        errorMessage = `🌐 Network error: Tidak dapat terhubung ke server.\n\n` +
          `Pastikan:\n` +
          `1. Koneksi internet aktif\n` +
          `2. Server berjalan dengan baik\n` +
          `3. Coba refresh halaman`;
      }
      
      // Remove the placeholder assistant message if it exists
      const messagesWithoutPlaceholder = newMessages.filter((msg, idx) => 
        !(idx === newMessages.length && msg.role === 'assistant' && msg.content === '')
      );
      
      const errorMsg: Message = {
        role: 'assistant',
        content: `❌ ${errorMessage}`,
        timestamp: new Date(),
      };
      const finalMessages = [...messagesWithoutPlaceholder, errorMsg];
      setMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    setShowLoginAlert(false);
    // Redirect to login page
    window.location.href = '/auth/sign-in';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  if (!mounted) return null;

  return (
    <>
      <LoginAlert 
        isOpen={showLoginAlert}
        onClose={() => setShowLoginAlert(false)}
        onLogin={handleLoginClick}
      />
      <div className="flex h-screen overflow-hidden bg-[#09090b]">
        {/* State Debug Indicator (Remove in production) */}
        <div className="fixed top-0 right-0 p-1 text-[8px] text-white/5 pointer-events-none z-[1000]">
          v:{activeView} m:{messages.length}
        </div>
        <Sidebar
          onNewChat={handleNewChatAction}
          chatHistories={chatHistories}
          currentChatId={currentChatId}
          onLoadChat={loadChat}
          onDeleteChat={deleteChat}
          activeView={activeView}
          onViewChange={handleViewChange}
        />
        
        {activeView === 'letter' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-black relative">
             <div className="flex-1 overflow-y-auto p-4 md:p-8">
               <LetterGenerator />
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-black relative">
            {/* Messages Area */}
            <div className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex items-center justify-center' : ''}`} style={{ padding: '24px' }}>
              {messages.length === 0 ? (
                <>
                  {activeView === 'market' && <MarketTrendsHero setInput={setInput} />}
                  {activeView === 'reports' && <ReportGeneratorHero setInput={setInput} documents={storedDocuments} />}
                  {activeView === 'visualization' && <VisualizationHero setInput={setInput} />}
                  {activeView === 'chat' && (
                    <DefaultHero 
                      setInput={setInput} 
                      setActiveView={handleViewChange}
                      userName={profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
                      onSubmit={(e) => handleSubmit(e)}
                      inputValue={input}
                      onInputChange={handleInputChange}
                      onUploadClick={() => fileInputRef.current?.click()}
                      isWebSearchEnabled={isWebSearchEnabled}
                      setIsWebSearchEnabled={setIsWebSearchEnabled}
                      isImageGenEnabled={isImageGenEnabled}
                      setIsImageGenEnabled={setIsImageGenEnabled}
                    />
                  )}
                </>
              ) : (
                <div className="max-w-5xl mx-auto px-6 space-y-6 py-6">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      } animate-fade-in`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* AI Avatar */}
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[85%] lg:max-w-[75%] ${
                          message.role === 'user'
                            ? 'text-white px-4 py-3'
                            : 'text-gray-300 px-4 py-3'
                        }`}
                      >
                        {/* Reply Reference Indicator */}
                        {message.replyTo && (
                          <div className={`mb-3 p-2.5 rounded-lg border-l-2 ${
                            message.role === 'user' 
                              ? 'bg-black/20 border-black/40' 
                              : 'bg-blue-500/10 border-blue-500/40'
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Reply className={`w-3 h-3 ${message.role === 'user' ? 'text-black/70' : 'text-blue-400'}`} />
                              <span className={`text-xs font-medium ${message.role === 'user' ? 'text-black/70' : 'text-blue-400'}`}>
                                Membalas {message.replyTo.role === 'user' ? 'Anda' : 'AI'}
                              </span>
                            </div>
                            <p className={`text-xs line-clamp-2 ${message.role === 'user' ? 'text-black/60' : 'text-gray-400'}`}>
                              {message.replyTo.content}
                            </p>
                          </div>
                        )}
                        
                         {/* AI Orchestrator Badge Logic */}
                        {message.role === 'assistant' && (message.webSearchActive || message.documentAnalysisActive) && (
                          <div className="flex gap-2 mb-3">
                            {message.documentAnalysisActive && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
                                <FileText className="w-3 h-3 text-blue-400" />
                                <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Document Intelligence</span>
                              </div>
                            )}
                            {message.webSearchActive && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
                                <Globe className="w-3 h-3 text-blue-400" />
                                <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Web Verified</span>
                              </div>
                            )}
                          </div>
                        )}
                        {message.chart ? (
                          <div className="mb-4 -mx-6 animate-fade-in">
                            <ChartRenderer chart={message.chart} />
                          </div>
                        ) : null}
                        
                        {/* Multiple charts */}
                        {message.charts && message.charts.length > 0 && (
                          <div className="mb-4 space-y-6 -mx-6">
                            {message.charts.map((chart, idx) => (
                              <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                                <ChartRenderer chart={chart} />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {message.table && (
                          <div className="mb-4 -mx-6 animate-fade-in">
                            <DataTable table={message.table} />
                          </div>
                        )}

                        {/* Generated Image with Rating System - Only for assistant messages */}
                        {message.role === 'assistant' && message.imageUrl && (
                          <div className="mb-4 animate-fade-in">
                            {/* Image Container */}
                            <div 
                              className="relative group cursor-pointer rounded-xl overflow-hidden border border-blue-500/20 hover:border-blue-500/40 transition-all"
                              onClick={() => setLightboxImage(message.imageUrl || null)}
                            >
                              <img 
                                src={message.imageUrl} 
                                alt="Generated image"
                                className="w-full max-w-2xl rounded-xl shadow-lg"
                                loading="lazy"
                              />
                              {/* Zoom overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-8 h-8 text-white" />
                              </div>
                            </div>

                            {/* Rating System UI */}
                            {message.imageMeta && (
                              <div className="mt-4 p-4 bg-[#1a1a24]/80 rounded-xl border border-blue-500/20">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-sm text-blue-300">⭐ Bagaimana hasilnya?</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {/* Good Button */}
                                  <button
                                    onClick={() => {
                                      setToast({ type: 'success', message: '✨ Tersimpan! Prompt dan seed disimpan.' });
                                      setTimeout(() => setToast(null), 3000);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg
                                               bg-green-500/10 border border-green-500/30
                                               text-green-400 text-sm font-medium
                                               hover:bg-green-500/20 hover:border-green-500/50
                                               transition-all"
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                    <span>Good</span>
                                  </button>

                                  {/* Improve Button */}
                                  <button
                                    onClick={async () => {
                                      if (!message.imageMeta) return;
                                      setToast({ type: 'success', message: '✨ Meningkatkan kualitas gambar...' });
                                      
                                      // Call API with improve mode
                                      const response = await fetch('/api/image-gen', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          prompt: message.imageMeta.originalPrompt,
                                          style: message.imageMeta.style,
                                          seed: message.imageMeta.seed,
                                          improveMode: true
                                        }),
                                      });
                                      
                                      if (response.ok) {
                                        const data = await response.json();
                                        if (data.success && data.imageUrl) {
                                          // Update message with improved image
                                          setMessages(prev => prev.map(m => 
                                            m.id === message.id 
                                              ? { ...m, imageUrl: data.imageUrl, content: m.content + '\n\n✨ *Gambar ditingkatkan!*' }
                                              : m
                                          ));
                                        }
                                      }
                                      setTimeout(() => setToast(null), 3000);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg
                                               bg-blue-500/10 border border-blue-500/30
                                               text-blue-400 text-sm font-medium
                                               hover:bg-blue-500/20 hover:border-blue-500/50
                                               transition-all"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Improve</span>
                                  </button>

                                  {/* Regenerate Button */}
                                  <button
                                    onClick={async () => {
                                      if (!message.imageMeta) return;
                                      setToast({ type: 'success', message: '🔄 Membuat ulang gambar...' });
                                      
                                      // Call API with new seed
                                      const response = await fetch('/api/image-gen', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          prompt: message.imageMeta.originalPrompt,
                                          style: message.imageMeta.style,
                                          // No seed = new random seed
                                        }),
                                      });
                                      
                                      if (response.ok) {
                                        const data = await response.json();
                                        if (data.success && data.imageUrl) {
                                          // Update message with new image
                                          setMessages(prev => prev.map(m => 
                                            m.id === message.id 
                                              ? { 
                                                  ...m, 
                                                  imageUrl: data.imageUrl, 
                                                  content: m.content + '\n\n🔄 *Gambar dibuat ulang!*',
                                                  imageMeta: { ...m.imageMeta!, seed: Math.floor(Math.random() * 999999999) }
                                                }
                                              : m
                                          ));
                                        }
                                      }
                                      setTimeout(() => setToast(null), 3000);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg
                                               bg-blue-500/10 border border-blue-500/30
                                               text-blue-400 text-sm font-medium
                                               hover:bg-blue-500/20 hover:border-blue-500/50
                                               transition-all"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Regenerate</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {message.role === 'assistant' ? (
                          // Don't render content that duplicates image (avoid double image)
                          message.imageUrl ? (
                            <div className="text-sm text-gray-400 mt-2">
                              {/* Just show the text description, not markdown that might contain image */}
                              <p className="font-medium text-white mb-1">🎨 Gambar Berhasil Dibuat!</p>
                              <p><span className="text-gray-500">Deskripsi:</span> {message.imageMeta?.originalPrompt || 'Image generated'}</p>
                              <p><span className="text-gray-500">Gaya:</span> {message.imageMeta?.style || 'auto'}</p>
                            </div>
                          ) : (
                            <MarkdownRenderer 
                              content={message.content} 
                              className={`leading-relaxed ${(message.chart || (message.charts && message.charts.length > 0) || message.table) ? 'mt-6' : ''}`}
                            />
                          )
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        )}
                        
                        {/* Recommendations Section for AI messages */}
                        {message.role === 'assistant' && message.recommendations && message.recommendations.length > 0 && (
                          <div className="mt-5 pt-4 border-t border-blue-500/20">
                            <div className="flex items-center gap-2 mb-3">
                              <MessageCircle className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-blue-400">Pertanyaan Lanjutan</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {message.recommendations.map((rec, recIdx) => (
                                <button
                                  key={recIdx}
                                  onClick={() => setInput(rec)}
                                  className="group px-3 py-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 rounded-full text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1.5"
                                >
                                  {rec}
                                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Reply & Feedback Actions */}
                        <div className={`mt-4 pt-3 border-t flex items-center justify-between ${
                          message.role === 'user' ? 'border-black/10' : 'border-blue-500/10'
                        }`}>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setReplyingTo(message);
                                setInput(""); // Clear but focus
                              }}
                              className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                                message.role === 'user' 
                                  ? 'text-black/50 hover:text-black/80' 
                                  : 'text-gray-500 hover:text-blue-400'
                              }`}
                              title="Balas pesan ini"
                            >
                              <Reply className="w-3.5 h-3.5" />
                              <span>Balas</span>
                            </button>

                            {/* Assistant-only Actions: Regenerate, Thumbs, Copy, Share */}
                            {message.role === 'assistant' && (
                              <div className="flex items-center gap-1 border-l border-blue-500/10 pl-3 ml-1">
                                <button 
                                  onClick={() => handleRegenerate(index)}
                                  className="p-1.5 rounded hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
                                  title="Regenerate"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                
                                <button 
                                  onClick={() => handleFeedback(message.id || '', 1)}
                                  className={`p-1.5 rounded hover:bg-blue-500/10 transition-colors ${
                                    (message.id && feedbackState[message.id] === 1) ? 'text-blue-400' : 'text-gray-500 hover:text-blue-400'
                                  }`}
                                  title="Membantu"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                
                                <button 
                                  onClick={() => handleFeedback(message.id || '', -1)}
                                  className={`p-1.5 rounded hover:bg-red-500/10 transition-colors ${
                                    (message.id && feedbackState[message.id] === -1) ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
                                  }`}
                                  title="Tidak membantu"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>

                                <button 
                                  onClick={() => handleCopy(message.content)}
                                  className="p-1.5 rounded hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
                                  title="Salin"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                <button 
                                  onClick={() => handleShare(message)}
                                  className="p-1.5 rounded hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
                                  title="Bagikan"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* User-only Actions: Copy */}
                          {message.role === 'user' && (
                             <button 
                               onClick={() => handleCopy(message.content)}
                               className="p-1.5 rounded hover:bg-black/5 text-black/40 hover:text-black/70 transition-colors"
                               title="Salin"
                             >
                               <Copy className="w-3.5 h-3.5" />
                             </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-4 justify-start animate-fade-in pl-1 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                      </div>
                      <OnboardCard 
                          duration={2500}
                          step1="Analyzing Request"
                          step2="AI Processing"
                          step3="Generating Response"
                          className="scale-90 origin-top-left"
                       />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area - Sticky */}
            <div className={`sticky bottom-0 bg-black/95 backdrop-blur-xl z-10 transition-all duration-300 ${messages.length === 0 && activeView === 'chat' ? 'opacity-0 pointer-events-none translate-y-10 h-0 overflow-hidden' : 'opacity-100 p-6 h-auto'}`}>
              <div className="max-w-5xl mx-auto">
                {/* Reply Indicator */}
                {replyingTo && (
                  <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start justify-between gap-3 animate-fade-in">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Reply className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">
                          Membalas {replyingTo.role === 'user' ? 'pesan Anda' : 'AI'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {replyingTo.content.substring(0, 150)}{replyingTo.content.length > 150 ? '...' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Document Status Chip - SaaS UX with Progress Bar */}
                {uploadStatus !== 'idle' && (
                  <div className={cn(
                    "mb-3 px-4 py-3 rounded-2xl border flex flex-col gap-2 animate-fade-in backdrop-blur-xl relative overflow-hidden",
                    uploadStatus === 'uploading' ? "bg-blue-500/[0.03] border-blue-500/20 shadow-[0_4px_20px_-10px_rgba(37,99,235,0.2)]" :
                    uploadStatus === 'success' ? "bg-green-500/[0.03] border-green-500/20 shadow-[0_4px_20px_-10px_rgba(34,197,94,0.2)]" :
                    "bg-red-500/[0.03] border-red-500/20 shadow-[0_4px_20px_-10px_rgba(239,68,68,0.2)]"
                  )}>
                    {/* Simulated Progress Bar Background */}
                    {uploadStatus === 'uploading' && (
                      <div className="absolute bottom-0 left-0 h-[2px] bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                    )}
                    
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-[13px] font-medium">
                        {uploadStatus === 'uploading' ? (
                          <div className="w-5 h-5 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                        ) : uploadStatus === 'success' ? (
                          <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className={cn(
                            "leading-tight",
                            uploadStatus === 'uploading' ? "text-blue-400" :
                            uploadStatus === 'success' ? "text-green-400" :
                            "text-red-400"
                          )}>
                            {uploadStatus === 'uploading' ? "Uploading and parsing..." :
                             uploadStatus === 'success' ? "Analysis Engine Ready" :
                             "System could not process file"}
                          </span>
                          {uploadStatus === 'uploading' && <span className="text-[10px] text-gray-500">Syncing with RAG Knowledge Base...</span>}
                          {uploadStatus === 'success' && uploadedFiles.length > 0 && (
                            <span className="text-[10px] text-gray-400 italic">
                               Using context from: {uploadedFiles[uploadedFiles.length - 1].name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {uploadStatus === 'success' && (
                        <button 
                           onClick={() => setUploadStatus('idle')}
                           className="p-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-[11px] font-semibold flex items-center gap-1.5"
                        >
                          Dismiss
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      placeholder={
                        replyingTo ? `Balas ke ${replyingTo.role === 'user' ? 'pesan Anda' : 'AI'}...` :
                        isImageGenEnabled ? "Deskripsikan gambar yang ingin Anda buat..." :
                        activeView === 'market' ? "Tanyakan tentang saham, kripto, atau perbandingan..." :
                        activeView === 'reports' ? "Jelaskan laporan yang Anda butuhkan..." :
                        activeView === 'visualization' ? "Paste data atau jelaskan chart yang diinginkan..." :
                        "Apa yang ingin Anda ketahui..."
                      }
                      className={cn(
                        "w-full px-6 py-5 pr-24 bg-[#18181b] rounded-2xl focus:outline-none focus:ring-1 text-white transition-all text-lg",
                        isImageGenEnabled 
                          ? "placeholder-blue-400/60 focus:ring-blue-500/40" 
                          : "placeholder-blue-400/50 focus:ring-blue-500/30"
                      )}
                      disabled={isLoading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        className="p-2 text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/5 rounded-lg transition-all"
                      >
                        <img 
                          src="/icon/microphone.svg" 
                          alt="Mic" 
                          className="w-[22px] h-[22px]" 
                          style={{ filter: 'invert(48%) sepia(100%) saturate(8000%) hue-rotate(195deg) brightness(1.6) contrast(1.2) drop-shadow(0 0 12px rgba(37, 99, 235, 1))' }} 
                        />
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-2 transition-all group disabled:cursor-not-allowed"
                      >
                        <img 
                          src="/icon/send.svg" 
                          alt="Send" 
                          className="w-[22px] h-[22px] transition-all group-hover:scale-110" 
                          style={{ filter: 'invert(48%) sepia(100%) saturate(8000%) hue-rotate(195deg) brightness(1.6) contrast(1.2) drop-shadow(0 0 12px rgba(37, 99, 235, 1))' }} 
                        />
                      </button>
                    </div>
                  </div>
                </form>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs font-medium">
                  {/* Invisible file input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleDocumentUpload} 
                    className="hidden" 
                    multiple
                    accept=".pdf,.docx,.txt,.xls,.xlsx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
                  />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={cn(
                      "transition-all flex items-center gap-2 group border rounded-full px-5 py-2.5 backdrop-blur-sm",
                      uploadStatus === 'uploading' 
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 cursor-wait" 
                        : uploadStatus === 'success'
                        ? "bg-green-500/20 border-green-500/40 text-green-400"
                        : uploadStatus === 'error'
                        ? "bg-red-500/20 border-red-500/40 text-red-400"
                        : "bg-cyan-500/5 border-cyan-500/30 text-cyan-400/80 hover:bg-cyan-500/10 hover:border-cyan-400/60 shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]"
                    )}
                    title="Upload documents (PDF, Word, Excel, CSV) to analyze instantly"
                  >
                    {uploadStatus === 'uploading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : uploadStatus === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : uploadStatus === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <FileUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    )}
                    <span>
                      {uploadStatus === 'uploading' ? `${uploadProgress}%` : 
                       uploadStatus === 'success' ? 'Uploaded' : 
                       uploadStatus === 'error' ? 'Failed' : 
                       uploadedFiles.length > 0 ? 'Replace Document' : 'Upload Data'}
                    </span>
                  </button>

                  <button 
                    onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                    className={cn(
                      "transition-all flex items-center gap-2 group border rounded-full px-5 py-2.5 backdrop-blur-sm",
                      isWebSearchEnabled 
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                        : "bg-cyan-500/5 border-cyan-500/30 text-cyan-400/80 hover:bg-cyan-500/10 hover:border-cyan-400/60"
                    )}
                  >
                    <Globe className={cn("w-3.5 h-3.5 group-hover:scale-110 transition-transform", isWebSearchEnabled && "animate-pulse")} />
                    <span>Web Search {isWebSearchEnabled ? 'On' : ''}</span>
                  </button>

                  <button 
                    onClick={() => setIsImageGenEnabled(!isImageGenEnabled)}
                    className={cn(
                      "transition-all flex items-center gap-2 group border rounded-full px-5 py-2.5 backdrop-blur-sm",
                      isImageGenEnabled 
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                        : "bg-cyan-500/5 border-cyan-500/30 text-cyan-400/80 hover:bg-cyan-500/10 hover:border-cyan-400/60"
                    )}
                    title={isImageGenEnabled ? "Click to return to chat mode" : "Enable to generate AI images"}
                  >
                    {isImageGenEnabled ? (
                      <Paintbrush className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <img 
                        src="/icon/Image-Gen.svg" 
                        alt="AI Image" 
                        className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" 
                        style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.6))' }} 
                      />
                    )}
                    <span>{isImageGenEnabled ? 'Mode: Image' : 'AI Image'}</span>
                  </button>

                  {/* Style Selector - shows when image mode is enabled */}
                  {isImageGenEnabled && (
                    <div className="relative">
                      {/* Trigger Button */}
                      <button
                        onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                                   bg-blue-500/10
                                   border border-blue-500/30 hover:border-blue-400/60
                                   text-blue-300 text-sm font-medium
                                   transition-all duration-200"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>
                          {imageStyle === 'portrait' && 'Portrait'}
                          {imageStyle === 'product' && 'Produk'}
                          {imageStyle === 'cinematic' && 'Cinematic'}
                          {imageStyle === 'anime' && 'Anime'}
                          {imageStyle === 'business' && 'Bisnis'}
                          {imageStyle === 'minimalist' && 'Minimalis'}
                          {imageStyle === 'infographic' && 'Infografis'}
                        </span>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          showStyleDropdown && "rotate-180"
                        )} />
                      </button>

                      {/* Dropdown Menu */}
                      {showStyleDropdown && (
                        <>
                          {/* Backdrop to close dropdown */}
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowStyleDropdown(false)}
                          />
                          
                          {/* Dropdown Panel */}
                          <div className="absolute bottom-full left-0 mb-2 z-50
                                          bg-[#1a1a24]/95 backdrop-blur-xl rounded-xl
                                          border border-blue-500/20 shadow-xl
                                          min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                            
                            {/* Header */}
                            <div className="px-4 py-2.5 border-b border-white/5">
                              <p className="text-xs font-medium text-blue-400/80 uppercase tracking-wider">
                                Pilih Gaya Gambar
                              </p>
                            </div>

                            {/* Options */}
                            <div className="p-2 max-h-[300px] overflow-y-auto">
                              {[
                                { value: 'portrait', label: 'Portrait', desc: 'Foto orang/fashion' },
                                { value: 'product', label: 'Produk', desc: 'Product photography' },
                                { value: 'cinematic', label: 'Cinematic', desc: 'Movie/cyberpunk' },
                                { value: 'anime', label: 'Anime', desc: 'Anime/illustration' },
                                { value: 'business', label: 'Bisnis', desc: 'Corporate & pro' },
                                { value: 'minimalist', label: 'Minimalis', desc: 'Clean & simple' },
                                { value: 'infographic', label: 'Infografis', desc: 'Data & charts' },
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    setImageStyle(option.value as typeof imageStyle);
                                    setShowStyleDropdown(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                                    "transition-all duration-150",
                                    imageStyle === option.value 
                                      ? "bg-blue-500/20 text-blue-300" 
                                      : "hover:bg-white/5 text-white/80"
                                  )}
                                >
                                  <div className="flex-1 text-left">
                                    <p className="text-sm font-medium">
                                      {option.label}
                                    </p>
                                    <p className="text-xs text-white/40">{option.desc}</p>
                                  </div>

                                  {/* Check indicator */}
                                  {imageStyle === option.value && (
                                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                      <Check className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#1c1c21] rounded-full border border-blue-500/20 text-xs text-white/90 shadow-[0_4px_20px_-10px_rgba(37,99,235,0.3)] animate-fade-in group hover:border-blue-500/50 transition-all">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                         </div>
                         <div className="flex flex-col">
                            <span className="font-semibold text-[11px] leading-tight">
                               {uploadedFiles.length === 1 ? uploadedFiles[0].name : `${uploadedFiles.length} Active Documents`}
                            </span>
                            {uploadedFiles.length === 1 && (
                               <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">
                                  {uploadedFiles[0].ext} • {(uploadedFiles[0].size! / 1024).toFixed(1)} KB
                               </span>
                            )}
                         </div>
                      </div>
                      <div className="w-[1px] h-3 bg-white/10 mx-1" />
                      <button 
                        onClick={() => setUploadedFiles([])} 
                        className="hover:bg-red-500/20 hover:text-red-400 transition-all p-1.5 rounded-full"
                        title="Remove all documents"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Helper Text - Context Aware */}
                <div className="mt-4 text-center">
                  {isImageGenEnabled ? (
                    <p className="text-[10px] text-purple-400/70 font-medium tracking-wide">
                      💡 Tips: Deskripsikan gambar dengan detail (warna, gaya, objek) untuk hasil terbaik
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">
                      Supported formats: <span className="text-gray-400">PDF, DOCX, TXT, XLS, XLSX, CSV</span> • Max size: <span className="text-gray-400">10MB</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Toast System */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right-10 duration-300 backdrop-blur-xl",
          toast.type === 'success' 
            ? "bg-green-500/10 border-green-500/30 text-green-400" 
            : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <div className="flex flex-col">
            <p className="text-sm font-semibold tracking-wide">
              {toast.type === 'success' ? 'Berhasil' : 'Kesalahan'}
            </p>
            <p className="text-xs opacity-80">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 text-white transition-all z-10"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Image Container */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Full Size Image"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            
            {/* Bottom Actions */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    if (lightboxImage.startsWith('data:')) {
                      const response = await fetch(lightboxImage);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `oxen-ai-image-${Date.now()}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } else {
                      window.open(lightboxImage, '_blank');
                    }
                    setToast({ type: 'success', message: 'Gambar berhasil diunduh!' });
                  } catch (error) {
                    setToast({ type: 'error', message: 'Gagal mengunduh gambar' });
                  }
                }}
                className="flex items-center gap-2 px-5 py-3 bg-purple-500/20 hover:bg-purple-500/30 backdrop-blur-md rounded-xl border border-purple-500/40 text-purple-300 font-medium transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Gambar</span>
              </button>
            </div>
          </div>
          
          {/* Keyboard hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-500 text-xs">
            Tekan <kbd className="px-2 py-0.5 bg-white/10 rounded text-gray-400">Esc</kbd> untuk menutup
          </div>
        </div>
      )}
    </>
  );
}



