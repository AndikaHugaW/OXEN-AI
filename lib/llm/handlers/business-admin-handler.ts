// MODE_BUSINESS_ADMIN Handler
// Handles business administration requests with:
// 1. Context Analyzer (RAG)
// 2. LLaMA (Business Prompt)

import { getLLMProvider } from '../providers';
import { initializeVectorStore } from '../rag-service';
import { AIRequestContext, AIRequestResponse, RequestMode, getGlobalPromptRules } from '../ai-request-router';

/**
 * Context Analyzer - Analyzes query and retrieves relevant business context via RAG
 */
async function analyzeContext(query: string): Promise<string> {
  console.log('🔍 [Business Handler] Analyzing context...');

  // Check if query needs RAG context
  const needsRAG = query.length > 10 && 
    ['surat', 'letter', 'format', 'prosedur', 'procedure', 'dokumen', 'document', 
     'cara', 'how to', 'bagaimana', 'strategi', 'strategy', 'bisnis', 'business',
     'perusahaan', 'company', 'marketing', 'hr', 'recruitment', 'finance', 'keuangan',
     'sales', 'customer', 'client', 'proposal', 'laporan', 'report', 'analisis', 'analysis',
     'planning', 'perencanaan', 'budget', 'anggaran', 'branding', 'brand']
      .some(keyword => query.toLowerCase().includes(keyword));

  if (!needsRAG) {
    console.log('⏭️ [Business Handler] Skipping RAG (simple query)');
    return '';
  }

  try {
    const store = await initializeVectorStore();
    const relevantDocs = await store.similaritySearch(query, 2);
    
    if (relevantDocs.length > 0) {
      const context = relevantDocs.map((doc: any) => doc.pageContent).join("\n\n");
      console.log(`✅ [Business Handler] Context retrieved: ${relevantDocs.length} documents`);
      return context;
    }
    
    console.log('⏭️ [Business Handler] No relevant context found');
    return '';
  } catch (ragError) {
    console.warn('⚠️ [Business Handler] RAG retrieval failed, continuing without context:', ragError);
    return '';
  }
}

/**
 * Generate Business-Focused Prompt for LLaMA
 */
function getBusinessPrompt(context: string): string {
  return `Kamu adalah AI Assistant untuk administrasi bisnis perusahaan & agency.

━━━━━━━━━━━━━━━━━━━━━━
MODE: MODE_BUSINESS_ADMIN
━━━━━━━━━━━━━━━━━━━━━━

ATURAN WAJIB:
1. Fokus pada SOP, workflow, efisiensi, dan dokumentasi bisnis.
2. TIDAK memberi nasihat hukum/pajak resmi (hanya informasi umum).
3. Jangan mengarang data, fakta, atau regulasi.
4. Gunakan asumsi HANYA jika disebutkan secara eksplisit.
5. Jika data tidak cukup → minta data tambahan atau jelaskan keterbatasan.
6. Pisahkan fakta, analisis, dan asumsi dengan jelas.
7. Output bersifat informatif dan rekomendasi, bukan keputusan final.

${context ? `KONTEKS YANG TERSEDIA:\n${context}\n\n` : ""}FOKUS AREA:
- Business strategy & planning
- Marketing & branding
- HR & recruitment
- Finance & accounting (informasi umum, bukan nasihat resmi)
- Operations & logistics
- Customer service
- Sales & business development
- Corporate communication
- Document management
- Data analysis & reporting
- SOP & workflow optimization
- Process efficiency

STYLE KOMUNIKASI:
- Bahasa Indonesia yang profesional namun mudah dipahami
- Bisa menggunakan gaya casual profesional (gen-z friendly)
- Tetap sopan dan menghormati
- Break down konsep kompleks menjadi sederhana
- Berikan solusi yang actionable dan praktis
- Jika menggunakan data/fakta, sebutkan sumbernya jika perlu

VISUALISASI DATA:
- HANYA tampilkan visualisasi jika user secara EKSPLISIT meminta
- JANGAN suggest atau otomatis generate chart untuk pertanyaan umum
- Jika user tidak minta visualisasi, jawab dengan text saja
- Sistem akan otomatis generate chart jika user benar-benar meminta

━━━━━━━━━━━━━━━━━━━━━━
FORMAT WAJIB OUTPUT:
━━━━━━━━━━━━━━━━━━━━━━

1. RINGKASAN
   - Poin utama dari pertanyaan/permintaan user
   - Konteks yang relevan

2. ANALISIS MASALAH
   - Identifikasi masalah atau kebutuhan
   - Faktor-faktor yang mempengaruhi
   - Dampak yang mungkin terjadi

3. OPSI SOLUSI
   - Opsi 1: [deskripsi, kelebihan, kekurangan]
   - Opsi 2: [deskripsi, kelebihan, kekurangan]
   - Opsi 3: [jika ada, deskripsi, kelebihan, kekurangan]

4. REKOMENDASI
   - Rekomendasi utama dengan alasan
   - Kapan opsi lain lebih cocok
   - Pertimbangan khusus yang perlu diperhatikan

5. LANGKAH IMPLEMENTASI
   - Langkah 1: [tindakan konkret]
   - Langkah 2: [tindakan konkret]
   - Langkah 3: [tindakan konkret]
   - Timeline estimasi (jika relevan)
   - Resource yang dibutuhkan (jika relevan)

━━━━━━━━━━━━━━━━━━━━━━
CATATAN PENTING:
━━━━━━━━━━━━━━━━━━━━━━

- JANGAN memberikan nasihat hukum/pajak resmi (hanya informasi umum)
- JANGAN mengarang data atau fakta
- GUNAKAN asumsi hanya jika disebutkan user
- PISAHKAN fakta dari analisis dan rekomendasi
- OUTPUT informatif dan rekomendasi, bukan keputusan final`;
}

/**
 * Process Business Administration Request
 */
export async function processBusinessAdmin(
  context: AIRequestContext
): Promise<AIRequestResponse> {
  try {
    console.log('💼 [Business Handler] Processing business admin request...');

    const query = context.message || '';
    if (!query) {
      return {
        success: false,
        mode: RequestMode.BUSINESS_ADMIN,
        error: 'Message is required',
      };
    }

    // Step 1: Context Analyzer (RAG)
    console.log('🔍 [Business Handler] Step 1: Analyzing context...');
    const businessContext = await analyzeContext(query);

    // Step 2: LLaMA with Business Prompt
    console.log('🤖 [Business Handler] Step 2: Requesting LLM response...');
    const llmProvider = getLLMProvider();
    
    const globalRules = getGlobalPromptRules();
    const businessPrompt = getBusinessPrompt(businessContext);
    const systemPrompt = `${globalRules}\n\n${businessPrompt}`;
    
    // Filter out system messages from history
    const filteredHistory = (context.conversationHistory || []).filter(
      (msg) => msg.role !== "system"
    );

    const messages = [
      { role: "system", content: systemPrompt },
      ...filteredHistory,
      { role: "user", content: query },
    ];

    let response: string;
    
    // Check if streaming is requested
    if (context.stream && llmProvider.generateStreamResponse) {
      // For streaming, return the stream directly (handled in API route)
      // This handler focuses on non-streaming responses
      response = await llmProvider.generateResponse(messages, {
        temperature: 0.7,
      });
    } else {
      response = await llmProvider.generateResponse(messages, {
        temperature: 0.7,
      });
    }

    console.log('✅ [Business Handler] Response generated');

    return {
      success: true,
      mode: RequestMode.BUSINESS_ADMIN,
      response,
    };
  } catch (error: any) {
    console.error('❌ [Business Handler] Error processing business admin request:', error);
    return {
      success: false,
      mode: RequestMode.BUSINESS_ADMIN,
      error: error.message || 'Failed to process business admin request',
    };
  }
}
