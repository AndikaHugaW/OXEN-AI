'use client';

import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    const streamingMessages = [...newMessages, assistantMessage];
    setMessages(streamingMessages);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/chat', {
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

        // Final message with complete content
        const finalMessages = [
          ...newMessages,
          {
            ...assistantMessage,
            content: accumulatedContent,
          },
        ];
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
          const finalAssistantMessage: Message = {
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
          };
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
      
      if (errorMessage.includes('tidak dikonfigurasi') || errorMessage.includes('not configured')) {
        errorMessage = `⚠️ API Key tidak dikonfigurasi!\n\n` +
          `Silakan setup API key di file .env.local:\n` +
          `- Untuk Groq (gratis): LLM_PROVIDER=groq dan GROQ_API_KEY=your_key\n` +
          `- Lihat panduan di ALTERNATIF_API_GRATIS.md`;
      } else if (errorMessage.includes('API error')) {
        errorMessage = `⚠️ Error dari API provider:\n${errorMessage}\n\nPeriksa API key Anda atau coba provider lain.`;
      }
      
      const errorMsg: Message = {
        role: 'assistant',
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
      <div className="flex-1 ml-64 flex flex-col bg-black min-h-full">
        {/* Header with New Chat Button */}
        <div className="flex justify-end p-4 border-b border-cyan-500/20">
          <button
            onClick={createNewChat}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-8 py-12">
          {messages.length === 0 ? (
            <div className="max-w-4xl mx-auto text-center">
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-white mb-3">
                  Hi, good to see you!
                </h2>
                <p className="text-2xl text-cyan-400">
                  How can I assist you today?
                </p>
              </div>
              
              {/* Suggested Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 mb-8">
                <button className="p-6 bg-gray-900 border border-cyan-500/30 rounded-2xl hover:border-cyan-500/50 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Market Trends</h3>
                  </div>
                  <p className="text-cyan-200/60 text-sm">Research market trends</p>
                </button>

                <button className="p-6 bg-gray-900 border border-cyan-500/30 rounded-2xl hover:border-cyan-500/50 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Generate Reports</h3>
                  </div>
                  <p className="text-cyan-200/60 text-sm">Create detailed reports</p>
                </button>

                <button className="p-6 bg-gray-900 border border-cyan-500/30 rounded-2xl hover:border-cyan-500/50 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Data Visualization</h3>
                  </div>
                  <p className="text-cyan-200/60 text-sm">Create data visualizations</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] lg:max-w-[80%] rounded-2xl px-6 py-4 backdrop-blur-xl shadow-lg ${
                      message.role === 'user'
                        ? 'bg-cyan-500 text-black border border-cyan-400/50 shadow-cyan-500/30'
                        : 'bg-gray-900 text-gray-100 border border-cyan-500/30'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <span className={`text-xs mt-2 block ${
                      message.role === 'user' ? 'text-black/70' : 'text-cyan-400/60'
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
                <div className="flex justify-start">
                  <div className="bg-gray-900 rounded-2xl px-6 py-4 border border-cyan-500/30 backdrop-blur-xl">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-cyan-500/20 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Input Field */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What do you want to know..."
                  className="w-full px-6 py-4 pr-24 bg-black border-2 border-cyan-500/30 rounded-2xl focus:outline-none focus:border-cyan-500 text-white placeholder-cyan-400/50 text-lg transition-all"
                  disabled={isLoading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 text-cyan-400/60 hover:text-cyan-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
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
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
              <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Attach Files</span>
              </button>
              <button className="text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Tools</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
