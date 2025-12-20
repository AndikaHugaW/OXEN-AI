import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { addDocument } from '@/lib/rag/rag-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ 
    status: 'API is running', 
    timestamp: new Date().toISOString() 
  });
}

export async function POST(request: NextRequest) {
  console.log('🚀 [Upload API] POST Request received');
  
  try {
    // 1. Auth Check - Wrapped to catch environment issues
    let user;
    try {
      const cookieStore = await cookies();
      const supabase = createServerSupabaseClient(cookieStore);
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data?.user) {
        console.warn('❌ [Upload API] Unauthorized:', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = data.user;
    } catch (authErr: any) {
      console.error('❌ [Upload API] Auth initialization failed:', authErr);
      return NextResponse.json({ 
        error: 'AUTH_INIT_ERROR', 
        message: 'Gagal inisialisasi sesi. Pastikan Anda sudah login.' 
      }, { status: 500 });
    }

    // 2. Body Parsing
    let formData;
    try {
      formData = await request.formData();
    } catch (fdErr: any) {
      console.error('❌ [Upload API] FormData parsing failed:', fdErr);
      return NextResponse.json({ 
        error: 'FORM_DATA_ERROR', 
        message: 'Gagal memproses form data. Pastikan file tidak terlalu besar.' 
      }, { status: 400 });
    }

    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`📂 [Upload API] Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    // 3. Size Validation
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size too large (max 10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // 4. Content Extraction
    try {
      if (extension === 'pdf') {
        const pdfModule = await import('pdf-parse');
        const pdf = (pdfModule as any).default || pdfModule;
        const data = await (pdf as any)(buffer);
        text = data.text;
      } else if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
        const XLSX = await import('xlsx');
        
        if (extension === 'csv') {
          try {
            const { parse } = await import('csv-parse/sync');
            const rawRecords = parse(buffer.toString('utf-8'), {
              columns: true,
              skip_empty_lines: true,
              trim: true,
              relax_column_count: true,
              relax_quotes: true,
              skip_records_with_error: true,
            });
            
            // 🔧 DATA CLEANING: Remove rows with NaN/empty values in critical columns
            const records = rawRecords as Array<Record<string, unknown>>;
            const isOHLCData = records.length > 0 && 
              ('Close' in records[0] || 'close' in records[0]);
            
            let cleanedRecords = records;
            let removedCount = 0;
            
            if (isOHLCData) {
              cleanedRecords = records.filter((row) => {
                const closeValue = row['Close'] || row['close'];
                // Remove rows where Close is empty, NaN, or undefined
                const isValid = closeValue !== undefined && 
                               closeValue !== '' && 
                               closeValue !== 'NaN' &&
                               String(closeValue).trim() !== '';
                if (!isValid) removedCount++;
                return isValid;
              });
            }
            
            // Show column structure and cleaning info for AI
            const columns = cleanedRecords.length > 0 ? Object.keys(cleanedRecords[0]).join(', ') : 'Unknown';
            const cleaningNote = removedCount > 0 ? `\n[⚠️ ${removedCount} baris dengan data tidak lengkap telah dihapus]` : '';
            text = `[Data dari CSV: ${file.name}]\n[Kolom: ${columns}]\n[Total Baris Valid: ${cleanedRecords.length}]${cleaningNote}\n\n${JSON.stringify(cleanedRecords, null, 2)}`;
          } catch (csvErr: any) {
            // Fallback: Just read as plain text if CSV parsing fails
            console.warn('⚠️ [Upload API] CSV parsing failed, using raw text:', csvErr.message);
            const rawText = buffer.toString('utf-8');
            const lines = rawText.split('\n').filter(l => l.trim());
            text = `[Data dari file CSV (raw): ${file.name}]\n[Total Baris: ${lines.length}]\n\n${rawText}`;
          }
        } else {
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          // Show column structure for AI
          const columns = jsonData.length > 0 ? Object.keys(jsonData[0] as object).join(', ') : 'Unknown';
          text = `[Data dari Spreadsheet: ${file.name}, Sheet: ${firstSheetName}]\n[Kolom: ${columns}]\n[Total Baris: ${jsonData.length}]\n\n${JSON.stringify(jsonData, null, 2)}`;
        }
      } else if (extension === 'txt') {
        const rawText = buffer.toString('utf-8');
        const lines = rawText.split('\n').filter(l => l.trim());
        
        // Check if TXT might be CSV-like (has commas or tabs)
        const firstLine = lines[0] || '';
        const isCSVLike = firstLine.includes(',') && lines.length > 1;
        
        if (isCSVLike) {
          try {
            const { parse } = await import('csv-parse/sync');
            const records = parse(rawText, {
              columns: true,
              skip_empty_lines: true,
              trim: true,
              relax_column_count: true,
              relax_quotes: true,
              skip_records_with_error: true,
            });
            
            const columns = records.length > 0 ? Object.keys(records[0] as Record<string, unknown>).join(', ') : 'Unknown';
            text = `[Data dari TXT (CSV format): ${file.name}]\n[Kolom: ${columns}]\n[Total Baris: ${records.length}]\n\n${JSON.stringify(records, null, 2)}`;
          } catch (csvErr) {
            // Just use raw text
            text = `[Isi file teks: ${file.name}]\n[Total Baris: ${lines.length}]\n\n${rawText}`;
          }
        } else {
          text = `[Isi file teks: ${file.name}]\n[Total Baris: ${lines.length}]\n\n${rawText}`;
        }
      } else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }
    } catch (parseErr: any) {
      console.error(`❌ [Upload API] Parsing error for ${extension}:`, parseErr);
      return NextResponse.json({ 
        error: 'PARSING_ERROR', 
        message: `Gagal membaca isi file: ${parseErr.message}` 
      }, { status: 422 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 422 });
    }

    // 🔍 DEBUG: Log content being saved
    console.log(`📝 [Upload API] Content to save:`);
    console.log(`   - File: ${file.name}`);
    console.log(`   - Content length: ${text.length} chars`);
    console.log(`   - Preview: ${text.substring(0, 300)}...`);

    // 5. Save to RAG
    const docId = await addDocument(user.id, file.name, text, {
      docType: extension || 'general',
      metadata: {
        size: file.size,
        lastModified: file.lastModified,
      }
    });

    console.log(`✅ [Upload API] Document saved with ID: ${docId}`);

    if (!docId) {
      throw new Error('Failed to save document to database');
    }

    return NextResponse.json({ 
      success: true, 
      id: docId,
      name: file.name,
      message: 'Document uploaded and processed successfully'
    });

  } catch (error: any) {
    console.error('📂 [Upload API Critical Error]:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.name || 'CRITICAL_ERROR',
      message: error.message || 'Terjadi kesalahan sistem yang tidak terduga.' 
    }, { status: 500 });
  }
}
