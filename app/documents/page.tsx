'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, Globe, Lock, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

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

  return (
    <div className="flex-1 h-screen overflow-hidden bg-[#09090b] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Knowledge Base
            </h1>
            <p className="text-xs text-gray-400">Manage documents for AI context</p>
          </div>
        </div>

      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Hero Section */}
          <section className="text-center space-y-4 animate-fade-in py-8">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/20 shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]">
              <BookOpen className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Enterprise <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Knowledge Base</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Upload and manage your business intelligence. This data powers the AI's understanding of your specific company policies, products, and operational procedures.
            </p>
          </section>

          {/* Search & Actions Area */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search your business intelligence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-[#18181b]/50 backdrop-blur-sm border border-[#27272a] rounded-2xl text-gray-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
                />
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="h-14 flex items-center justify-center gap-2 px-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-2xl shadow-lg shadow-cyan-500/20 transition-all shrink-0 active:scale-[0.98]"
              >
                <Plus className="w-5 h-5" />
                Add New Document
              </button>
            </div>
          </div>

          {/* Doc List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documentation Repository ({filteredDocs.length})
                </h3>
              </div>
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed border-[#27272a] rounded-3xl bg-[#09090b]/50 backdrop-blur-sm">
                  <div className="w-20 h-20 rounded-full bg-[#18181b] flex items-center justify-center mb-6 border border-white/5">
                    <FileText className="w-10 h-10 text-gray-600" />
                  </div>
              <h3 className="text-lg font-medium text-white mb-1">No documents found</h3>
              <p className="text-sm text-gray-400 max-w-sm">
                Upload business documents (Policies, SOPs, Reports) to help AI understand your context.
              </p>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-6 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
              >
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="bg-[#18181b] border border-[#27272a] hover:border-cyan-500/30 transition-all group overflow-hidden">
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.is_public ? (
                          <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-medium flex items-center gap-1 border border-green-500/20">
                            <Globe className="w-3 h-3" /> Public
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-[#27272a] text-gray-400 text-xs font-medium flex items-center gap-1 border border-white/5">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-base font-semibold text-white mb-2 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                      {doc.title}
                    </h3>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                      <span className="text-xs text-gray-500 capitalize">
                        {doc.doc_type.replace('_', ' ')}
                      </span>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
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
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none"
                  placeholder="e.g. Company HR Handbook 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Document Type</label>
                  <select
                    value={newDoc.docType}
                    onChange={(e) => setNewDoc({...newDoc, docType: e.target.value})}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none appearance-none"
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
                         className="text-cyan-500 bg-[#09090b] border-[#27272a]"
                       />
                       Private
                     </label>
                     <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                       <input
                         type="radio"
                         name="isPublic"
                         checked={newDoc.isPublic}
                         onChange={() => setNewDoc({...newDoc, isPublic: true})}
                         className="text-cyan-500 bg-[#09090b] border-[#27272a]"
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
                  className="w-full h-64 bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none font-mono text-sm leading-relaxed"
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
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
  );
}
