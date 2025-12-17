// MODE_BUSINESS_ADMIN Handler
// Handles business administration requests with:
// 1. Context Analyzer (RAG)
// 2. LLaMA (Business Prompt)

import { getLLMProvider } from '../providers';
import { initializeVectorStore } from '../rag-service';
import { AIRequestContext, AIRequestResponse, RequestMode, getGlobalPromptRules } from '../ai-request-router';
import { needsVisualization } from '../chart-generator';
import { getBusinessDataPrompt, parseStructuredOutput } from '../structured-output';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * Fetch Context-Aware Business Data from Supabase
 */
async function getBusinessData(query: string): Promise<string> {
  // Only fetch if query is about data/reporting
  const isDataRequest = /data|report|laporan|penjualan|sales|revenue|profit|keuangan|financial|trend|kinerja|performance|grafik|chart|tabel/i.test(query);
  
  if (!isDataRequest) return '';

  try {
    console.log('📊 [Business Handler] Fetching business data...');
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    
    // Try to fetch from the monthly_sales_summary view (Efisiensi Token)
    const { data, error } = await supabase
      .from('monthly_sales_summary')
      .select('*')
      .order('month', { ascending: false })
      .limit(12); // Ambil 12 bulan terakhir saja

    if (error) {
      console.warn('⚠️ [Business Handler] Failed to fetch monthly_sales_summary:', error.message);
      return '';
    }

    if (data && data.length > 0) {
      console.log(`✅ [Business Handler] Retrieved ${data.length} monthly summary records`);
      return `REAL BUSINESS DATA (Summary):\n${JSON.stringify(data, null, 2)}\n\nINSTRUKSI KHUSUS DATAVIZ: Data ini AKAN divisualisasikan oleh sistem secara otomatis. Tugas Anda HANYA menjelaskan insight menarik, tren, atau anomali dari data tersebut dalam bentuk NARASI/CERITA. JANGAN buat ulang tabel atau grafik teks.`;
    }
  } catch (e) {
    console.error('❌ [Business Handler] Data fetch error:', e);
  }
  
  return '';
}

/**
 * Context Analyzer - Analyzes query and retrieves relevant business context via RAG and Database
 */
async function analyzeContext(query: string): Promise<string> {
  console.log('🔍 [Business Handler] Analyzing context...');

  let contextParts: string[] = [];

  // 1. Fetch Business Data (Database)
  const dbContext = await getBusinessData(query);
  if (dbContext) {
    contextParts.push(dbContext);
  }

  // 2. Fetch RAG Context (Documents)
  // Check if query needs RAG context
  const needsRAG = query.length > 10 && 
    ['surat', 'letter', 'format', 'prosedur', 'procedure', 'dokumen', 'document', 
     'cara', 'how to', 'bagaimana', 'strategi', 'strategy', 'bisnis', 'business',
     'perusahaan', 'company', 'marketing', 'hr', 'recruitment', 'finance', 'keuangan',
     'sales', 'customer', 'client', 'proposal', 'laporan', 'report', 'analisis', 'analysis',
     'planning', 'perencanaan', 'budget', 'anggaran', 'branding', 'brand']
      .some(keyword => query.toLowerCase().includes(keyword));

  if (needsRAG) {
    try {
      const store = await initializeVectorStore();
      const relevantDocs = await store.similaritySearch(query, 2);
      
      if (relevantDocs.length > 0) {
        const ragContext = relevantDocs.map((doc: any) => doc.pageContent).join("\n\n");
        console.log(`✅ [Business Handler] RAG Context retrieved: ${relevantDocs.length} documents`);
        contextParts.push(`DOCUMENT CONTEXT:\n${ragContext}`);
      }
    } catch (ragError) {
      console.warn('⚠️ [Business Handler] RAG retrieval failed:', ragError);
    }
  }

  return contextParts.join("\n\n");
}

/**
 * Generate Business-Focused Prompt for LLaMA
 */
function getBusinessPrompt(context: string, userMessage?: string): string {
  // Detect language from user message
  const isIndonesian = userMessage ? /[aku|saya|kamu|gimana|bagaimana|tolong|bisa|mau|ingin|punya|dengan|untuk|biar|jelasin|jelaskan|dasar|teori|budget|juta|marketing|alokasi|efektif]/i.test(userMessage) : true;
  const isEnglish = userMessage ? /^[a-zA-Z\s.,!?'"-]+$/.test(userMessage.trim().substring(0, 100)) : false;
  const detectedLanguage = isIndonesian ? 'Bahasa Indonesia' : (isEnglish ? 'English' : 'Bahasa Indonesia (default)');
  
  return `PERAN: Asisten Bisnis Profesional & Cerdas (seperti ChatGPT).
  
TUJUAN: Membantu user dengan strategi bisnis, analisis data, pembuatan dokumen, dan administrasi umum.

INSTRUKSI BAHASA:
- Bahasa: ${detectedLanguage}
- GAYA BAHASA: Profesional tapi luwes, mudah dipahami, bersahabat, dan tidak kaku. Gunakan bahasa Indonesia yang baik dan enak dibaca (bukan terjemahan kaku).

PANDUAN PENTING (JANGAN DILANGGAR):
1. BERIKAN INSIGHT, BUKAN TABEL MENTAH:
   - JANGAN PERNAH membuat tabel menggunakan Markdown (seperti | Month | Revenue |).
   - JANGAN PERNAH membuat grafik menggunakan karakter teks/ASCII.
   - JANGAN gunakan placeholder seperti "[Grafik ditampilkan di sini]" atau "[Lihat chart di atas]".
   - Jika ada data angka, jelaskan maknanya dalam kalimat naratif (contoh: "Pendapatan bulan ini naik 20% menjadi Rp50 juta...").

2. FORMAT TEKS BERSIH (CLEAN TEXT):
   - JANGAN gunakan formatting tebal (**) atau miring (*).
   - JANGAN gunakan heading markdown (###).
   - Gunakan paragraf baru atau poin-poin (bullet points -) untuk memisahkan ide.
   - Gunakan format 'Nama: Nilai' untuk highlight poin penting.

3. INTERAKTIF & SOLUTIF:
   - Jawab langsung ke inti pertanyaan.
   - Jika memberikan saran, buatlah langkah konkret yang bisa langsung dieksekusi.
   - Akhiri dengan pertanyaan terbuka atau tawaran bantuan lebih lanjut yang relevan.

4. KEAMANAN & BATASAN:
   - Jangan berikan saran hukum/pajak yang mengikat.
   - Jangan mengarang data. Gunakan hanya data yang disediakan di CONTEXT.

${context ? `KONTEKS DATA & DOKUMEN:\n${context}\n\n` : ""}

FORMAT RESPON:
- Langsung berikan jawaban/analisis (tanpa basa-basi "Berikut adalah jawaban saya").
- Hindari penggunaan simbol markdown yang berlebihan.
- Tutup dengan kalimat penutup yang profesional dan ramah.`;
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

    // Step 2: LLaMA Request
    console.log('🤖 [Business Handler] Step 2: Requesting LLM response...');
    const llmProvider = getLLMProvider();
    
    // DETECT: Does user want a visualization?
    // If YES -> Use Structured Prompt (JSON)
    // If NO  -> Use Narrative Prompt (Text)
    const wantsChart = needsVisualization(query);
    
    let businessPrompt: string;
    let systemPrompt: string;
    let temperature = 0.7;

    if (wantsChart) {
       console.log('📊 [Business Handler] Visualization detected. Using Structured JSON Prompt.');
       businessPrompt = getBusinessDataPrompt(query);
       // Add context to the query so the AI has data to chart
       systemPrompt = `${getGlobalPromptRules()}\n\n${businessPrompt}\n\nKONTEKS DATA:\n${businessContext}`;
       temperature = 0.1; // Low temp for JSON
    } else {
       businessPrompt = getBusinessPrompt(businessContext, query);
       systemPrompt = `${getGlobalPromptRules()}\n\n${businessPrompt}`;
    }
    
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
    
    // Check if streaming is requested (but we are in chart mode, so likely waiting for full response)
    response = await llmProvider.generateResponse(messages, {
        temperature: temperature,
    });

    console.log('✅ [Business Handler] Response generated');
    
    // If we wanted a chart, we need to handle the response carefully
    if (wantsChart) {
       // Attempt 1: Standard Parse
       const parsedUI = parseStructuredOutput(response);
       
       if (parsedUI) {
          console.log('✅ [Business Handler] Successfully parsed Structured Output');
          return {
             success: true,
             mode: RequestMode.BUSINESS_ADMIN,
             // Use the message from the JSON if available and substantial
             response: (parsedUI.message && parsedUI.message.length > 20) 
                 ? parsedUI.message 
                 : "Berikut visualisasi data berdasarkan analisis tersebut.",
             structuredOutput: parsedUI
          };
       } 
       
       // Attempt 2: Hybrid Parse (Text + JSON mix)
       // AI might have outputted: "Here is the chart: ```json {...} ``` explanation..."
       // We want to extract valid JSON for the chart, and keep the text for the response.
       console.warn('⚠️ [Business Handler] Strict parse failed. Attempting hybrid extraction...');
       
       const jsonBlockMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                              response.match(/```\s*(\{[\s\S]*?\})\s*```/) ||
                              response.match(/(\{[\s\S]*?"action"[\s\S]*?\})/);
                              
       if (jsonBlockMatch) {
          const jsonText = jsonBlockMatch[1] || jsonBlockMatch[0];
          try {
             // Try to clean potential trailing commas or errors
             const cleanJsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
             const parsedHybrid = JSON.parse(cleanJsonText);
             
             if (parsedHybrid && (parsedHybrid.action === 'show_chart' || parsedHybrid.data)) {
                 console.log('✅ [Business Handler] Hybrid extraction successful');
                 
                 // Remove the JSON block from the original response to get the "Clean Text"
                 let cleanText = response.replace(jsonBlockMatch[0], '').trim();
                 // Clean up leftover markers
                 cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
                 
                 // If clean text is empty, check if JSON has a message
                 if (cleanText.length < 10 && parsedHybrid.message) {
                    cleanText = parsedHybrid.message;
                 }
                 // If still empty, default text
                 if (cleanText.length < 5) {
                    cleanText = "Berikut visualisasi data yang Anda minta.";
                 }

                 return {
                    success: true,
                    mode: RequestMode.BUSINESS_ADMIN,
                    response: cleanText,
                    structuredOutput: parsedHybrid
                 };
             }
          } catch (e) {
             console.warn('❌ [Business Handler] Hybrid JSON parse failed:', e);
          }
       }
       
       // Fallback: Return raw text, but let route.ts try to fix it via the "Optimization" step.
       // But we should try to hide the raw JSON from the user if possible.
       let sanitizedResponse = response;
       if (jsonBlockMatch) {
           // If we found a block but failed to parse it, at least hide it from the chat bubble
           sanitizedResponse = response.replace(jsonBlockMatch[0], '[Memuat Visualisasi Data...]').trim();
       }
       
       return {
          success: true,
          mode: RequestMode.BUSINESS_ADMIN,
          response: sanitizedResponse
       };
    }

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
