'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, BarChart3, TrendingUp, FileText, Send, Sparkles, X, Paperclip, Mic, Settings, Grid3x3, PieChart, Activity, Share2, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import ChartRenderer, { ChartData } from './ChartRenderer';
import DataTable, { TableData } from './DataTable';
import LoginAlert from './LoginAlert';
import { createClient } from '@/lib/supabase/client';
import LetterGenerator from './LetterGenerator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chart?: ChartData;
  charts?: ChartData[]; // Support multiple charts
  table?: TableData;
  imageUrl?: string;
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
  const [activeView, setActiveView] = useState<'chat' | 'letter' | 'market' | 'reports' | 'visualization'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

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

  // Save chat histories to localStorage
  const saveChatHistories = (histories: ChatHistory[]) => {
    localStorage.setItem('chatHistories', JSON.stringify(histories));
    setChatHistories(histories);
  };

  // Create new chat
  const createNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
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

  // Handle view change to reset chat or set initial context
  useEffect(() => {
    if (activeView !== 'chat' && activeView !== 'letter') {
      createNewChat();
      
      // Optional: Set initial greeting based on view
      let initialMessage = '';
      if (activeView === 'market') {
        initialMessage = "👋 **Welcome to Market Trends Analysis!**\n\nI can help you with:\n- analyzing stock & crypto performance\n- comparing assets (e.g., BTC vs ETH)\n- providing market insights.\n\nWhat market would you like to explore today?";
      } else if (activeView === 'reports') {
         initialMessage = "👋 **Welcome into Report Generator.**\n\nI can help you create professional reports for:\n- Startups\n- Agencies\n- Corporate Business\n\nWhat kind of report do you need?";
      } else if (activeView === 'visualization') {
         initialMessage = "👋 **Data Visualization Studio.**\n\nPlease provide the data you'd like to visualize, or describe the chart you need. I can create:\n- Bar/Line/Pie Charts\n- Comparison Graphs\n- Trend Analysis";
      }

      if (initialMessage) {
        setMessages([{
          role: 'assistant',
          content: initialMessage,
          timestamp: new Date()
        }]);
      }
    }
  }, [activeView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 🔒 Check authentication before submitting (only if Supabase is configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setShowLoginAlert(true);
        return;
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create or update chat history
    let chatId = currentChatId;
    if (!chatId) {
      chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setCurrentChatId(chatId);
    }

    // Create placeholder for streaming response
    // ✅ UX TRICK: Send partial response immediately
    // Dynamic loading message
    let loadingText = 'Thinking...';
    if (activeView === 'market') loadingText = '📊 Analyzing market data...';
    else if (activeView === 'reports') loadingText = '📝 Generating report...';
    else if (activeView === 'visualization') loadingText = '📈 Visualizing data...';
    else loadingText = '🤖 Thinking...';

    const assistantMessage: Message = {
      role: 'assistant',
      content: loadingText,
      timestamp: new Date(),
    };
    const streamingMessages = [...newMessages, assistantMessage];
    setMessages(streamingMessages);
    
    // Show loading indicator
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      let response: Response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            conversationHistory,
            stream: true, // Enable streaming for faster response
            mode: getModeFromView(activeView),
          }),
        });
      } catch (fetchError: any) {
        console.error('❌ Fetch failed:', fetchError);
        
        // Detect specific network error types
        const errorMsg = fetchError.message || '';
        let userFriendlyError = 'Network error: Tidak dapat terhubung ke server.';
        
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('ERR_INTERNET_DISCONNECTED')) {
          userFriendlyError = 'Network error: Tidak dapat terhubung ke server. Pastikan:\n' +
            '1. Koneksi internet Anda aktif\n' +
            '2. Server berjalan dengan baik\n' +
            '3. Tidak ada firewall yang memblokir koneksi';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT')) {
          userFriendlyError = 'Network error: Request timeout. Server mungkin sedang sibuk atau koneksi lambat. Silakan coba lagi.';
        } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connection refused')) {
          userFriendlyError = 'Network error: Server menolak koneksi. Pastikan server berjalan di localhost:3000.';
        } else if (errorMsg.includes('CORS') || errorMsg.includes('cors')) {
          userFriendlyError = 'Network error: Masalah CORS. Pastikan server dikonfigurasi dengan benar.';
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

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
        
        const structuredOutput = parseStructuredOutput(accumulatedContent);
        const needsChart = needsVisualization(input);
        const marketInfo = isMarketDataRequest(input);
        
        // Extract multiple symbols dari text response (untuk handle multiple charts)
        const multipleSymbols = extractMultipleSymbols(accumulatedContent);
        console.log('🔍 Multiple symbols detected:', multipleSymbols);
        
        // Debug logging - EXTENSIVE
        console.log('🔍 DEBUG Chart Detection:', {
          input,
          needsChart,
          marketInfo,
          structuredOutput,
          rawResponse: accumulatedContent.substring(0, 200),
        });

        // Final message with complete content
        const finalAssistantMessage: Message = {
          ...assistantMessage,
          content: structuredOutput?.message || accumulatedContent,
        };

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

        // PRIORITAS 1: Check if this is a comparison request
        const isComparison = input.toLowerCase().includes('bandingkan') || 
                            input.toLowerCase().includes('perbandingan') ||
                            input.toLowerCase().includes('compare') ||
                            input.toLowerCase().includes('comparison') ||
                            input.toLowerCase().includes('vs') ||
                            input.toLowerCase().includes('versus') ||
                            (multipleSymbols.length >= 2);
        
        // PRIORITAS 1A: Handle comparison request (multiple symbols = comparison chart)
        // Note: Comparison chart should come from /api/chat response, not separate API call
        // The market-analysis-handler will detect comparison and return comparison chart
        if (isComparison && multipleSymbols.length >= 2) {
          console.log(`📊 Comparison request detected with ${multipleSymbols.length} symbols`);
          console.log('📊 Note: Comparison chart should be included in /api/chat response');
          // Chart will be handled below when checking response data
        }
        // PRIORITAS 1B: Handle multiple symbols (untuk multiple individual charts, bukan comparison)
        else if (multipleSymbols.length > 1 && !isComparison) {
          console.log(`✅ Multiple symbols detected (${multipleSymbols.length}), generating charts for each...`);
          
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
            console.log(`✅✅ ${charts.length} charts successfully added to message`);
            
            // Keep the AI's text response as content
            if (!finalAssistantMessage.content || finalAssistantMessage.content.trim().length === 0) {
              finalAssistantMessage.content = accumulatedContent;
            }
          }
        }
        // PRIORITAS 2: Handle structured output dari AI (single chart)
        else if (structuredOutput?.action === 'show_chart') {
          const symbol = structuredOutput.symbol || marketInfo.symbol;
          const assetType = structuredOutput.asset_type || marketInfo.type || 'stock';
          const timeframe = structuredOutput.timeframe || '7d';
          const days = parseInt(timeframe.replace('d', '')) || 7;
          
          console.log('✅ FOUND structured output - Rendering chart:', { symbol, assetType, days, structuredOutput });
          
          if (symbol) {
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
              
              console.log('✅✅ Chart successfully added to message');
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
            console.warn('⚠️ Structured output shows show_chart but no symbol found');
          }
        } 
        // PRIORITAS 2: Jika ada multiple symbols tapi tidak ada structured output, generate charts
        else if (multipleSymbols.length > 0 && !structuredOutput) {
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
        else if (marketInfo.isMarket && marketInfo.symbol) {
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
                message: input,
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
          // Parse structured output jika ada
          const structuredOutput = data.structuredOutput;
          let responseText = data.response;
          
          // Jika ada structured output dengan message, gunakan itu
          if (structuredOutput?.message) {
            responseText = structuredOutput.message;
          }
          
          // For comparison requests, ensure chart is displayed first, then text below
          const finalAssistantMessage: Message = {
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
            chart: data.chart || undefined,
            table: data.table || undefined,
            imageUrl: data.imageUrl || undefined,
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

  return (
    <>
      <LoginAlert 
        isOpen={showLoginAlert}
        onClose={() => setShowLoginAlert(false)}
        onLogin={handleLoginClick}
      />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#09090b]">
        <Sidebar
          onNewChat={createNewChat}
          chatHistories={chatHistories}
          currentChatId={currentChatId}
          onLoadChat={loadChat}
          onDeleteChat={deleteChat}
          activeView={activeView}
          onViewChange={setActiveView}
        />
        
        {activeView === 'letter' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b] relative">
            {/* Header for Letter Generator */}
             <div className="border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md p-4 flex items-center justify-between z-10 sticky top-0">
               <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-white">Letter Generator</h2>
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                  <LetterGenerator />
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-black relative">
            {/* Messages Area */}
            <div className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex items-center justify-center' : ''}`} style={{ padding: '24px' }}>
              {messages.length === 0 ? (
                <>
                  {activeView === 'market' && <MarketTrendsHero setInput={setInput} />}
                  {activeView === 'reports' && <ReportGeneratorHero setInput={setInput} />}
                  {activeView === 'visualization' && <VisualizationHero setInput={setInput} />}
                  {activeView === 'chat' && <DefaultHero setInput={setInput} setActiveView={setActiveView} />}
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
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[85%] lg:max-w-[75%] rounded-2xl backdrop-blur-xl shadow-lg ${
                          message.role === 'user'
                            ? 'bg-cyan-500 text-black border border-cyan-400/50 shadow-cyan-500/30 px-6 py-4'
                            : 'bg-[#18181b] text-gray-300 border border-cyan-500/30 px-6 py-5'
                        }`}
                      >
                        {/* Visualization Rendering */}
                        {message.imageUrl && (
                          <div className="mb-4 rounded-lg overflow-hidden">
                            <img
                              src={message.imageUrl}
                              alt="Visualization"
                              className="w-full h-auto rounded-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {message.chart ? (
                          <div className="mb-4 -mx-6">
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
                          <div className="mb-4 -mx-6">
                            <DataTable table={message.table} />
                          </div>
                        )}
                        
                        {/* AI Insight Tag */}
                        {message.role === 'assistant' && message.content && message.content.trim().length > 20 && (
                          <div className="mb-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                              <Sparkles className="w-3 h-3" />
                              AI Insight
                            </span>
                          </div>
                        )}
                        
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-3 justify-start animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="bg-[#18181b] rounded-2xl px-6 py-4 border border-cyan-500/30 backdrop-blur-xl">
                        <div className="typing-indicator flex gap-1">
                          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area - Sticky */}
            <div className="sticky bottom-0 border-t border-cyan-500/20 bg-black/95 backdrop-blur-xl z-10" style={{ padding: '24px' }}>
              <div className="max-w-5xl mx-auto">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      placeholder={
                        activeView === 'market' ? "Ask about stocks, crypto, or comparisons..." :
                        activeView === 'reports' ? "Describe the report you need..." :
                        activeView === 'visualization' ? "Paste your data or describe a chart..." :
                        "What do you want to know..."
                      }
                      className="w-full px-6 py-4 pr-24 bg-[#18181b] border-2 border-cyan-500/30 rounded-2xl focus:outline-none focus:border-cyan-500 text-white placeholder-cyan-400/50 transition-all"
                      disabled={isLoading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        className="p-2 text-cyan-400/60 hover:text-cyan-400 transition-colors"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </form>

                {/* Options Bar */}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </button>
                  <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                  <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Notifications</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}



// --- Helper Components for Hero Sections ---

const MarketTrendsHero = ({ setInput }: { setInput: (s: string) => void }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
    <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mb-6 border border-cyan-500/20 shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]">
       <Activity className="w-10 h-10 text-cyan-400" />
    </div>
    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
       Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Intelligence</span>
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
            className="p-6 bg-[#18181b] border border-white/5 rounded-2xl hover:border-cyan-500/50 hover:bg-white/5 transition-all text-left group relative overflow-hidden">
            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-3 relative z-10">
               <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
               </div>
               <h3 className="font-semibold text-white">{item.title}</h3>
            </div>
            <p className="text-sm text-gray-400 group-hover:text-gray-300 relative z-10">{item.desc}</p>
         </button>
       ))}
    </div>
  </div>
);

const ReportGeneratorHero = ({ setInput }: { setInput: (s: string) => void }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
    <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]">
       <FileText className="w-10 h-10 text-indigo-400" />
    </div>
    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
       Professional <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Reports</span>
    </h1>
    <p className="text-lg text-gray-400 mb-12 max-w-2xl leading-relaxed">
       Generate comprehensive business reports, proposals, and analysis documents tailored to your needs.
    </p>
    
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

const VisualizationHero = ({ setInput }: { setInput: (s: string) => void }) => (
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

const DefaultHero = ({ setInput, setActiveView }: { setInput: (s: string) => void, setActiveView: (v: any) => void }) => (
    <div className="max-w-4xl w-full mx-auto text-center px-6 animate-fade-in">
        <div className="mb-10">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">
               Next Gen 
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 block mt-2">
               Intelligence
            </span>
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Sistem analitik berbasis AI untuk pengambilan keputusan bisnis yang lebih cepat dan akurat.
        </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 mb-8">
            <button onClick={() => setActiveView('market')} className="group p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all text-left">
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <Activity className="w-5 h-5 text-cyan-400" />
                </div>
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Market Trends</h3>
            <p className="text-sm text-gray-500">Real-time market insights</p>
            </button>

            <button onClick={() => setActiveView('reports')} className="group p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl hover:border-indigo-500/30 hover:bg-white/[0.02] transition-all text-left">
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Generate Reports</h3>
            <p className="text-sm text-gray-500">Automated business reports</p>
            </button>

            <button onClick={() => setActiveView('visualization')} className="group p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl hover:border-pink-500/30 hover:bg-white/[0.02] transition-all text-left">
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                <PieChart className="w-5 h-5 text-pink-400" />
                </div>
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Data Viz</h3>
            <p className="text-sm text-gray-500">Interactive charts</p>
            </button>
        </div>
    </div>
);
