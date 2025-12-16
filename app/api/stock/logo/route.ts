import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Domain mapping for Clearbit logos - Extended for Indonesian and foreign stocks
const STOCK_DOMAINS: Record<string, string> = {
  // Indonesia - Banks
  BBCA: 'bca.co.id',
  BBRI: 'bri.co.id',
  BMRI: 'bankmandiri.co.id',
  BBNI: 'bni.co.id',
  BNGA: 'banknegara.co.id',
  BJBR: 'bankjbr.co.id',
  BTPN: 'btpn.com',
  BNII: 'maybank.co.id',
  // Indonesia - Telecommunications
  TLKM: 'telkom.co.id',
  EXCL: 'xl.co.id',
  ISAT: 'indosat.com',
  // Indonesia - Consumer Goods
  ASII: 'astra.co.id',
  UNVR: 'unilever.co.id',
  ICBP: 'icbpfood.com',
  INDF: 'indofood.com',
  MYOR: 'mayora.co.id',
  ROTI: 'nusantara.co.id',
  ULTJ: 'ultrajaya.co.id',
  // Indonesia - Energy
  PGAS: 'pertamina.com',
  PTBA: 'ptba.co.id',
  ADRO: 'adaro.com',
  MEDC: 'medcoenergi.com',
  BUMI: 'bumiresources.com',
  // Indonesia - Infrastructure
  JSMR: 'jsm.co.id',
  WIKA: 'wikainvestama.co.id',
  WEGE: 'wijayakarya.co.id',
  ADHI: 'adhi.co.id',
  // Indonesia - Property
  BSDE: 'bsd.co.id',
  CTRA: 'ciputra.com',
  DMAS: 'dmas.co.id',
  // Indonesia - Mining
  ANTM: 'antam.com',
  INCO: 'vale.com',
  // Indonesia - Others
  KLBF: 'kalbe.co.id',
  GGRM: 'ggrm.co.id',
  SMGR: 'semenindonesia.com',
  INTP: 'indocement.co.id',
  TKIM: 'pabrik-kertas.com',
  CPIN: 'cpin.co.id',
  SRIL: 'sri-rejeki-ismaya.com',
  AKRA: 'akra.co.id',
  GOTO: 'goto.com',
  // US Stocks
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  TSLA: 'tesla.com',
  GOOGL: 'google.com',
  GOOG: 'google.com',
  AMZN: 'amazon.com',
  META: 'meta.com',
  NVDA: 'nvidia.com',
  NFLX: 'netflix.com',
  JPM: 'jpmorgan.com',
  V: 'visa.com',
  MA: 'mastercard.com',
  JNJ: 'jnj.com',
  WMT: 'walmart.com',
  PG: 'pg.com',
  DIS: 'disney.com',
  BAC: 'bankofamerica.com',
  XOM: 'exxonmobil.com',
  CVX: 'chevron.com',
  HD: 'homedepot.com',
  MCD: 'mcdonalds.com',
  KO: 'coca-cola.com',
  PEP: 'pepsico.com',
  NKE: 'nike.com',
};

// Normalize stock symbol for Yahoo Finance (add .JK for Indonesian stocks)
function normalizeStockSymbolForYahoo(symbol: string): string {
  const symbolUpper = symbol.toUpperCase().replace('.JK', '');
  
  // Indonesian stocks list
  const indonesianStocks = [
    'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BNGA', 'BJBR', 'BTPN', 'BNII',
    'TLKM', 'EXCL', 'ISAT',
    'ASII', 'UNVR', 'ICBP', 'INDF', 'MYOR', 'ROTI', 'ULTJ',
    'PGAS', 'PTBA', 'ADRO', 'MEDC', 'BUMI',
    'JSMR', 'WIKA', 'WEGE', 'ADHI',
    'BSDE', 'CTRA', 'DMAS',
    'ANTM', 'INCO',
    'KLBF', 'GGRM', 'SMGR', 'INTP', 'TKIM', 'CPIN', 'SRIL', 'AKRA', 'GOTO'
  ];

  if (indonesianStocks.includes(symbolUpper)) {
    return `${symbolUpper}.JK`;
  }

  return symbolUpper;
}

/**
 * GET /api/stock/logo?symbol=BBCA
 * 
 * Mengembalikan URL logo perusahaan saham langsung yang bisa digunakan di browser.
 * Endpoint ini mencoba berbagai sumber untuk mendapatkan logo asli perusahaan:
 * 1. Yahoo Finance Quote Summary (logo resmi dari perusahaan)
 * 2. Clearbit (logo dari website perusahaan)
 * 3. IEX Cloud (logo saham)
 * 
 * Response:
 * {
 *   "success": true,
 *   "symbol": "BBCA",
 *   "logoUrl": "https://logo.clearbit.com/bca.co.id",
 *   "companyName": "PT Bank Central Asia Tbk",
 *   "source": "clearbit" // "yahoo", "clearbit", atau "iex"
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbol parameter is required',
          message: 'Gunakan format: /api/stock/logo?symbol=BBCA',
        },
        { status: 400 }
      );
    }

    const symbolUpper = symbol.toUpperCase().replace('.JK', '');
    const normalizedSymbol = normalizeStockSymbolForYahoo(symbol);
    
    console.log(`📊 [Stock Logo API] Fetching logo for ${symbol} (normalized: ${normalizedSymbol})`);

    let logoUrl: string | null = null;
    let companyName: string | null = null;
    let source: 'yahoo' | 'clearbit' | 'iex' = 'iex';

    // 1. Try Yahoo Finance Quote Summary (logo resmi dari perusahaan)
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${normalizedSymbol}?modules=assetProfile`;
      const yahooRes = await axios.get(yahooUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      const assetProfile = yahooRes.data?.quoteSummary?.result?.[0]?.assetProfile;
      if (assetProfile) {
        logoUrl = assetProfile.logoUrl || null;
        companyName = assetProfile.name || assetProfile.longName || null;

        // Verify Yahoo Finance logo is valid
        if (logoUrl) {
          try {
            const testRes = await axios.head(logoUrl, { 
              timeout: 3000, 
              validateStatus: (s) => s < 400 
            });
            if (testRes.headers['content-type']?.startsWith('image/')) {
              source = 'yahoo';
              console.log(`✅ [Stock Logo API] Yahoo Finance logo found for ${symbol}:`, logoUrl);
            } else {
              logoUrl = null; // Logo URL invalid, try next source
            }
          } catch {
            logoUrl = null; // Logo URL invalid, try next source
          }
        }
      }
    } catch (error: any) {
      console.log(`⚠️ [Stock Logo API] Yahoo Finance logo not available for ${symbol}, trying alternatives...`);
    }

    // 2. Fallback to Clearbit (company website logos) - always available for mapped domains
    if (!logoUrl) {
      const domain = STOCK_DOMAINS[symbolUpper];
      if (domain) {
        logoUrl = `https://logo.clearbit.com/${domain}`;
        source = 'clearbit';
        console.log(`✅ [Stock Logo API] Using Clearbit logo for ${symbol}:`, logoUrl);
      }
    }

    // 3. Final fallback to IEX Cloud (real stock logos)
    if (!logoUrl) {
      logoUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${symbolUpper}.png`;
      source = 'iex';
      console.log(`✅ [Stock Logo API] Using IEX Cloud logo for ${symbol}:`, logoUrl);
    }

    if (!logoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Logo not found',
          message: `Tidak dapat menemukan logo untuk simbol saham ${symbol}`,
          symbol: symbolUpper,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      symbol: symbolUpper,
      logoUrl, // URL langsung yang bisa digunakan di browser: <img src={logoUrl} />
      companyName: companyName || undefined,
      source, // Sumber logo: "yahoo", "clearbit", atau "iex"
    });
  } catch (error: any) {
    console.error(`❌ [Stock Logo API] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message || 'Terjadi kesalahan saat mengambil logo',
      },
      { status: 500 }
    );
  }
}

