// MODE_BUSINESS_ADMIN Handler
// Handles business administration requests with:
// 1. Context Analyzer (RAG)
// 2. LLaMA (Business Prompt)

import { getLLMProvider } from '../providers';
import { initializeVectorStore } from '../rag-service';
import { AIRequestContext, AIRequestResponse, RequestMode, getGlobalPromptRules, detectLanguage } from '../ai-request-router';
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
  // Detect language using utility
  const language = detectLanguage(userMessage || '');
  const isID = language === 'id';
  const detectedLanguageLabel = isID ? 'Bahasa Indonesia' : 'English';
  
  const languageSpecificIntro = isID ? `PERAN: Asisten Bisnis Profesional & Cerdas (seperti ChatGPT).
  
INSTRUKSI BAHASA:
- Bahasa: ${detectedLanguageLabel}
- JAWABLAH 100% DALAM BAHASA INDONESIA yang luwes dan profesional.` : `ROLE: Professional & Intelligent Business Assistant.
  
LANGUAGE INSTRUCTION:
- Language: ${detectedLanguageLabel}
- RESPOND 100% IN ENGLISH, professional and friendly.`;

  const commonRules = `
PANDUAN PENTING (JANGAN DILANGGAR):
1. BERIKAN INSIGHT, BUKAN TABEL MENTAH:
   - JANGAN PERNAH membuat tabel menggunakan Markdown (seperti | Month | Revenue |).
   - JANGAN PERNAH membuat grafik menggunakan karakter teks/ASCII.
   - JANGAN gunakan placeholder seperti "[Grafik ditampilkan di sini]" atau "[Lihat chart di atas]".
   - Jika ada data angka, jelaskan maknanya dalam kalimat naratif (contoh: "Pendapatan bulan ini naik 20% menjadi Rp50 juta...").

2. FORMAT PENULISAN (PREMIUM):
   - Gunakan **Teks Tebal** untuk Judul atau Poin Utama.
   - JANGAN gunakan heading markdown (###) kecuali sangat diperlukan.
   - Lebih utamakan narasi dalam paragraf yang mengalir daripada daftar poin (bullet points) yang terlalu panjang.
   - Gunakan bahasa yang elegan, profesional, dan cerdas.

3. INTERAKTIF & SOLUTIF:
   - Jawab langsung ke inti pertanyaan.
   - Jika memberikan saran, buatlah langkah konkret yang bisa langsung dieksekusi.
   - Akhiri dengan pertanyaan terbuka atau tawaran bantuan lebih lanjut yang relevan.

4. KEAMANAN & BATASAN:
   - Jangan berikan saran hukum/pajak yang mengikat.
   - Jangan mengarang data. Gunakan hanya data yang disediakan di CONTEXT.

${context ? `KONTEKS DATA & DOKUMEN:\n${context}\n\n` : ""}

${languageSpecificIntro}

FORMAT RESPON:
- Langsung berikan jawaban/analisis.
- JAWAB SEPENUHNYA DALAM ${detectedLanguageLabel.toUpperCase()}.`;

  return commonRules;
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
    
    // Detect language using utility
    const language = detectLanguage(query);
    
    // DETECT: Does user want a visualization?
    // If YES -> Use Structured Prompt (JSON)
    // If NO  -> Use Narrative Prompt (Text)
    const wantsChart = needsVisualization(query);
    
    let businessPrompt: string;
    let systemPrompt: string;
    let temperature = 0.7;

    if (wantsChart) {
       console.log('📊 [Business Handler] Visualization detected. Using Structured JSON Prompt.');
       businessPrompt = getBusinessDataPrompt(query, language);
       // Add context to the query so the AI has data to chart
       systemPrompt = `${getGlobalPromptRules(language)}\n\n${businessPrompt}\n\nKONTEKS DATA:\n${businessContext}`;
       temperature = 0.1; // Low temp for JSON
    } else {
       businessPrompt = getBusinessPrompt(businessContext, query);
       systemPrompt = `${getGlobalPromptRules(language)}\n\n${businessPrompt}`;
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
        // AI might have outputted narrative text + a JSON block.
        // We want to extract valid JSON for the chart, and keep the text for the response.
        console.warn('⚠️ [Business Handler] Strict parse failed. Attempting hybrid extraction...');
        
        // Find the absolute first { and absolute last } to capture the entire JSON block
        const firstBrace = response.indexOf('{');
        const lastBrace = response.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
           const potentialJson = response.substring(firstBrace, lastBrace + 1);
           const jsonBlockFull = potentialJson;
           
           try {
              // Try to clean potential trailing commas or errors
              const cleanJsonText = jsonBlockFull.replace(/,(\s*[}\]])/g, '$1');
              const parsedHybrid = JSON.parse(cleanJsonText);
              
              if (parsedHybrid && (parsedHybrid.action === 'show_chart' || parsedHybrid.data)) {
                  console.log('✅ [Business Handler] Hybrid extraction successful');
                  
                  // Remove the entire block from { to } from the original response
                  let cleanText = (response.substring(0, firstBrace) + response.substring(lastBrace + 1)).trim();
                  
                  // Clean up common AI prefixes that often precede JSON
                  const noisePrefixes = [
                    /json\s*output:?/i, 
                    /berikut\s*data\s*json:?/i, 
                    /output\s*json:?/i, 
                    /konfigurasi\s*chart:?/i,
                    /```json/i,
                    /```/i
                  ];
                  
                  noisePrefixes.forEach(pattern => {
                    cleanText = cleanText.replace(pattern, '').trim();
                  });
                  
                  // If clean text is too short or just leftover markers, use the 'message' from JSON
                  if (cleanText.length < 20 && parsedHybrid.message) {
                     cleanText = parsedHybrid.message;
                  }
                  
                  if (cleanText.length < 5) {
                     cleanText = "Berikut visualisasi data berdasarkan analisis tersebut.";
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
        
        // Fallback: If we couldn't parse but found braces, at least hide the mess
        let sanitizedResponse = response;
        if (firstBrace !== -1 && lastBrace !== -1) {
            sanitizedResponse = (response.substring(0, firstBrace) + "\n[Memuat Visualisasi Data...]\n" + response.substring(lastBrace + 1)).trim();
            // Clean noise from fallback too
            sanitizedResponse = sanitizedResponse.replace(/json\s*output:?/i, '').replace(/```json/i, '').trim();
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
