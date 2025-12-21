'use client';

import { useState, useRef } from 'react';
import { Copy, Download, Sparkles, RotateCcw, Upload, FileText } from 'lucide-react';
import LoginAlert from './LoginAlert';
import { createClient } from '@/lib/supabase/client';

export default function LetterGenerator() {
  const [formData, setFormData] = useState({
    letterType: '',
    recipient: '',
    subject: '',
    content: '',
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check authentication
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setShowLoginAlert(true);
        return;
      }
    }

    setIsLoading(true);
    setGeneratedLetter('');

    try {
      const response = await fetch('/api/letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.status === 401) {
        setShowLoginAlert(true);
        setIsLoading(false);
        return;
      }

      const data = await response.json().catch((parseError) => {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      });

      if (data.success) {
        setGeneratedLetter(data.letter);
      } else {
        const errorMsg = data.message || data.error || 'Failed to generate letter';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Terjadi kesalahan saat menghasilkan surat';
      
      if (errorMessage.includes('tidak dikonfigurasi') || errorMessage.includes('not configured')) {
        errorMessage = `API Key tidak dikonfigurasi. Silakan setup API key di file .env.local`;
      }
      
      setGeneratedLetter(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    alert('Surat berhasil disalin ke clipboard!');
  };

  const handleDownloadPDF = async () => {
    if (!generatedLetter) return;

    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const lines = doc.splitTextToSize(generatedLetter, maxWidth);

      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin - 10) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });

      const filename = `Letter_${formData.letterType || 'Document'}_${new Date().toISOString().split('T')[0]}.pdf`
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();

      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Terjadi kesalahan saat membuat PDF.');
    }
  };

  const handleReset = () => {
    setFormData({
      letterType: '',
      recipient: '',
      subject: '',
      content: '',
    });
    setUploadedFile(null);
    setGeneratedLetter('');
  };

  const handleLoginClick = () => {
    setShowLoginAlert(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <LoginAlert 
        isOpen={showLoginAlert}
        onClose={() => setShowLoginAlert(false)}
        onLogin={handleLoginClick}
      />
      
      <div className="min-h-full flex flex-col items-center justify-start pt-12 md:pt-20 px-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-bold italic text-cyan-400 mb-3" style={{textShadow: '0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.3)'}}>
              Letter Generator
            </h1>
            <p className="text-sm text-gray-500">
              <span className="text-cyan-400 hover:underline cursor-pointer">Feature</span>
              <span className="mx-2">/</span>
              <span>Create Letter</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Letter Type */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Letter Type
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="letterType"
                  value={formData.letterType}
                  onChange={handleChange}
                  placeholder="e.g. Business Letter, Formal Request, Invitation"
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-gray-800 rounded-lg 
                           text-white placeholder-gray-500
                           focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50
                           transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 text-gray-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Recipient & Subject - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Recipient
                </label>
                <input
                  type="text"
                  name="recipient"
                  value={formData.recipient}
                  onChange={handleChange}
                  placeholder="Enter the recipient's name or organization"
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-gray-800 rounded-lg 
                           text-white placeholder-gray-500
                           focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50
                           transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="e.g. Partnership Proposal"
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-gray-800 rounded-lg 
                           text-white placeholder-gray-500
                           focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50
                           transition-all"
                />
              </div>
            </div>

            {/* Letter Content */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Letter Content
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={5}
                placeholder="Describe what you want to say in this letter"
                className="w-full px-4 py-3 bg-[#1a1a1f] border border-gray-800 rounded-lg 
                         text-white placeholder-gray-500 resize-none
                         focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50
                         transition-all"
              />
            </div>

            {/* Upload File */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Upload File
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-cyan-400/40 rounded-lg p-8
                         flex flex-col items-center justify-center gap-3
                         cursor-pointer hover:border-cyan-400/70 transition-colors
                         bg-transparent"
              >
                <Upload className="w-8 h-8 text-gray-500" />
                <p className="text-xs text-cyan-400">
                  Max 120mb, PNG, JPEG, MP3, MP4
                </p>
                <button
                  type="button"
                  className="px-4 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-md
                           border border-cyan-400/40 hover:bg-cyan-500/30 transition-colors"
                >
                  Browse File
                </button>
                {uploadedFile && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                    <FileText className="w-4 h-4" />
                    <span>{uploadedFile.name}</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".png,.jpg,.jpeg,.mp3,.mp4,.pdf,.doc,.docx"
                className="hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-8 py-3
                         bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-medium
                         rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? 'Generating...' : 'Generate Letter'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-8 py-3
                         bg-transparent border border-cyan-400/50 text-cyan-400
                         rounded-full hover:bg-cyan-500/10 hover:border-cyan-400 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Form
              </button>
            </div>
          </form>

          {/* Generated Letter Display */}
          {generatedLetter && (
            <div className="mt-8 p-6 bg-[#1a1a1f] border border-gray-800 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Generated Letter
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 
                             bg-blue-500/10 border border-blue-500/30 text-blue-400
                             rounded-lg hover:bg-blue-500/20 transition-all text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2 
                             bg-blue-500 text-black font-medium
                             rounded-lg hover:bg-blue-400 transition-all text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono 
                            bg-black/50 p-4 rounded-lg border border-gray-800">
                {generatedLetter}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
