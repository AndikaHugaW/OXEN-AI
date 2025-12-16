import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Manual logo URL mapping - URL gambar langsung untuk logo saham
// Prioritas tertinggi: Jika ada di sini, akan langsung digunakan
// Format: 'SYMBOL': 'https://url-gambar-logo.com/logo.png'
// 
// Catatan:
// - URL harus bisa diakses langsung (public URL)
// - Format gambar: PNG, SVG, JPG, WebP (semua format gambar didukung)
// - Sistem akan verify URL sebelum digunakan
// - Jika URL tidak valid, akan fallback ke sumber lain (Yahoo Finance, Clearbit, IEX)
// 
// INSTRUKSI: Ganti URL di bawah ini dengan URL logo yang ingin Anda gunakan
const MANUAL_LOGO_URLS: Record<string, string> = {
  // ============================================
  // SAHAM INDONESIA (IDX)
  // ============================================
  
  // Banks
  'BBCA': 'https://brandfetch.com/bca.co.id?view=library&library=default&collection=logos&asset=idhro1CkAh&utm_source=https%253A%252F%252Fbrandfetch.com%252Fbca.co.id&utm_medium=copyAction&utm_campaign=brandPageReferral', // Bank Central Asia - GANTI URL INI
  'BBRI': 'https://images.seeklogo.com/logo-png/47/1/bank-rakyat-indonesia-logo-png_seeklogo-474339.png', // Bank Rakyat Indonesia - GANTI URL INI
  'BMRI': 'https://brandfetch.com/bankmandiri.co.id?view=library&library=default&collection=logos&asset=idjQjhX9eu&utm_source=https%253A%252F%252Fbrandfetch.com%252Fbankmandiri.co.id&utm_medium=copyAction&utm_campaign=brandPageReferral', // Bank Mandiri - GANTI URL INI
  'BBNI': 'https://brandfetch.com/bni.co.id?view=library&library=default&collection=logos&asset=idKYuykR2H&utm_source=https%253A%252F%252Fbrandfetch.com%252Fbni.co.id&utm_medium=copyAction&utm_campaign=brandPageReferral', // Bank Negara Indonesia - GANTI URL INI
  'BNGA': 'https://brandfetch.com/cimbniaga.com?view=library&library=default&collection=logos&asset=id1xN4UUwF&utm_source=https%253A%252F%252Fbrandfetch.com%252Fcimbniaga.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Bank CIMB Niaga - GANTI URL INI
  'BJBR': 'https://images.seeklogo.com/logo-png/29/2/bank-bjb-logo-png_seeklogo-298871.png', // Bank Jabar Banten - GANTI URL INI
  'BTPN': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoctbaRZ9gl9l7-qjdTsbi1-qjcvPW1tod2w&s', // Bank BTPN - GANTI URL INI
  'BNII': 'https://brandfetch.com/maybank.com?view=library&library=default&collection=logos&asset=idm2Bxt2XH&utm_source=https%253A%252F%252Fbrandfetch.com%252Fmaybank.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Bank Maybank - GANTI URL INI
  
  // Telecommunications
  'TLKM': 'https://brandlogovector.com/wp-content/uploads/2021/07/Telkom-Indonesia-Logo.png', // Telkom Indonesia - GANTI URL INI
  'EXCL': 'https://brandlogovector.com/wp-content/uploads/2021/07/XL-Axiata-New-Logo.png', // XL Axiata - GANTI URL INI
  'ISAT': 'https://brandlogovector.com/wp-content/uploads/2021/07/IM3-Ooredoo-Logo.png', // Indosat - GANTI URL INI
  
  // Consumer Goods
  'ASII': 'https://brandlogovector.com/wp-content/uploads/2022/02/Astra-Logo-Small.png', // Astra International - GANTI URL INI
  'UNVR': 'https://brandfetch.com/unilever.com?view=library&library=default&collection=logos&asset=id1J06X-Hc&utm_source=https%253A%252F%252Fbrandfetch.com%252Funilever.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Unilever - GANTI URL INI
  'ICBP': 'https://brandfetch.com/indofoodcbp.my?view=library&library=default&collection=logos&asset=idbsA0ZujS&utm_source=https%253A%252F%252Fbrandfetch.com%252Findofoodcbp.my&utm_medium=copyAction&utm_campaign=brandPageReferral', // Indofood CBP - GANTI URL INI
  'INDF': 'https://brandfetch.com/indofood.com?view=library&library=default&collection=logos&asset=idtFHGGt03&utm_source=https%253A%252F%252Fbrandfetch.com%252Findofood.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Indofood - GANTI URL INI
  'MYOR': 'https://brandfetch.com/mayora-mayora.com?view=library&library=default&collection=logos&asset=idnAgke-if&utm_source=https%253A%252F%252Fbrandfetch.com%252Fmayora-mayora.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Mayora - GANTI URL INI
  'GOTO': 'https://brandfetch.com/gotocompany.com?view=library&library=default&collection=logos&asset=id05cInMrD&utm_source=https%253A%252F%252Fbrandfetch.com%252Fgotocompany.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // GoTo - GANTI URL INI
  
  // Energy
  'PGAS': 'https://logo.clearbit.com/pertamina.com', // PGN - GANTI URL INI
  'PTBA': 'https://logo.clearbit.com/ptba.co.id', // Bukit Asam - GANTI URL INI
  'ADRO': 'https://logo.clearbit.com/adaro.com', // Adaro Energy - GANTI URL INI
  'MEDC': 'https://logo.clearbit.com/medcoenergi.com', // Medco Energi - GANTI URL INI
  'BUMI': 'https://logo.clearbit.com/bumiresources.com', // Bumi Resources - GANTI URL INI
  
  // Infrastructure
  'JSMR': 'https://logo.clearbit.com/jsm.co.id', // Jasa Marga - GANTI URL INI
  'WIKA': 'https://logo.clearbit.com/wikainvestama.co.id', // Wijaya Karya - GANTI URL INI
  'ADHI': 'https://logo.clearbit.com/adhi.co.id', // Adhi Karya - GANTI URL INI
  
  // Property
  'BSDE': 'https://s3-symbol-logo.tradingview.com/bumi-serpong-damai--600.png', // BSD - GANTI URL INI
  'CTRA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Ciputra.svg/2560px-Ciputra.svg.png', // Ciputra - GANTI URL INI
  
  // Mining
  'ANTM': 'https://images.seeklogo.com/logo-png/40/3/antam-logo-png_seeklogo-400273.png', // Aneka Tambang - GANTI URL INI
  'INCO': 'https://logo.clearbit.com/vale.com', // Vale Indonesia - GANTI URL INI
  
  // Others
  'KLBF': 'https://logo.clearbit.com/kalbe.co.id', // Kalbe Farma - GANTI URL INI
  'SMGR': 'https://logo.clearbit.com/semenindonesia.com', // Semen Indonesia - GANTI URL INI
  'INTP': 'https://logo.clearbit.com/indocement.co.id', // Indocement - GANTI URL INI
  'CPIN': 'https://logo.clearbit.com/cpin.co.id', // CP Prima - GANTI URL INI
  
  // ============================================
  // SAHAM US (NASDAQ/NYSE)
  // ============================================
  
  'AAPL': 'https://substackcdn.com/image/fetch/$s_!G1lk!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F8ed3d547-94ff-48e1-9f20-8c14a7030a02_2000x2000.jpeg', // Apple - GANTI URL INI
  'MSFT': 'https://brandfetch.com/microsoft.com?view=library&library=default&collection=logos&asset=ideitptAmZ&utm_source=https%253A%252F%252Fbrandfetch.com%252Fmicrosoft.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Microsoft - GANTI URL INI
  'TSLA': 'https://brandfetch.com/tesla.com?view=library&library=default&collection=logos&asset=id_VOBuiJY&utm_source=https%253A%252F%252Fbrandfetch.com%252Ftesla.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Tesla - GANTI URL INI
  'GOOGL': 'https://static.vecteezy.com/system/resources/previews/046/861/647/non_2x/google-logo-transparent-background-free-png.png', // Google - GANTI URL INI
  'GOOG': 'https://logo.clearbit.com/google.com', // Google (Class C) - GANTI URL INI
  'AMZN': 'https://brandfetch.com/amazon.com?view=library&library=default&collection=logos&asset=id0441Mr_Z&utm_source=https%253A%252F%252Fbrandfetch.com%252Famazon.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Amazon - GANTI URL INI
  'META': 'https://brandfetch.com/meta.com?view=library&library=default&collection=logos&asset=id3TxmQZUx&utm_source=https%253A%252F%252Fbrandfetch.com%252Fmeta.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Meta (Facebook) - GANTI URL INI
  'NVDA': 'https://e7.pngegg.com/pngimages/455/334/png-clipart-nvidia-tesla-geforce-graphics-cards-video-adapters-nvidia-gameworks-nvidia-thumbnail.png', // Nvidia - GANTI URL INI
  'NFLX': 'https://images.ctfassets.net/y2ske730sjqp/5QQ9SVIdc1tmkqrtFnG9U1/de758bba0f65dcc1c6bc1f31f161003d/BrandAssets_Logos_02-NSymbol.jpg?w=940', // Netflix - GANTI URL INI
  'JPM': 'https://logos-world.net/wp-content/uploads/2021/02/JP-Morgan-Chase-Emblem.png', // JPMorgan - GANTI URL INI
  'V': 'https://brandfetch.com/visa.com?view=library&library=default&collection=logos&asset=idDpIqdw_U&utm_source=https%253A%252F%252Fbrandfetch.com%252Fvisa.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Visa - GANTI URL INI
  'MA': 'https://www.mastercard.com/content/dam/public/mastercardcom/id/id/logos/mastercard-og-image.png', // Mastercard - GANTI URL INI
  'JNJ': 'https://images.seeklogo.com/logo-png/50/1/johnson-johnson-logo-png_seeklogo-500414.png', // Johnson & Johnson - GANTI URL INI
  'WMT': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Walmart_spark_%282025%29.svg/1065px-Walmart_spark_%282025%29.svg.png', // Walmart - GANTI URL INI
  'DIS': 'https://brandfetch.com/disney.com?view=library&library=default&collection=logos&asset=idE1gjOgPC&utm_source=https%253A%252F%252Fbrandfetch.com%252Fdisney.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Disney - GANTI URL INI
  'BAC': 'https://brandfetch.com/bankofamerica.com?view=library&library=default&collection=logos&asset=idZSNC7EK_&utm_source=https%253A%252F%252Fbrandfetch.com%252Fbankofamerica.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Bank of America - GANTI URL INI
  'XOM': 'https://brandfetch.com/exxonmobil.com?view=library&library=default&collection=logos&asset=id8fqYRl4K&utm_source=https%253A%252F%252Fbrandfetch.com%252Fexxonmobil.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // ExxonMobil - GANTI URL INI
  'CVX': 'https://brandfetch.com/chevron.com?view=library&library=default&collection=logos&asset=id9Z7Cs80q&utm_source=https%253A%252F%252Fbrandfetch.com%252Fchevron.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Chevron - GANTI URL INI
  'HD': 'https://brandfetch.com/homedepot.com?view=library&library=default&collection=logos&asset=idqoIQryvr&utm_source=https%253A%252F%252Fbrandfetch.com%252Fhomedepot.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Home Depot - GANTI URL INI
  'MCD': 'https://brandfetch.com/mcdonalds.com?view=library&library=default&collection=logos&asset=idFSig22Wx&utm_source=https%253A%252F%252Fbrandfetch.com%252Fmcdonalds.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // McDonald's - GANTI URL INI
  'KO': 'https://brandfetch.com/coca-cola.com?view=library&library=default&collection=logos&asset=id-RZiYBhJ&utm_source=https%253A%252F%252Fbrandfetch.com%252Fcoca-cola.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Coca-Cola - GANTI URL INI
  'PEP': 'https://brandfetch.com/pepsico.com?view=library&library=default&collection=logos&asset=idI-zvRe5i&utm_source=https%253A%252F%252Fbrandfetch.com%252Fpepsico.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // PepsiCo - GANTI URL INI
  'NKE': 'https://brandfetch.com/nike.com?view=library&library=default&collection=logos&asset=idszWHJdtE&utm_source=https%253A%252F%252Fbrandfetch.com%252Fnike.com&utm_medium=copyAction&utm_campaign=brandPageReferral', // Nike - GANTI URL INI
  
  // Tambahkan lebih banyak saham sesuai kebutuhan
  // Format: 'SYMBOL': 'https://url-logo-anda.com/logo.png',
};

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
  // Add more as needed
};

// Normalize stock symbol for Yahoo Finance (add .JK for Indonesian stocks)
function normalizeStockSymbolForYahoo(symbol: string): string {
  const symbolUpper = symbol.toUpperCase();
  
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
  
  if (indonesianStocks.includes(symbolUpper) && !symbolUpper.includes('.')) {
    return `${symbolUpper}.JK`;
  }
  
  if (symbolUpper.endsWith('.JK')) {
    return symbolUpper;
  }
  
  return symbolUpper;
}

function normalizeCryptoSymbolToCoinId(symbol: string): string {
  const mapping: Record<string, string> = {
    btc: 'bitcoin',
    eth: 'ethereum',
    bnb: 'binancecoin',
    sol: 'solana',
    ada: 'cardano',
    xrp: 'ripple',
    dot: 'polkadot',
    matic: 'matic-network',
    avax: 'avalanche-2',
    doge: 'dogecoin',
    ltc: 'litecoin',
    link: 'chainlink',
    atom: 'cosmos',
    etc: 'ethereum-classic',
    xlm: 'stellar',
    algo: 'algorand',
    vet: 'vechain',
    icp: 'internet-computer',
    trx: 'tron',
  };
  const normalized = symbol.toLowerCase();
  return mapping[normalized] || normalized;
}

/**
 * Proxy logo for crypto and stocks
 * Returns the logo image directly or redirects to the logo URL
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || 'stock'; // 'crypto' or 'stock'

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const symbolUpper = symbol.toUpperCase();

    if (type === 'crypto') {
      // For crypto, use CoinGecko
      try {
        const coinId = normalizeCryptoSymbolToCoinId(symbol);
        const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
        
        const res = await axios.get(url, {
          timeout: 10000,
          headers: { Accept: 'application/json' },
        });

        // Try different image sizes - prefer large for better quality
        const imageUrl = res.data?.image?.large || res.data?.image?.small || res.data?.image?.thumb;
        
        if (imageUrl) {
          try {
            // Fetch the image and return it
            const imageRes = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              timeout: 10000,
              validateStatus: (status) => status === 200,
            });
            
            // Verify it's actually an image
            const contentType = imageRes.headers['content-type'] || '';
            if (contentType.startsWith('image/')) {
              return new NextResponse(imageRes.data, {
                headers: {
                  'Content-Type': contentType,
                  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
                  'Access-Control-Allow-Origin': '*',
                },
              });
            }
          } catch (imgError: any) {
            console.warn(`Failed to fetch image from ${imageUrl}:`, imgError.message);
            // Try smaller size if large failed
            const fallbackUrl = res.data?.image?.small || res.data?.image?.thumb;
            if (fallbackUrl && fallbackUrl !== imageUrl) {
              try {
                const fallbackRes = await axios.get(fallbackUrl, {
                  responseType: 'arraybuffer',
                  timeout: 10000,
                  validateStatus: (status) => status === 200,
                });
                return new NextResponse(fallbackRes.data, {
                  headers: {
                    'Content-Type': fallbackRes.headers['content-type'] || 'image/png',
                    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
                    'Access-Control-Allow-Origin': '*',
                  },
                });
              } catch {
                // Fallback also failed
              }
            }
          }
        }
      } catch (error: any) {
        console.warn(`Failed to fetch crypto logo for ${symbol}:`, error.message);
      }
    } else {
      // For stocks, try multiple sources in order of preference
      const urls: string[] = [];
      const normalizedSymbol = normalizeStockSymbolForYahoo(symbol);
      const symbolUpper = symbol.toUpperCase().replace('.JK', '');
      
      // 0. PRIORITAS TERTINGGI: Manual logo URL mapping (URL gambar langsung)
      if (MANUAL_LOGO_URLS[symbolUpper]) {
        urls.push(MANUAL_LOGO_URLS[symbolUpper]);
        console.log(`✅ [Logo API GET] Using manual logo URL for ${symbol}:`, MANUAL_LOGO_URLS[symbolUpper]);
      }
      
      // 1. Try Yahoo Finance quote summary (real company logos)
      try {
        const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${normalizedSymbol}?modules=assetProfile`;
        const yahooRes = await axios.get(yahooUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });
        
        // Yahoo Finance may have logo in assetProfile
        const logoUrl = yahooRes.data?.quoteSummary?.result?.[0]?.assetProfile?.logoUrl;
        if (logoUrl) {
          urls.push(logoUrl);
        }
      } catch (error: any) {
        // Yahoo Finance may not have logo, continue to other sources
        console.log(`Yahoo Finance logo not available for ${symbol}`);
      }
      
      // 2. Try Clearbit (company website logos)
      const domain = STOCK_DOMAINS[symbolUpper];
      if (domain) {
        urls.push(`https://logo.clearbit.com/${domain}`);
      }
      
      // 3. IEX Cloud (free tier - real stock logos)
      urls.push(`https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${symbolUpper}.png`);
      
      // 4. Alternative: Financial Modeling Prep style (if available)
      // Note: Requires API key, skipping for now
      
      // Try each URL in order
      for (const url of urls) {
        try {
          const imageRes = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
            validateStatus: (status) => status === 200,
          });
          
          // Verify it's actually an image
          const contentType = imageRes.headers['content-type'] || '';
          if (contentType.startsWith('image/')) {
            return new NextResponse(imageRes.data, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
              },
            });
          }
        } catch (error: any) {
          // Try next URL
          continue;
        }
      }
    }

    // If all fail, return 404
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching logo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logo', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to get logo URL (for easier client-side usage)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, type = 'stock' } = body;

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
    }

    const symbolUpper = symbol.toUpperCase();

    if (type === 'crypto') {
      // For crypto, use CoinGecko
      try {
        const coinId = normalizeCryptoSymbolToCoinId(symbol);
        const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
        
        const res = await axios.get(url, {
          timeout: 10000,
          headers: { Accept: 'application/json' },
        });

        // Try different image sizes - prefer large for better quality
        const imageUrl = res.data?.image?.large || res.data?.image?.small || res.data?.image?.thumb;
        
        if (imageUrl) {
          // Verify the image URL is valid
          try {
            const testRes = await axios.head(imageUrl, { 
              timeout: 3000, 
              validateStatus: (s) => s < 400 
            });
            if (testRes.headers['content-type']?.startsWith('image/')) {
              return NextResponse.json({
                success: true,
                logoUrl: imageUrl,
                proxyUrl: `/api/logo?symbol=${encodeURIComponent(symbol)}&type=crypto`,
              });
            }
          } catch {
            // Image URL might still be valid, return it anyway
            console.log(`Could not verify image URL for ${symbol}, but returning it anyway`);
          }
          
          // Return even if verification failed (might be CORS issue)
          return NextResponse.json({
            success: true,
            logoUrl: imageUrl,
            proxyUrl: `/api/logo?symbol=${encodeURIComponent(symbol)}&type=crypto`,
          });
        }
      } catch (error: any) {
        console.warn(`Failed to fetch crypto logo for ${symbol}:`, error.message);
        // Return error but don't throw - let frontend handle fallback
        return NextResponse.json({
          success: false,
          error: `Failed to fetch crypto logo: ${error.message}`,
        }, { status: 404 });
      }
    } else {
      // For stocks, try to get real logo from multiple sources
      const normalizedSymbol = normalizeStockSymbolForYahoo(symbol);
      const symbolUpper = symbol.toUpperCase().replace('.JK', '');
      let logoUrl: string | null = null;
      let verifiedUrl: string | null = null;
      
      // 0. PRIORITAS TERTINGGI: Manual logo URL mapping (URL gambar langsung)
      if (MANUAL_LOGO_URLS[symbolUpper]) {
        const manualUrl = MANUAL_LOGO_URLS[symbolUpper];
        console.log(`✅ [Logo API POST] Using manual logo URL for ${symbol}:`, manualUrl);
        
        // Verify manual URL is valid
        try {
          const testRes = await axios.head(manualUrl, { 
            timeout: 3000, 
            validateStatus: (s) => s < 400 
          });
          if (testRes.headers['content-type']?.startsWith('image/')) {
            verifiedUrl = manualUrl;
            logoUrl = manualUrl;
            console.log(`✅ [Logo API POST] Manual logo URL verified for ${symbol}`);
          } else {
            console.warn(`⚠️ [Logo API POST] Manual logo URL invalid content-type for ${symbol}, trying other sources...`);
          }
        } catch (error) {
          console.warn(`⚠️ [Logo API POST] Manual logo URL failed verification for ${symbol}, trying other sources...`);
        }
      }
      
      // 1. Try Yahoo Finance quote summary (real company logos) - hanya jika manual URL tidak ada
      if (!verifiedUrl) {
        try {
        const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${normalizedSymbol}?modules=assetProfile`;
        const yahooRes = await axios.get(yahooUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });
        
        logoUrl = yahooRes.data?.quoteSummary?.result?.[0]?.assetProfile?.logoUrl || null;
        
        // Verify Yahoo Finance logo is valid
        if (logoUrl) {
          try {
            const testRes = await axios.head(logoUrl, { timeout: 3000, validateStatus: (s) => s < 400 });
            if (testRes.headers['content-type']?.startsWith('image/')) {
              verifiedUrl = logoUrl;
            }
          } catch {
            logoUrl = null; // Logo URL invalid, try next source
          }
        }
        } catch (error: any) {
          // Yahoo Finance may not have logo, continue to other sources
          console.log(`Yahoo Finance logo not available for ${symbol}, trying alternatives...`);
        }
      }
      
      // 2. Fallback to Clearbit (company website logos) - hanya jika manual/Yahoo tidak ada
      if (!verifiedUrl) {
        const domain = STOCK_DOMAINS[symbolUpper];
        if (domain) {
          verifiedUrl = `https://logo.clearbit.com/${domain}`;
          logoUrl = verifiedUrl;
        }
      }
      
      // 3. Final fallback to IEX Cloud (real stock logos) - hanya jika semua sumber lain gagal
      if (!verifiedUrl) {
        verifiedUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${symbolUpper}.png`;
        logoUrl = verifiedUrl;
      }
      
      // Return direct logoUrl from browser (can be used directly in img src)
      // Also provide proxyUrl as fallback if CORS issues occur
      return NextResponse.json({
        success: true,
        logoUrl: logoUrl || verifiedUrl, // Direct URL from browser - use this in img src
        proxyUrl: `/api/logo?symbol=${encodeURIComponent(symbol)}&type=stock`, // Proxy URL as fallback
      });
    }

    return NextResponse.json({ success: false, error: 'Logo not found' }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching logo URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logo', message: error.message },
      { status: 500 }
    );
  }
}

