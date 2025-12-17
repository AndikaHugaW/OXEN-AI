// MODE_LETTER_GENERATOR Handler
// Handles letter generation requests with:
// 1. Template Resolver
// 2. LLaMA (Letter Prompt)

import { getLLMProvider } from '../providers';
import { initializeVectorStore } from '../rag-service';
import { AIRequestContext, AIRequestResponse, RequestMode, getGlobalPromptRules } from '../ai-request-router';

/**
 * Letter Template Types
 */
export enum LetterTemplateType {
  FORMAL = 'formal',
  INFORMAL = 'informal',
  OFFICIAL = 'official',
  BUSINESS = 'business',
  COVER_LETTER = 'cover_letter',
  RESIGNATION = 'resignation',
  RECOMMENDATION = 'recommendation',
  PROPOSAL = 'proposal',
  COMPLAINT = 'complaint',
  THANK_YOU = 'thank_you',
}

/**
 * Template Resolver - Resolves appropriate letter template based on type and context
 */
async function resolveTemplate(
  letterType: string,
  additionalContext?: string
): Promise<{ template: string; format: string }> {
  console.log('📝 [Letter Handler] Resolving template for:', letterType);

  // Map letter types to template categories
  const typeMap: Record<string, LetterTemplateType> = {
    'resmi': LetterTemplateType.OFFICIAL,
    'official': LetterTemplateType.OFFICIAL,
    'formal': LetterTemplateType.FORMAL,
    'informal': LetterTemplateType.INFORMAL,
    'bisnis': LetterTemplateType.BUSINESS,
    'business': LetterTemplateType.BUSINESS,
    'lamaran': LetterTemplateType.COVER_LETTER,
    'cover letter': LetterTemplateType.COVER_LETTER,
    'pengunduran diri': LetterTemplateType.RESIGNATION,
    'resignation': LetterTemplateType.RESIGNATION,
    'rekomendasi': LetterTemplateType.RECOMMENDATION,
    'recommendation': LetterTemplateType.RECOMMENDATION,
    'proposal': LetterTemplateType.PROPOSAL,
    'keluhan': LetterTemplateType.COMPLAINT,
    'complaint': LetterTemplateType.COMPLAINT,
    'terima kasih': LetterTemplateType.THANK_YOU,
    'thank you': LetterTemplateType.THANK_YOU,
  };

  const normalizedType = letterType.toLowerCase();
  const templateType = typeMap[normalizedType] || LetterTemplateType.OFFICIAL;

  // Try to get relevant context from RAG
  let context = '';
  try {
    const store = await initializeVectorStore();
    const relevantDocs = await store.similaritySearch(
      `${letterType} format official letter`,
      3
    );
    if (relevantDocs.length > 0) {
      context = relevantDocs.map((doc: any) => doc.pageContent).join("\n\n");
    }
  } catch (ragError) {
    console.warn('⚠️ [Letter Handler] RAG retrieval failed, continuing without context:', ragError);
  }

  // Base format template
  const baseFormat = `FORMAT SURAT RESMI:
1. Kop Surat (Logo + Nama Perusahaan + Alamat)
2. Nomor Surat
3. Tanggal
4. Perihal
5. Lampiran (jika ada)
6. Alamat Tujuan
7. Salam Pembuka
8. Isi Surat (Pendahuluan + Isi Utama + Penutup)
9. Salam Penutup
10. Nama dan Jabatan Pengirim
11. Tanda Tangan`;

  // Template-specific formats
  const templateFormats: Record<LetterTemplateType, string> = {
    [LetterTemplateType.OFFICIAL]: baseFormat,
    [LetterTemplateType.FORMAL]: baseFormat,
    [LetterTemplateType.INFORMAL]: `FORMAT SURAT TIDAK RESMI:
1. Tanggal
2. Salam Pembuka
3. Isi Surat
4. Salam Penutup
5. Nama Pengirim`,
    [LetterTemplateType.BUSINESS]: `FORMAT SURAT BISNIS:
1. Kop Surat Perusahaan
2. Nomor Surat
3. Tanggal
4. Perihal
5. Alamat Tujuan
6. Salam Pembuka
7. Isi Surat (Context + Request/Proposal + Expected Outcome)
8. Salam Penutup
9. Nama, Jabatan, dan Tanda Tangan`,
    [LetterTemplateType.COVER_LETTER]: `FORMAT SURAT LAMARAN:
1. Kop Surat (Jika ada)
2. Tanggal
3. Perihal: Surat Lamaran Pekerjaan
4. Alamat Tujuan
5. Salam Pembuka
6. Paragraf 1: Menyebutkan posisi yang dilamar dan sumber informasi
7. Paragraf 2: Menyebutkan kualifikasi dan pengalaman
8. Paragraf 3: Menyebutkan kontribusi yang bisa diberikan
9. Salam Penutup
10. Nama dan Tanda Tangan`,
    [LetterTemplateType.RESIGNATION]: `FORMAT SURAT PENGUNDURAN DIRI:
1. Kop Surat (Jika ada)
2. Tanggal
3. Perihal: Surat Pengunduran Diri
4. Alamat Tujuan
5. Salam Pembuka
6. Isi: Menyampaikan maksud pengunduran diri + alasan singkat + terima kasih
7. Salam Penutup
8. Nama, Jabatan, dan Tanda Tangan`,
    [LetterTemplateType.RECOMMENDATION]: `FORMAT SURAT REKOMENDASI:
1. Kop Surat
2. Tanggal
3. Perihal: Surat Rekomendasi
4. Alamat Tujuan
5. Salam Pembuka
6. Isi: Menyebutkan orang yang direkomendasikan + kualifikasi + pengalaman + rekomendasi
7. Salam Penutup
8. Nama, Jabatan, dan Tanda Tangan`,
    [LetterTemplateType.PROPOSAL]: `FORMAT SURAT PROPOSAL:
1. Kop Surat
2. Nomor Surat
3. Tanggal
4. Perihal: Proposal [Judul]
5. Alamat Tujuan
6. Salam Pembuka
7. Latar Belakang
8. Tujuan Proposal
9. Rencana Kegiatan
10. Anggaran (jika perlu)
11. Penutup
12. Salam Penutup
13. Nama, Jabatan, dan Tanda Tangan`,
    [LetterTemplateType.COMPLAINT]: `FORMAT SURAT KELUHAN:
1. Kop Surat (Jika ada)
2. Tanggal
3. Perihal: Surat Keluhan
4. Alamat Tujuan
5. Salam Pembuka
6. Isi: Menjelaskan masalah yang terjadi + dampak + harapan penyelesaian
7. Salam Penutup
8. Nama dan Tanda Tangan`,
    [LetterTemplateType.THANK_YOU]: `FORMAT SURAT TERIMA KASIH:
1. Kop Surat (Jika ada)
2. Tanggal
3. Perihal: Surat Terima Kasih
4. Alamat Tujuan
5. Salam Pembuka
6. Isi: Menyampaikan terima kasih + alasan + harapan
7. Salam Penutup
8. Nama dan Tanda Tangan`,
  };

  const format = context 
    ? `${context}\n\n${templateFormats[templateType]}`
    : templateFormats[templateType];

  console.log(`✅ [Letter Handler] Template resolved: ${templateType}`);

  return {
    template: templateType,
    format,
  };
}

/**
 * Generate Letter-Focused Prompt for LLaMA
 */
function getLetterPrompt(
  template: { template: string; format: string },
  letterType: string,
  recipient: string,
  subject: string,
  content: string,
  additionalContext?: string
): string {
  return `Kamu adalah AI Assistant untuk pembuatan surat & dokumen profesional.

━━━━━━━━━━━━━━━━━━━━━━
MODE: MODE_LETTER_GENERATOR
━━━━━━━━━━━━━━━━━━━━━━

ATURAN WAJIB:
1. Gunakan bahasa formal dan profesional.
2. JANGAN mengisi data sensitif jika tidak diberikan (nama lengkap, NIK, NPWP, dll).
3. Gunakan placeholder [NAMA], [JABATAN], [ALAMAT], dll jika data tidak lengkap.
4. Format harus sesuai template yang diberikan.
5. Jangan mengarang informasi yang tidak diberikan.
6. Surat harus siap digunakan setelah data lengkap diisi.
7. BAHASA (SANGAT PENTING): Gunakan bahasa yang SAMA dengan permintaan pengguna. Jika permintaan dalam Bahasa Indonesia, surat HARUS dalam Bahasa Indonesia (kecuali diminta sebaliknya).

${template.format}

━━━━━━━━━━━━━━━━━━━━━━
DETAIL SURAT:
━━━━━━━━━━━━━━━━━━━━━━

- Jenis Surat: ${letterType}
- Tujuan: ${recipient}
- Perihal: ${subject}
- Isi: ${content}
${additionalContext ? `- Konteks tambahan: ${additionalContext}` : ''}

━━━━━━━━━━━━━━━━━━━━━━
FORMAT WAJIB:
━━━━━━━━━━━━━━━━━━━━━━

1. HEADER (opsional, sesuai jenis surat)
   - Kop surat (jika surat resmi)
   - Logo perusahaan (placeholder: [LOGO])

2. ISI SURAT
   - Nomor surat: [NOMOR] (jika diperlukan)
   - Tanggal: [TANGGAL] atau gunakan format: [tanggal saat ini]
   - Perihal: ${subject}
   - Alamat tujuan: ${recipient}
   - Salam pembuka: Yang terhormat, [jabatan/posisi]
   - Isi utama: ${content}
     * Pendahuluan (konteks)
     * Isi pokok (tujuan surat)
     * Penutup (harapan/tindak lanjut)
   - Salam penutup: Hormat kami,

3. PENUTUP
   - Nama: [NAMA] (placeholder jika tidak diberikan)
   - Jabatan: [JABATAN] (placeholder jika tidak diberikan)
   - Tanda tangan: [TANDA TANGAN] (placeholder)

━━━━━━━━━━━━━━━━━━━━━━
GAYA PENULISAN:
━━━━━━━━━━━━━━━━━━━━━━

- FORMAL: Gunakan bahasa resmi dan sopan
- NETRAL: Hindari emosi atau opini pribadi
- Siap digunakan: Surat harus siap digunakan setelah data lengkap

━━━━━━━━━━━━━━━━━━━━━━
CATATAN PENTING:
━━━━━━━━━━━━━━━━━━━━━━

- JANGAN mengisi data sensitif yang tidak diberikan
- GUNAKAN placeholder untuk data yang kurang
- PASTIKAN format sesuai template
- SURAT harus logis dan mudah dipahami
- TONE harus sesuai jenis surat (formal untuk resmi, lebih casual untuk tidak resmi)

HASILKAN SURAT LENGKAP SEKARANG:`;
}

/**
 * Process Letter Generation Request
 */
export async function processLetterGenerator(
  context: AIRequestContext
): Promise<AIRequestResponse> {
  try {
    console.log('📝 [Letter Handler] Processing letter generation request...');

    // Validate required fields
    if (!context.letterType || !context.recipient || !context.subject || !context.content) {
      return {
        success: false,
        mode: RequestMode.LETTER_GENERATOR,
        error: 'Missing required fields: letterType, recipient, subject, and content are required',
      };
    }

    // Step 1: Template Resolver
    console.log('📋 [Letter Handler] Step 1: Resolving template...');
    const template = await resolveTemplate(context.letterType, context.additionalContext);

    // Step 2: LLaMA with Letter Prompt
    console.log('🤖 [Letter Handler] Step 2: Generating letter with LLM...');
    const llmProvider = getLLMProvider();

    const globalRules = getGlobalPromptRules();
    const letterPrompt = getLetterPrompt(
      template,
      context.letterType,
      context.recipient,
      context.subject,
      context.content,
      context.additionalContext
    );
    const systemPrompt = `${globalRules}\n\n${letterPrompt}`;

    const messages = [
      {
        role: 'system',
        content: 'Kamu adalah expert dalam membuat surat resmi. ATURAN KRUSIAL: Identifikasi bahasa yang digunakan user dalam permintaan detail surat. JIKA USER MENGGUNAKAN BAHASA INDONESIA, MAKA OUTPUT SURAT WAJIB 100% BAHASA INDONESIA. Jangan gunakan Bahasa Inggris kecuali diminta secara eksplisit atau jika permintaan user dalam Bahasa Inggris.',
      },
      {
        role: 'user',
        content: systemPrompt,
      },
    ];

    const letter = await llmProvider.generateResponse(messages, {
      temperature: 0.7,
    });

    console.log('✅ [Letter Handler] Letter generated');

    return {
      success: true,
      mode: RequestMode.LETTER_GENERATOR,
      letter,
    };
  } catch (error: any) {
    console.error('❌ [Letter Handler] Error processing letter generation:', error);
    return {
      success: false,
      mode: RequestMode.LETTER_GENERATOR,
      error: error.message || 'Failed to generate letter',
    };
  }
}
