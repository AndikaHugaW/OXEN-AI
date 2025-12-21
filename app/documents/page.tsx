'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Globe, Lock, BookOpen, AlertCircle, Loader2, Home } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Upload form state
  const [newDoc, setNewDoc] = useState({
    title: '',
    content: '',
    docType: 'general',
    isPublic: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const res = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setDocuments(documents.filter(doc => doc.id !== id));
      } else {
        alert('Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title || !newDoc.content) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });

      if (res.ok) {
        setIsUploadModalOpen(false);
        setNewDoc({ title: '', content: '', docType: 'general', isPublic: false });
        fetchDocuments();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred during upload');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.doc_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle navigation from sidebar menu items
  const handleViewChange = (view: 'chat' | 'letter' | 'market' | 'reports' | 'visualization') => {
    router.push(`/?view=${view}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white font-sans">
      {/* Sidebar */}
      <Sidebar 
        chatHistories={[]}
        currentChatId={null}
        onNewChat={() => { window.location.href = '/'; }}
        onLoadChat={() => {}}
        onDeleteChat={() => {}}
        activeView="chat"
        onViewChange={handleViewChange as any}
      />

       {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header Row: Title + Add Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Knowledge Base
              </h1>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] 
                         text-white font-medium rounded-xl transition-all border border-[#3f3f46]"
              >
                <Plus className="w-4 h-4" />
                New Document
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-6 border-b border-[#27272a]">
              <button className="pb-3 text-sm font-medium text-white border-b-2 border-cyan-400 -mb-px">
                All Documents
              </button>
              <button className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors">
                My Documents
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {['All', 'General', 'Policy', 'Report', 'Product', 'FAQ'].map((cat, i) => (
                <button 
                  key={cat}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    i === 0 
                      ? 'bg-white text-black' 
                      : 'text-gray-400 hover:text-white hover:bg-[#27272a]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-[#18181b] border border-[#27272a] rounded-xl text-gray-200 focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>

          {/* Doc List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed border-cyan-500/20 rounded-3xl bg-[#09090b]/50 backdrop-blur-sm hover:border-cyan-500/40 transition-colors">
                  <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                    <FileText className="w-10 h-10 text-cyan-400" />
                  </div>
              <h3 className="text-xl font-semibold text-white mb-2">No documents yet</h3>
              <p className="text-sm text-gray-400 max-w-md leading-relaxed">
                Upload business documents (Policies, SOPs, Reports) to help AI understand your company context and provide more relevant insights.
              </p>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-8 px-6 py-3 bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 
                         hover:from-cyan-400 hover:via-cyan-300 hover:to-blue-400 
                         text-white font-semibold rounded-xl transition-all duration-300
                         shadow-[0_0_25px_rgba(6,182,212,0.4)]
                         hover:shadow-[0_0_35px_rgba(6,182,212,0.6)]
                         hover:scale-[1.02] flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocs.map((doc) => {
                // Get color based on doc type
                const getTypeColor = (type: string) => {
                  switch(type) {
                    case 'policy': return 'from-blue-500/20 to-blue-600/10';
                    case 'report': return 'from-green-500/20 to-green-600/10';
                    case 'product': return 'from-purple-500/20 to-purple-600/10';
                    case 'faq': return 'from-orange-500/20 to-orange-600/10';
                    default: return 'from-gray-500/20 to-gray-600/10';
                  }
                };

                return (
                <div 
                  key={doc.id} 
                  className="group cursor-pointer"
                >
                  {/* Preview Area */}
                  <div className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${getTypeColor(doc.doc_type)} 
                                 border border-[#27272a] group-hover:border-cyan-500/40 transition-all 
                                 flex items-center justify-center relative overflow-hidden mb-3`}>
                    <div className="w-16 h-16 rounded-xl bg-white/5 backdrop-blur flex items-center justify-center border border-white/10">
                      <FileText className="w-8 h-8 text-white/60" />
                    </div>
                    {/* Type Badge */}
                    <div className="absolute top-3 right-3">
                      {doc.is_public ? (
                        <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-medium flex items-center gap-1 backdrop-blur">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-black/40 text-gray-400 text-[10px] font-medium flex items-center gap-1 backdrop-blur border border-white/10">
                          <Lock className="w-2.5 h-2.5" /> Private
                        </span>
                      )}
                    </div>
                    {/* Delete Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      className="absolute top-3 left-3 p-1.5 rounded-lg bg-black/40 text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 backdrop-blur border border-white/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Title */}
                  <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                </div>
              )})}
              </div>
            )}
          </div>
        )}
      </div>
    </main>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#27272a] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#27272a]">
              <h2 className="text-xl font-bold text-white">Upload Document</h2>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <div className="bg-[#27272a] p-1 rounded-lg">✕</div>
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Document Title</label>
                <input
                  type="text"
                  required
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                  placeholder="e.g. Company HR Handbook 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Document Type</label>
                  <select
                    value={newDoc.docType}
                    onChange={(e) => setNewDoc({...newDoc, docType: e.target.value})}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:outline-none appearance-none"
                  >
                    <option value="general">General</option>
                    <option value="policy">Policy / SOP</option>
                    <option value="report">Report</option>
                    <option value="product">Product Info</option>
                    <option value="faq">FAQ</option>
                  </select>
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1.5">Visibility</label>
                   <div className="flex items-center gap-4 h-[42px]">
                     <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                       <input
                         type="radio"
                         name="isPublic"
                         checked={!newDoc.isPublic}
                         onChange={() => setNewDoc({...newDoc, isPublic: false})}
                         className="text-blue-500 bg-[#09090b] border-[#27272a]"
                       />
                       Private
                     </label>
                     <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                       <input
                         type="radio"
                         name="isPublic"
                         checked={newDoc.isPublic}
                         onChange={() => setNewDoc({...newDoc, isPublic: true})}
                         className="text-blue-500 bg-[#09090b] border-[#27272a]"
                       />
                       Public (Team)
                     </label>
                   </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Content (Text)
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    * Paste the text content here. For PDFs, extract text first.
                  </span>
                </label>
                <textarea
                  required
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({...newDoc, content: e.target.value})}
                  className="w-full h-64 bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none font-mono text-sm leading-relaxed"
                  placeholder="Paste document content here..."
                />
              </div>

              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/70 leading-relaxed">
                  <strong>AI Context:</strong> This content will be indexed and used by the AI to answer questions related to your business. Ensure no sensitive personal data (PII) is included if public visibility is selected.
                </p>
              </div>
            </form>
            
            <div className="p-6 border-t border-[#27272a] flex justify-end gap-3">
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upload & Index'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
