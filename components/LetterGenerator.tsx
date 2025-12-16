'use client';

import { useState, useEffect } from 'react';
import { Copy, Download } from 'lucide-react';
import LoginAlert from './LoginAlert';
import { createClient } from '@/lib/supabase/client';

export default function LetterGenerator() {
  const [formData, setFormData] = useState({
    letterType: '',
    recipient: '',
    subject: '',
    content: '',
    additionalContext: '',
  });
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const supabase = createClient();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔒 Check authentication before submitting (only if Supabase is configured)
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

      // Handle 401 Unauthorized - show login alert
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
      
      // Provide helpful messages for common errors
      if (errorMessage.includes('tidak dikonfigurasi') || errorMessage.includes('not configured')) {
        errorMessage = `⚠️ API Key tidak dikonfigurasi!\n\n` +
          `Silakan setup API key di file .env.local:\n` +
          `- Untuk Groq (gratis): LLM_PROVIDER=groq dan GROQ_API_KEY=your_key\n` +
          `- Lihat panduan di ALTERNATIF_API_GRATIS.md`;
      } else if (errorMessage.includes('Ollama') || errorMessage.includes('tidak dapat terhubung')) {
        // Error message sudah informatif dari provider, langsung gunakan
        errorMessage = errorMessage;
      }
      
      setGeneratedLetter(`❌ Error: ${errorMessage}`);
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
      // Dynamic import untuk jsPDF (client-side only)
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Set font
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      // Split text into lines that fit the page width
      const lines = doc.splitTextToSize(generatedLetter, maxWidth);

      // Add lines to PDF
      lines.forEach((line: string) => {
        // Check if we need a new page
        if (yPosition > pageHeight - margin - 10) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7; // Line height
      });

      // Generate filename
      const filename = `Surat_${formData.letterType || 'Surat'}_${formData.subject || 'Document'}_${new Date().toISOString().split('T')[0]}.pdf`
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();

      // Save PDF
      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Terjadi kesalahan saat membuat PDF. Silakan coba lagi.');
    }
  };

  const handleReset = () => {
    setFormData({
      letterType: '',
      recipient: '',
      subject: '',
      content: '',
      additionalContext: '',
    });
    setGeneratedLetter('');
  };

  const handleLoginClick = () => {
    setShowLoginAlert(false);
    // Scroll to Sign In/Sign Up buttons in navbar
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <LoginAlert 
        isOpen={showLoginAlert}
        onClose={() => setShowLoginAlert(false)}
        onLogin={handleLoginClick}
      />
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-lg bg-[hsl(var(--card))]/50 backdrop-blur-md border border-[hsl(var(--border))]/50">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[hsl(var(--card-foreground))] mb-2">
            Jenis Surat <span className="text-[hsl(var(--destructive))]">*</span>
          </label>
          <select
            name="letterType"
            value={formData.letterType}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-[hsl(var(--border))]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] bg-[hsl(var(--input))]/50 backdrop-blur-sm text-[hsl(var(--card-foreground))] placeholder:text-[hsl(var(--muted-foreground))] transition-all hover:bg-[hsl(var(--input))]/70 focus:bg-[hsl(var(--input))]/70"
          >
            <option value="">Pilih jenis surat...</option>
            <option value="resmi">Surat Resmi</option>
            <option value="undangan">Surat Undangan</option>
            <option value="pengantar">Surat Pengantar</option>
            <option value="permohonan">Surat Permohonan</option>
            <option value="keterangan">Surat Keterangan</option>
            <option value="pernyataan">Surat Pernyataan</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[hsl(var(--card-foreground))] mb-2">
            Penerima / Tujuan <span className="text-[hsl(var(--destructive))]">*</span>
          </label>
          <input
            type="text"
            name="recipient"
            value={formData.recipient}
            onChange={handleChange}
            required
            placeholder="Contoh: Kepala Dinas..."
            className="w-full px-4 py-2.5 border border-[hsl(var(--border))]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] bg-[hsl(var(--input))]/50 backdrop-blur-sm text-[hsl(var(--card-foreground))] placeholder:text-[hsl(var(--muted-foreground))] transition-all hover:bg-[hsl(var(--input))]/70 focus:bg-[hsl(var(--input))]/70"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[hsl(var(--card-foreground))] mb-2">
            Perihal <span className="text-[hsl(var(--destructive))]">*</span>
          </label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            placeholder="Contoh: Permohonan Izin..."
            className="w-full px-4 py-2.5 border border-[hsl(var(--border))]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] bg-[hsl(var(--input))]/50 backdrop-blur-sm text-[hsl(var(--card-foreground))] placeholder:text-[hsl(var(--muted-foreground))] transition-all hover:bg-[hsl(var(--input))]/70 focus:bg-[hsl(var(--input))]/70"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[hsl(var(--card-foreground))] mb-2">
            Isi Surat <span className="text-[hsl(var(--destructive))]">*</span>
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Jelaskan isi surat yang ingin dibuat..."
            className="w-full px-4 py-2.5 border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] bg-[hsl(var(--input))] text-[hsl(var(--card-foreground))] placeholder:text-[hsl(var(--muted-foreground))] resize-none transition-colors"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[hsl(var(--card-foreground))] mb-2">
            <span>Konteks Tambahan</span> <span className="text-[hsl(var(--muted-foreground))] text-xs">(Opsional)</span>
          </label>
          <textarea
            name="additionalContext"
            value={formData.additionalContext}
            onChange={handleChange}
            rows={2}
            placeholder="Informasi tambahan yang mungkin diperlukan..."
            className="w-full px-4 py-2.5 border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] bg-[hsl(var(--input))] text-[hsl(var(--card-foreground))] placeholder:text-[hsl(var(--muted-foreground))] resize-none transition-colors"
          />
        </div>

        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary))]/90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
          >
            {isLoading ? 'Membuat Surat...' : 'Generate Surat'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg hover:bg-[hsl(var(--secondary))]/80 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))] transition-all font-medium"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Generated Letter Display */}
      {generatedLetter && (
        <div className="mt-6 p-6 bg-[hsl(var(--card))]/50 backdrop-blur-md border border-[hsl(var(--border))]/50 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[hsl(var(--card-foreground))]">
              Surat yang Dihasilkan
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary))]/90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))] transition-all text-sm font-medium flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>Salin</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))] transition-all text-sm font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-[hsl(var(--card-foreground))] font-mono bg-[hsl(var(--input))]/50 backdrop-blur-sm p-4 rounded-lg border border-[hsl(var(--border))]/50">
              {generatedLetter}
            </pre>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

