// Utility untuk parse structured output dari AI
// Memaksa AI mengembalikan JSON untuk actions tertentu

export interface StructuredResponse {
  action: 'show_chart' | 'text_only' | 'show_table';
  message?: string;
  // Untuk chart
  asset_type?: 'crypto' | 'stock';
  symbol?: string;
  timeframe?: string;
  chart_type?: 'candlestick' | 'line' | 'bar' | 'pie' | 'area';
  indicators?: string[];
  chart?: any;
  table?: any;
}

/**
 * Parse structured output dari AI response
 * Mencari JSON di response dan extract action
 */
export function parseStructuredOutput(response: string): StructuredResponse | null {
  if (!response || typeof response !== 'string') {
    return null;
  }

  try {
    // Strategy 1: Response sudah pure JSON (ideal case)
    const trimmed = response.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && parsed.action) {
          return parsed as StructuredResponse;
        }
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Strategy 2: JSON dalam markdown code block
    let jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) {
      // Try without json tag
      jsonMatch = response.match(/```\s*(\{[\s\S]*?\})\s*```/);
    }
    
    // Strategy 3: Find JSON object dengan action field
    if (!jsonMatch) {
      jsonMatch = response.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
    }
    
    // Strategy 4: Extract dari first { sampai last } (aggressive)
    if (!jsonMatch) {
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const potentialJson = response.substring(jsonStart, jsonEnd + 1);
        // Validate it's likely JSON by checking for action field
        if (potentialJson.includes('"action"') || potentialJson.includes("'action'")) {
          jsonMatch = [potentialJson];
        }
      }
    }

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      try {
        const parsed = JSON.parse(jsonStr);
        
        if (parsed && typeof parsed === 'object' && parsed.action) {
          return parsed as StructuredResponse;
        }
      } catch (parseError) {
        // Try to fix common JSON issues
        try {
          // Remove trailing commas
          const fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');
          const parsed = JSON.parse(fixed);
          if (parsed && typeof parsed === 'object' && parsed.action) {
            return parsed as StructuredResponse;
          }
        } catch (e) {
          console.warn('Failed to parse JSON even after fixing:', e);
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

CONTOH YANG SALAH - JANGAN LAKUKAN:
❌ "Here's the line chart for GOTO: { ... }"
❌ "Berikut grafik saham GOTO { ... }"
❌ \`\`\`json\n{ ... }\n\`\`\`

CONTOH YANG BENAR - LAKUKAN INI:
✅ { "action": "show_chart", "message": "Penjelasan analisis...", ... }

FORMAT WAJIB:
{
  "action": "show_chart",
  "asset_type": "${type || 'crypto'}",
  "symbol": "${symbol || 'BTC'}",
  "timeframe": "7d",
  "chart_type": "${detectedChartType}",
  "indicators": [],
  "message": "ANALISIS LENGKAP DISINI - WAJIB DIISI DENGAN BAIK"
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
