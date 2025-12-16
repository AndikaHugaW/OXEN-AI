'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, BarChart3, TrendingUp, FileText, Send, Sparkles, X, Paperclip, Mic, Settings, Grid3x3, PieChart, Activity } from 'lucide-react';
import Sidebar from './Sidebar';
import ChartRenderer, { ChartData } from './ChartRenderer';
import DataTable, { TableData } from './DataTable';
import LoginAlert from './LoginAlert';
import { createClient } from '@/lib/supabase/client';

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
    const assistantMessage: Message = {
      role: 'assistant',
      content: '📊 Sedang menganalisis data pasar...',
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
    // Scroll to Sign In/Sign Up buttons in navbar
    // You can customize this to navigate to a login page or open a login modal
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <LoginAlert 
        isOpen={showLoginAlert}
        onClose={() => setShowLoginAlert(false)}
        onLogin={handleLoginClick}
      />
      <div className="flex h-[calc(100vh-120px)] min-h-[750px] relative">
        {/* Sidebar */}
        <Sidebar
        onNewChat={createNewChat}
        chatHistories={chatHistories}
        currentChatId={currentChatId}
        onLoadChat={loadChat}
        onDeleteChat={deleteChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black min-h-full transition-all duration-300" style={{ marginLeft: '256px' }}>
        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex items-center justify-center' : ''}`} style={{ padding: '24px' }}>
          {messages.length === 0 ? (
            <div className="max-w-4xl w-full mx-auto text-center px-6">
              <div className="mb-10">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Hi! AI-powered growth for your business.
                </h2>
                <p className="text-2xl text-cyan-400">
                  How can I assist you today?
                </p>
              </div>
              
              {/* Suggested Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 mb-8">
                <button className="p-6 bg-gray-900 border border-cyan-500/30 rounded-2xl hover:border-cyan-500/50 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-white font-semibold">Market Trends</h3>
                  </div>
                  <p className="text-cyan-200/60 text-sm">Research market trends</p>
                </button>

                <button className="p-6 bg-gray-900 border border-cyan-500/30 rounded-2xl hover:border-cyan-500/50 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-white font-semibold">Generate Reports</h3>
                  </div>
                  <p className="text-cyan-200/60 text-sm">Create detailed reports</p>
                </button>

                <button className="p-6 bg-gray-900 border border-cyan-500/30 rounded-2xl hover:border-cyan-500/50 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <PieChart className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-white font-semibold">Data Visualization</h3>
                  </div>
                  <p className="text-cyan-200/60 text-sm">Create data visualizations</p>
                </button>
              </div>
            </div>
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
                  {/* AI Avatar - hanya untuk assistant */}
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[85%] lg:max-w-[75%] rounded-2xl backdrop-blur-xl shadow-lg ${
                      message.role === 'user'
                        ? 'bg-cyan-500 text-black border border-cyan-400/50 shadow-cyan-500/30 px-6 py-4'
                        : 'bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] border border-cyan-500/30 px-6 py-5'
                    }`}
                  >
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
                    {/* ✅ CONDITIONAL RENDER: Chart from API data (not from AI text) */}
                    {message.chart ? (
                      <div className="mb-4 -mx-6">
                        <ChartRenderer chart={message.chart} />
                      </div>
                    ) : message.content ? (
                      // If no chart, show text response
                      null // Text will be shown below
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
                    
                    {/* AI Insight Tag untuk message dari AI yang berisi analisis */}
                    {message.role === 'assistant' && message.content && message.content.trim().length > 20 && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                          <Sparkles className="w-3 h-3" />
                          AI Insight
                        </span>
                      </div>
                    )}
                    
                    <p className={`whitespace-pre-wrap ${
                      message.role === 'user' 
                        ? 'text-black text-body' 
                        : 'text-[hsl(var(--card-foreground))] text-body'
                    }`}>
                      {message.content}
                    </p>
                    
                    <span className={`text-small mt-3 block ${
                      message.role === 'user' 
                        ? 'text-black/60' 
                        : 'text-[hsl(var(--muted-foreground))]'
                    }`}>
                      {message.timestamp.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3 justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="bg-[hsl(var(--card))] rounded-2xl px-6 py-4 border border-cyan-500/30 backdrop-blur-xl">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Sticky */}
        <div className="sticky bottom-0 border-t border-cyan-500/20 bg-[hsl(var(--background))]/95 backdrop-blur-xl z-10" style={{ padding: '24px' }}>
          <div className="max-w-5xl mx-auto">
            {/* Input Field */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What do you want to know..."
                  className="w-full px-6 py-4 pr-24 bg-[hsl(var(--input))] border-2 border-cyan-500/30 rounded-2xl focus:outline-none focus:border-cyan-500 text-[hsl(var(--foreground))] placeholder-cyan-400/50 text-body transition-all"
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>

            {/* Options Bar */}
            <div className="flex items-center justify-center gap-6 mt-4 text-small">
              <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
              <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach Files</span>
              </button>
              <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                <Grid3x3 className="w-3.5 h-3.5" />
                <span>Tools</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
