// MODE_REPORT_GENERATOR Handler
// Handles professional business report generation from documents and data

import { getLLMProvider } from '../providers';
import { AIRequestContext, AIRequestResponse, RequestMode, getGlobalPromptRules, detectLanguage } from '../ai-request-router';

/**
 * Generate Report-Specific Prompt
 */
function getReportPrompt(context: string, userMessage: string): string {
  // Detect language using utility
  const language = detectLanguage(userMessage);
  const isID = language === 'id';

  const langInstruction = isID 
    ? "JAWAB SEPENUHNYA DALAM BAHASA INDONESIA." 
    : "RESPOND ENTIRELY IN ENGLISH.";

  return isID ? `PERAN: Analis Bisnis Senior & Ahli Strategi Korporat.
  
INSTRUKSI BAHASA:
- ${langInstruction}
  
TUJUAN: Menghasilkan LAPORAN BISNIS PROFESIONAL yang mendalam, terstruktur, dan actionable.

SUMBER DATA (CONTEXT):
${context || "Tidak ada dokumen yang diunggah. Gunakan pengetahuan umum dan logika bisnis."}

INSTRUKSI PENULISAN LAPORAN (PAKE LENGKAP TAPI RINGKAS):
1. STRUKTUR LAPORAN WAJIB:
   - **Ringkasan Eksekutif**: Gambaran besar laporan dalam 1 paragraf.
   - **Analisis Situasi**: Temuan utama dari dokumen/data yang diberikan.
   - **Insight & Tren**: Apa arti angka/data tersebut bagi bisnis?
   - **Rekomendasi Strategis**: 3-5 langkah konkret yang harus diambil.
   - **Kesimpulan**: Penutup yang kuat dan profesional.

2. GAYA BAHASA:
   - Profesional, objektif, dan persuasif.
   - Gunakan terminologi bisnis yang tepat (ROI, KPI, Bottom-line, Market Share, dll).
   - JANGAN bertele-tele. Langsung ke inti permasalahan.

3. FORMATTING (PENTING):
   - Gunakan **Teks Tebal** untuk poin penting.
   - Gunakan angka (1., 2., 3.) untuk daftar langkah.
   - JANGAN gunakan tabel markdown. Jelaskan data dalam narasi yang mengalir.
   - JANGAN gunakan simbol atau emoji.

4. LOGIKA ORCHESTRATOR:
   - Jika ada "DOCUMENT CONTEXT", prioritaskan informasi dari dokumen tersebut sebagai sumber utama.
   - Jika ada "WEB SEARCH RESULTS", hubungkan temuan dokumen dengan kondisi pasar real-time di luar sana.
   - Berikan analisis yang menghubungkan "Apa yang terjadi di internal" (Dokumen) dengan "Apa yang terjadi di eksternal" (Web).

User Request: ${userMessage}

Hasilkan laporan yang siap dipresentasikan kepada direksi.` : `ROLE: Senior Business Analyst & Corporate Strategist.
  
LANGUAGE INSTRUCTION:
- ${langInstruction}
  
GOAL: Generate a PROFESSIONAL BUSINESS REPORT that is deep, structured, and actionable.

DATA SOURCE (CONTEXT):
${context || "No documents uploaded. Use general knowledge and business logic."}

REPORT WRITING INSTRUCTIONS (BE COMPLETE BUT CONCISE):
1. MANDATORY REPORT STRUCTURE:
   - **Executive Summary**: Big picture overview in 1 paragraph.
   - **Situation Analysis**: Key findings from provided documents/data.
   - **Insight & Trends**: What do the numbers/data mean for the business?
   - **Strategic Recommendations**: 3-5 concrete steps to take.
   - **Conclusion**: A strong and professional closing.

2. STYLE:
   - Professional, objective, and persuasive.
   - Use proper business terminology (ROI, KPI, Bottom-line, Market Share, etc.).
   - DO NOT ramble. Get straight to the point.

3. FORMATTING (IMPORTANT):
   - Use **Bold Text** for highlights.
   - Use numbers (1., 2., 3.) for lists.
   - DO NOT use markdown tables. Explain data in flowing narratives.
   - DO NOT use symbols or emojis.

User Request: ${userMessage}

Generate a report ready for board presentation.`;
}

/**
 * Process Report Generation Request
 */
export async function processReportGenerator(
  context: AIRequestContext
): Promise<AIRequestResponse> {
  try {
    console.log('📄 [Report Handler] Generating professional report...');

    const query = context.message || '';
    const ragContext = context.ragContext || '';
    
    // Detect language using utility
    const language = detectLanguage(query);
    
    const llmProvider = getLLMProvider();
    const systemPrompt = `${getGlobalPromptRules(language)}\n\n${getReportPrompt(ragContext, query)}`;
    
    const messages = [
      { role: "system", content: systemPrompt },
      ...(context.conversationHistory || []).filter(m => m.role !== "system"),
      { role: "user", content: query },
    ];

    const response = await llmProvider.generateResponse(messages, {
        temperature: 0.3, // Low temperature for consistent reporting
    });

    console.log('✅ [Report Handler] Report generated successfully');
    
    return {
      success: true,
      mode: RequestMode.REPORT_GENERATOR,
      response,
    };
  } catch (error: any) {
    console.error('❌ [Report Handler] Error:', error);
    return {
      success: false,
      mode: RequestMode.REPORT_GENERATOR,
      error: error.message || 'Failed to generate report',
    };
  }
}
