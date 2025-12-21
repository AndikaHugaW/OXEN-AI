// Utility untuk parse structured output dari AI
// Memaksa AI mengembalikan JSON untuk actions tertentu

// Update StructuredResponse to include business chart fields
export interface StructuredResponse {
  action: 'show_chart' | 'text_only' | 'show_table';
  message?: string;
  // Untuk market chart
  asset_type?: 'crypto' | 'stock';
  symbol?: string;
  timeframe?: string;
  chart_type?: 'candlestick' | 'line' | 'bar' | 'pie' | 'area' | 'comparison';
  indicators?: string[];
  // Untuk business chart 
  data?: any[]; // Array of objects for the chart
  xKey?: string;
  yKey?: string | string[];
  title?: string;
  chart?: any; // Fallback container
  table?: any;
  type?: string; // Alias for chart_type or general type field
  comparisonAssets?: any[]; // For market comparison
}

// ... existing parseStructuredOutput ...

// ... existing getStructuredPrompt ...

/**
 * Generate prompt untuk memaksa AI return structured business chart JSON
 */
/**
 * Generate prompt untuk memaksa AI return structured business chart JSON
 */
/**
 * Generate prompt untuk memaksa AI return structured business chart JSON
 */
export function getBusinessDataPrompt(query: string, language: 'id' | 'en' = 'en'): string {
  const isID = language === 'id';
  
  // Detect requested chart type from query for hints
  const isLine = /line|garis/i.test(query);
  const isPie = /pie|lingkaran/i.test(query);
  const isBar = /bar|batang/i.test(query);
  const isArea = /area|wilayah/i.test(query);
  
  // Detect comparison intent
  const isComparison = /banding|compare|vs|versus|komparasi/i.test(query);
  
  const preferredType = isLine ? "line" : (isPie ? "pie" : (isArea ? "area" : (isComparison ? "bar" : "bar")));
  
  // Custom instruction for comparison vs single data - clearer flat object structure
  const comparisonInstruction = isComparison 
    ? (isID 
        ? `MODE PERBANDINGAN TERDETEKSI:
           - Struktur Data HARUS Flat Object, BUKAN Nested.
           - "yKey" adalah ARRAY string key.
           
           CONTOH BENAR (Flat Object):
           "data": [
             { "bulan": "Jan", "Revenue": 100, "Expense": 80 },
             { "bulan": "Feb", "Revenue": 120, "Expense": 90 }
           ],
           "xKey": "bulan",
           "yKey": ["Revenue", "Expense"]
           
           CONTOH SALAH (Jangan gunakan nested):
           "data": [
             { "bulan": "Jan", "values": { "Revenue": 100, "Expense": 80 } }
           ]`
        : `COMPARISON MODE DETECTED:
           - Data Structure MUST be Flat Objects, NOT Nested.
           - "yKey" is an ARRAY of string keys.
           
           CORRECT EXAMPLE (Flat Object):
           "data": [
             { "month": "Jan", "Revenue": 100, "Expense": 80 },
             { "month": "Feb", "Revenue": 120, "Expense": 90 }
           ],
           "xKey": "month",
           "yKey": ["Revenue", "Expense"]
           
           WRONG EXAMPLE (Do not use nested):
           "data": [
             { "month": "Jan", "values": { "Revenue": 100, "Expense": 80 } }
           ]`)
    : `SINGLE DATA MODE: "yKey" is a single string.`;

  const role = isID ? 'KAMU ADALAH AHLI VISUALISASI DATA.' : 'YOU ARE A DATA VISUALIZATION EXPERT.';
  const task = isID ? 'TUGAS: Merubah data bisnis menjadi konfigurasi JSON Chart.' : 'TASK: Convert business data into JSON Chart configuration.';
  const langRule = isID ? 'JAWABAN (field "message" dan "title") HARUS 100% DALAM BAHASA INDONESIA.' : 'RESPONSE (field "message" and "title") MUST BE 100% IN ENGLISH.';

  return `${role}
${task}
${langRule}

KONTEKS USER QUERY: "${query}"
PREFERENSI CHART: ${preferredType}
${comparisonInstruction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ATURAN FORMAT JSON (SUPER PENTING):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Output WAJIB berupa JSON valid.
2. JANGAN ada teks pengantar atau penutup di luar blok JSON.
3. Angka harus NUMBER (1000000), bukan string.
4. Field "message" adalah string TUNGGAL.
5. GUNAKAN \\n untuk ganti baris di dalam "message". CONTOH: "Poin 1\\nPoin 2".
6. DILARANG menekan tombol ENTER asli di dalam nilai string JSON.
7. Escape tanda kutip ganda (") dengan backslash (\\").
8. JANGAN gunakan trailing comma sebelum } atau ].

CONTOH "message" YANG BENAR:
✅ "message": "1. Revenue naik 20%\\n2. Expense turun 5%\\n3. Profit margin meningkat."

CONTOH "message" YANG SALAH:
❌ "message": "1. Revenue naik 20%
2. Expense turun 5%"  (ada ENTER asli = JSON rusak!)

FORMAT JSON TARGET:
{
  "action": "show_chart",
  "chart_type": "bar" | "line" | "pie" | "area", 
  "title": "Judul Chart",
  "message": "Analisis insight dalam SATU BARIS menggunakan \\n untuk line breaks",
  "data": [ { "xKey": "Label", "yKey": nilai } ],
  "xKey": "category",
  "yKey": "value" atau ["Series1", "Series2"]
}

PENTING: Field "message" JANGAN MENJELASKAN ULANG ANGKA. Jelaskan insight, tren, dan rekomendasi.`;
}

/**
 * Parse structured output dari AI response
 * Mencari JSON di response dan extract action
 */

/**
 * Sanitize JSON string to fix common LLM output issues:
 * 1. Unescaped newlines inside strings
 * 2. Control characters
 * 3. Trailing commas
 * 4. Single quotes instead of double quotes
 */
function sanitizeJsonString(jsonStr: string): string {
  let result = jsonStr;
  
  // Step 1: Remove dangerous control characters (keep \n, \r, \t)
  result = result.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  
  // Step 2: Fix unescaped newlines inside string values
  // This is tricky - we need to find strings and escape their newlines
  // Strategy: Find content between quotes and escape newlines there
  result = result.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    // Replace actual newlines with \n, but don't double-escape already escaped ones
    return match
      .replace(/\r\n/g, '\\n')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\n')
      .replace(/\t/g, '\\t');
  });
  
  // Step 3: Remove trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, '$1');
  
  // Step 4: Fix single quotes (be careful not to break contractions)
  // Only replace single quotes that are clearly meant to be JSON delimiters
  // Pattern: 'key': or : 'value' or ['item']
  result = result.replace(/^(\s*)'([^']+)'(\s*:)/gm, '$1"$2"$3'); // 'key':
  result = result.replace(/:(\s*)'([^']*)'(\s*[,}\]])/g, ':$1"$2"$3'); // : 'value'
  
  return result;
}

/**
 * Attempt to fix severely broken JSON
 * Used as last resort when standard parsing fails
 */
function attemptAggressiveJsonFix(jsonStr: string): string {
  let result = jsonStr;
  
  // Replace all types of quotes with standard double quotes
  result = result.replace(/['']/g, "'");
  result = result.replace(/[""]/g, '"');
  
  // Fix common LLM mistakes
  result = result.replace(/:\s*undefined/g, ': null');
  result = result.replace(/:\s*NaN/g, ': null');
  result = result.replace(/:\s*Infinity/g, ': null');
  
  // Remove BOM and other invisible characters
  result = result.replace(/^\uFEFF/, '');
  
  return result;
}

export function parseStructuredOutput(response: string): StructuredResponse | null {
  if (!response || typeof response !== 'string') {
    return null;
  }

  // PRE-PROCESSING: Remove control characters that break JSON
  let cleanResponse = response.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  try {
    // Strategy 1: Response sudah pure JSON (ideal case)
    const trimmed = cleanResponse.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        // Try direct parse first
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && parsed.action) {
          return parsed as StructuredResponse;
        }
      } catch (e) {
        // Try with sanitization
        try {
          const sanitized = sanitizeJsonString(trimmed);
          const parsed = JSON.parse(sanitized);
          if (parsed && typeof parsed === 'object' && parsed.action) {
            return parsed as StructuredResponse;
          }
        } catch (e2) {
          // Continue to next strategy
        }
      }
    }

    // Strategy 2: JSON dalam markdown code block
    let jsonMatch = cleanResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) {
      // Try without json tag
      jsonMatch = cleanResponse.match(/```\s*(\{[\s\S]*?\})\s*```/);
    }
    
    // Strategy 3: Find JSON object dengan action field
    if (!jsonMatch) {
      jsonMatch = cleanResponse.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
    }
    
    // Strategy 4: Find JSON with "data" array (for business charts without action)
    if (!jsonMatch) {
      // Look for pattern like { "data": [...], "xKey": "...", "yKey": ... }
      const dataMatch = cleanResponse.match(/\{[^{}]*"data"\s*:\s*\[[\s\S]*?\][^{}]*\}/);
      if (dataMatch) {
        jsonMatch = [dataMatch[0]];
      }
    }
    
    // Strategy 5: Extract dari first { sampai last } (aggressive)
    if (!jsonMatch) {
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const potentialJson = cleanResponse.substring(jsonStart, jsonEnd + 1);
        // Validate it's likely JSON by checking for action or data field
        if (potentialJson.includes('"action"') || potentialJson.includes("'action'") || 
            potentialJson.includes('"data"') || potentialJson.includes('"xKey"')) {
          jsonMatch = [potentialJson];
        }
      }
    }
    
    // Strategy 6: Detect formatted data display like "[Memuat Visualisasi Data...]"
    // and try to reconstruct from structured text patterns
    if (!jsonMatch) {
      const dataArrayMatch = cleanResponse.match(/\[\s*\{[^{}]+\}(?:\s*,\s*\{[^{}]+\})*\s*\]/);
      if (dataArrayMatch) {
        // Found a data array, try to construct chart object
        const xKeyMatch = cleanResponse.match(/"xKey"\s*:\s*"([^"]+)"/);
        const yKeyMatch = cleanResponse.match(/"yKey"\s*:\s*(\[[^\]]+\]|"[^"]+")/);
        
        if (xKeyMatch || yKeyMatch) {
          try {
            const dataArray = JSON.parse(dataArrayMatch[0]);
            const xKey = xKeyMatch ? xKeyMatch[1] : Object.keys(dataArray[0] || {})[0] || 'name';
            let yKey: string | string[];
            if (yKeyMatch) {
              yKey = JSON.parse(yKeyMatch[1]);
            } else {
              // Infer yKey from data keys (exclude xKey)
              const keys = Object.keys(dataArray[0] || {}).filter(k => k !== xKey);
              yKey = keys.length === 1 ? keys[0] : keys;
            }
            
            return {
              action: 'show_chart',
              chart_type: 'bar',
              data: dataArray,
              xKey: xKey,
              yKey: yKey,
              title: 'Data Visualization',
            } as StructuredResponse;
          } catch (e) {
            console.warn('Failed to construct chart from data array:', e);
          }
        }
      }
    }

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      
      // Attempt 1: Direct parse
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.action && parsed.data && Array.isArray(parsed.data)) {
            parsed.action = 'show_chart';
          }
          if (parsed.action) {
            return parsed as StructuredResponse;
          }
        }
      } catch (parseError) {
        // Attempt 2: Parse with sanitization
        try {
          const sanitized = sanitizeJsonString(jsonStr);
          const parsed = JSON.parse(sanitized);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.action && parsed.data && Array.isArray(parsed.data)) {
              parsed.action = 'show_chart';
            }
            if (parsed.action) {
              console.log('✅ JSON parsed after sanitization');
              return parsed as StructuredResponse;
            }
          }
        } catch (e2) {
          // Attempt 3: Aggressive fix
          try {
            const aggressiveFixed = attemptAggressiveJsonFix(sanitizeJsonString(jsonStr));
            const parsed = JSON.parse(aggressiveFixed);
            if (parsed && typeof parsed === 'object') {
              if (!parsed.action && parsed.data && Array.isArray(parsed.data)) {
                parsed.action = 'show_chart';
              }
              if (parsed.action) {
                console.log('✅ JSON parsed after aggressive fix');
                return parsed as StructuredResponse;
              }
            }
          } catch (e3) {
            console.warn('❌ Failed to parse JSON even after aggressive fix:', e3);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to parse structured output:', error);
  }

  return null;
}

/**
 * Generate prompt untuk memaksa AI return structured output
 */
export function getStructuredPrompt(
  isMarketRequest: boolean,
  symbol?: string,
  type?: 'crypto' | 'stock',
  chartType?: 'candlestick' | 'line' | 'bar' | 'pie' | 'area'
): string {
  if (!isMarketRequest) {
    return '';
  }

  // Detect chart type from symbol/request if not provided
  const detectedChartType = chartType || 'candlestick';

  return `KAMU ADALAH JSON GENERATOR UNTUK CHART SAHAM/KRIPTO.

ATURAN MUTLAK - TIDAK BOLEH DILANGGAR:
1. KEMBALIKAN HANYA JSON VALID (dimulai { diakhiri })
2. TIDAK BOLEH ada teks sebelum atau setelah JSON
3. TIDAK BOLEH ada markdown (\`\`\`json)
4. TIDAK BOLEH ada komentar di luar JSON
5. TIDAK BOLEH menulis "Here's the chart", "Berikut grafik", dll

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ATURAN FORMAT JSON STRING (KRITIS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Field "message" adalah STRING TUNGGAL
- GUNAKAN \\n untuk ganti baris. CONTOH: "Analisis:\\n1. Point A\\n2. Point B"
- DILARANG menekan ENTER asli di dalam string JSON
- Escape tanda kutip (") dengan backslash (\\")
- JANGAN gunakan trailing comma sebelum } atau ]

CONTOH YANG SALAH - JANGAN LAKUKAN:
❌ "Here's the line chart for GOTO: { ... }"
❌ "Berikut grafik saham GOTO { ... }"
❌ \`\`\`json\n{ ... }\n\`\`\`

CONTOH YANG BENAR - LAKUKAN INI:
✅ { "action": "show_chart", "message": "1. Trend bullish\\n2. RSI 65\\n3. Support di $100", ... }

FORMAT WAJIB:
{
  "action": "show_chart",
  "asset_type": "${type || 'crypto'}",
  "symbol": "${symbol || 'BTC'}",
  "timeframe": "7d",
  "chart_type": "${detectedChartType}",
  "indicators": [],
  "message": "Analisis lengkap dengan \\n untuk line breaks"
}

PENTING: FIELD "message" HARUS BERISI ANALISIS TEKNIKAL LENGKAP DAN NYATA!

⚠️ JANGAN MENGGUNAKAN PLACEHOLDER TEXT SEPERTI:
❌ "ANALISIS LENGKAP DISINI"
❌ "WAJIB DIISI DENGAN BAIK"
❌ "LENGKAP DISINI"
❌ "ANALISIS LENGKAP XRP - WAJIB DIISI"

✅ WAJIB MENULIS ANALISIS NYATA DENGAN DATA YANG DIBERIKAN!

Field "message" WAJIB berisi ANALISIS TEKNIKAL LENGKAP dengan format berikut (MINIMAL 500 KARAKTER):

━━━━━━━━━━━━━━━━━━━━━━
FORMAT WAJIB MESSAGE:
━━━━━━━━━━━━━━━━━━━━━━

1. DATA YANG DIGUNAKAN
   - Timeframe: [sebutkan timeframe yang digunakan]
   - Jumlah data points: [sebutkan jumlah data]
   - Rentang waktu: [dari tanggal - sampai tanggal]

2. FAKTA DARI DATA
   - Harga tertinggi: $[nilai dari data]
   - Harga terendah: $[nilai dari data]
   - Harga saat ini: $[nilai dari data]
   - Rata-rata harga: $[hitung dari data]
   - Volatilitas: [hitung dari data]%
   - Indikator yang terhitung: RSI [nilai], MA20 [nilai], Trend [nilai]

3. ANALISIS TEKNIKAL
   - Interpretasi trend: [bullish/bearish/sideways] dengan alasan berdasarkan pergerakan harga
   - Analisis RSI: [nilai RSI] menunjukkan [overbought/oversold/neutral] karena [alasan]
   - Analisis MA20: Harga [di atas/di bawah] MA20 menunjukkan [momentum bullish/bearish]
   - Level support: $[nilai] berdasarkan [alasan]
   - Level resistance: $[nilai] berdasarkan [alasan]

4. SKENARIO KEMUNGKINAN
   - Skenario 1: [jelaskan kemungkinan dengan probabilitas, bukan kepastian]
   - Skenario 2: [jelaskan alternatif kemungkinan]
   - Gunakan kata: "kemungkinan", "probabilitas", "berpotensi", BUKAN "pasti", "akan", "harus"

5. RISIKO & KETERBATASAN
   - Risiko yang teridentifikasi: [sebutkan risiko berdasarkan data]
   - Keterbatasan analisis: [sebutkan keterbatasan data/indikator]
   - Disclaimer: Analisis ini berdasarkan data historis, bukan jaminan pergerakan masa depan

6. KESIMPULAN SINGKAT
   - Ringkasan dengan rekomendasi monitoring (BUKAN BUY/SELL absolut)
   - Gunakan bahasa: "dapat dipertimbangkan", "perlu monitoring", "hati-hati dengan"

━━━━━━━━━━━━━━━━━━━━━━
CONTOH MESSAGE YANG BENAR:
━━━━━━━━━━━━━━━━━━━━━━

✅ "1. DATA YANG DIGUNAKAN
   - Timeframe: 7 hari
   - Jumlah data points: 168
   - Rentang waktu: 15 Des 2024 - 22 Des 2024
   
2. FAKTA DARI DATA
   - Harga tertinggi: $2.17
   - Harga terendah: $1.98
   - Harga saat ini: $2.04
   - Rata-rata harga: $2.05
   - Volatilitas: 4.2%
   - Indikator yang terhitung: RSI 58.5, MA20 $2.03, Trend bullish
   
3. ANALISIS TEKNIKAL
   [lanjutkan dengan analisis lengkap...]"

━━━━━━━━━━━━━━━━━━━━━━
CONTOH MESSAGE YANG SALAH (JANGAN LAKUKAN):
━━━━━━━━━━━━━━━━━━━━━━

❌ "ANALISIS LENGKAP DISINI" (placeholder)
❌ "WAJIB DIISI DENGAN BAIK" (placeholder)
❌ "Berikut chart ${symbol}" (terlalu pendek)
❌ "Chart sudah ditampilkan" (tidak ada analisis)
❌ Hanya 1-2 kalimat (tidak lengkap)

ATURAN CHART_TYPE:
- Jika user minta "line chart" atau "grafik line" → "line"
- Jika user minta "candlestick" atau "candle" → "candlestick"
- Jika user minta "bar chart" → "bar"
- Default: "candlestick" untuk saham/kripto

ATURAN SYMBOL:
- GOTO → "GOTO"
- Apple → "AAPL"
- Bitcoin → "BTC"
- Gunakan symbol yang user sebutkan

INGAT:
- Response HARUS dimulai { dan diakhiri }
- Field "message" WAJIB diisi dengan analisis yang bermanfaat
- TIDAK ada karakter lain di luar kurung kurawal
- JIKA MELANGGAR = ERROR`;
}
