// Simplified RAG service with multi-provider LLM support
// Supports: OpenAI, Groq (FREE), Hugging Face (FREE), Gemini (FREE), Ollama (FREE)

import { getLLMProvider } from './providers';

// Type definitions
interface Document {
  pageContent: string;
  metadata?: Record<string, any>;
}

interface VectorStore {
  similaritySearch(query: string, k: number): Promise<Document[]>;
  addDocuments(documents: Document[]): Promise<void>;
}

// Simple in-memory document store (fallback when LangChain is not available)
class SimpleVectorStore implements VectorStore {
  private documents: Document[] = [];

  constructor(documents: Document[] = []) {
    this.documents = documents;
  }

  async similaritySearch(query: string, k: number): Promise<Document[]> {
    // Simple keyword-based search as fallback
    const queryLower = query.toLowerCase();
    const scored = this.documents.map((doc) => {
      const content = doc.pageContent.toLowerCase();
      const score = queryLower
        .split(" ")
        .reduce((acc, word) => acc + (content.includes(word) ? 1 : 0), 0);
      return { doc, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((item) => item.doc);
  }

  async addDocuments(documents: Document[]): Promise<void> {
    this.documents.push(...documents);
  }
}

// Initialize vector store
let vectorStore: VectorStore | null = null;

/**
 * Initialize vector store with documents
 */
export async function initializeVectorStore(): Promise<VectorStore> {
  if (!vectorStore) {
    // Business-focused documents for RAG context
    const documents: Document[] = [
      {
        pageContent:
          "Format surat resmi perusahaan: kop surat dengan logo dan nama perusahaan, nomor surat, tanggal, perihal, alamat tujuan, salam pembuka, isi surat yang jelas dan to the point, salam penutup, nama dan jabatan pengirim, tanda tangan.",
        metadata: { type: "format", category: "letter", business: true },
      },
      {
        pageContent:
          "Business communication best practices: gunakan bahasa yang jelas dan profesional, hindari jargon yang tidak perlu, fokus ke tujuan komunikasi, sertakan call-to-action yang jelas, dan follow up jika perlu.",
        metadata: { type: "procedure", category: "communication", business: true },
      },
      {
        pageContent:
          "Strategi bisnis yang efektif: analisis pasar dan kompetitor, identifikasi unique value proposition, develop marketing strategy, build strong customer relationships, dan continuous improvement berdasarkan feedback.",
        metadata: { type: "strategy", category: "business", business: true },
      },
      {
        pageContent:
          "HR best practices: recruitment yang efektif dengan job description yang jelas, onboarding yang comprehensive, performance management yang fair, employee development programs, dan retention strategies.",
        metadata: { type: "procedure", category: "hr", business: true },
      },
      {
        pageContent:
          "Financial management untuk perusahaan: budgeting yang realistis, cash flow management, financial reporting yang akurat, cost control, dan investment planning untuk growth.",
        metadata: { type: "procedure", category: "finance", business: true },
      },
      {
        pageContent:
          "Marketing strategy: define target audience dengan jelas, create compelling brand message, pilih marketing channels yang tepat (digital dan traditional), measure ROI dari setiap campaign, dan adjust strategy berdasarkan data.",
        metadata: { type: "strategy", category: "marketing", business: true },
      },
      // Add more documents as needed
    ];

    // Use simple vector store (LangChain optional - can be added later if needed)
    // SimpleVectorStore uses keyword-based search which works well for small to medium datasets
    console.log("Using simple vector store for RAG");
    vectorStore = new SimpleVectorStore(documents);
  }
  return vectorStore as VectorStore;
}

/**
 * Check if query needs RAG context (skip for simple conversational queries)
 */
function needsRAGContext(query: string): boolean {
  const simpleQueryPatterns = [
    /^(hi|halo|hai|hello|hey|terima kasih|thanks|ok|oke|ya|tidak|yes|no)$/i,
    /^(apa kabar|how are you|bagaimana kabar)/i,
    /^(selamat|good|great|nice)/i,
  ];
  
  // Skip RAG for very short queries or simple greetings
  if (query.trim().length < 10) {
    return false;
  }
  
  // Skip RAG for simple conversational queries
  if (simpleQueryPatterns.some(pattern => pattern.test(query.trim()))) {
    return false;
  }
  
  // Use RAG for queries that seem to need business context
  const contextKeywords = [
    'surat', 'letter', 'format', 'prosedur', 'procedure', 'dokumen', 'document', 
    'cara', 'how to', 'bagaimana', 'strategi', 'strategy', 'bisnis', 'business',
    'perusahaan', 'company', 'marketing', 'hr', 'recruitment', 'finance', 'keuangan',
    'sales', 'customer', 'client', 'proposal', 'laporan', 'report', 'analisis', 'analysis',
    'planning', 'perencanaan', 'budget', 'anggaran', 'branding', 'brand'
  ];
  return contextKeywords.some(keyword => query.toLowerCase().includes(keyword));
}

/**
 * RAG-based chat response with optimizations for speed
 */
export async function getChatResponse(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  options?: { stream?: boolean }
): Promise<string> {
  try {
    const llmProvider = getLLMProvider();
    let context = "";

    // Only use RAG if query needs context (skip for simple queries to speed up)
    const useRAG = needsRAGContext(query);
    
    if (useRAG) {
      // Try to use RAG if available (run in parallel with provider initialization)
      try {
        const store = await initializeVectorStore();
        const relevantDocs = await store.similaritySearch(query, 2); // Reduced from 3 to 2 for speed
        if (relevantDocs.length > 0) {
          context = relevantDocs
            .map((doc) => doc.pageContent)
            .join("\n\n");
        }
      } catch (ragError) {
        console.warn("RAG retrieval failed, continuing without context:", ragError);
      }
    }

    // Build prompt with context - Business-focused with Gen-Z style
    const systemPrompt = `Kamu adalah AI assistant yang fokus banget ke bisnis dan perusahaan. Tugas kamu bantu solve masalah bisnis, bikin dokumen perusahaan, analisis data, strategi marketing, HR stuff, dan hal-hal corporate lainnya.

${
  context
    ? `Konteks yang bisa kamu pakai:\n${context}\n\n`
    : ""
}STYLE KOMUNIKASI:
- Pakai bahasa Indonesia yang casual tapi tetap profesional (gen-z vibes)
- Bisa pakai kata-kata kayak: "gas", "mantap", "keren", "beneran", "gimana", "kayaknya", "banget", "fr" (for real), "lowkey/highkey", "bet", "facts", "ngl" (not gonna lie), "tbh" (to be honest), "imo" (in my opinion)
- Tetap sopan dan respect, tapi ga kaku banget
- Kalau perlu explain sesuatu yang kompleks, break down jadi simple dan easy to understand
- Kasih solusi yang actionable dan praktis untuk bisnis
- Kalau ada data atau fakta, mention sumbernya kalau perlu

FOKUS AREA:
- Business strategy & planning
- Marketing & branding
- HR & recruitment
- Finance & accounting
- Operations & logistics
- Customer service
- Sales & business development
- Corporate communication
- Document management
- Data analysis & reporting

Jawab dengan style yang engaging tapi tetap professional ya!`;

    // Filter out system messages from history (they'll be added separately)
    const filteredHistory = conversationHistory.filter((msg) => msg.role !== "system");

    const messages = [
      { role: "system", content: systemPrompt },
      ...filteredHistory,
      { role: "user", content: query },
    ];

    const response = await llmProvider.generateResponse(messages, {
      temperature: 0.7,
    });

    return response;
  } catch (error: any) {
    console.error("Error in RAG chat response:", error);
    throw error;
  }
}

/**
 * Generate letter based on user input
 */
export async function generateLetter(
  letterType: string,
  recipient: string,
  subject: string,
  content: string,
  additionalContext?: string
): Promise<string> {
  try {
    const llmProvider = getLLMProvider();
    let context = "";

    // Try to use RAG if available
    try {
      const store = await initializeVectorStore();
      const relevantDocs = await store.similaritySearch(
        `${letterType} format official letter`,
        3
      );
      if (relevantDocs.length > 0) {
        context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");
      }
    } catch (ragError) {
      console.warn("RAG retrieval failed, continuing without context:", ragError);
    }

    const prompt = `Buatkan surat ${letterType} dengan format resmi yang benar untuk keperluan bisnis/perusahaan.

${
  context ? `Konteks format surat:\n${context}\n\n` : ""
}Detail surat:
- Tujuan: ${recipient}
- Perihal: ${subject}
- Isi: ${content}
${additionalContext ? `- Konteks tambahan: ${additionalContext}` : ""}

Buatkan surat lengkap dengan format yang benar, termasuk kop surat, salam pembuka, isi surat, salam penutup, dan tanda tangan. Pastikan tone-nya professional tapi tetap natural.`;

    const messages = [
      {
        role: "system",
        content:
          "Kamu adalah expert dalam membuat surat resmi untuk bisnis dan perusahaan. Format harus benar dan professional, tapi bahasa bisa natural dan tidak terlalu kaku. Fokus ke kejelasan dan efektivitas komunikasi bisnis.",
      },
      { role: "user", content: prompt },
    ];

    const response = await llmProvider.generateResponse(messages, {
      temperature: 0.7,
    });

    return response;
  } catch (error) {
    console.error("Error generating letter:", error);
    throw error;
  }
}

/**
 * Add documents to the vector store
 */
export async function addDocuments(documents: Document[]): Promise<void> {
  const store = await initializeVectorStore();
  await store.addDocuments(documents);
}
