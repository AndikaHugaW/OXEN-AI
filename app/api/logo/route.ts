import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Domain mapping for Clearbit logos
const STOCK_DOMAINS: Record<string, string> = {
  // Indonesia
  BBCA: 'bca.co.id',
  BBRI: 'bri.co.id',
  BMRI: 'bankmandiri.co.id',
  TLKM: 'telkom.co.id',
  ASII: 'astra.co.id',
  GOTO: 'goto.com',
  UNVR: 'unilever.co.id',
  ICBP: 'icbpfood.com',
  INDF: 'indofood.com',
  PGAS: 'pertamina.com',
  // US
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  TSLA: 'tesla.com',
  GOOGL: 'google.com',
  AMZN: 'amazon.com',
  META: 'meta.com',
  NVDA: 'nvidia.com',
  NFLX: 'netflix.com',
  JPM: 'jpmorgan.com',
  V: 'visa.com',
  // Add more as needed
};

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

        const imageUrl = res.data?.image?.small || res.data?.image?.thumb || res.data?.image?.large;
        
        if (imageUrl) {
          // Fetch the image and return it
          const imageRes = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
          });
          
          return new NextResponse(imageRes.data, {
            headers: {
              'Content-Type': imageRes.headers['content-type'] || 'image/png',
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
          });
        }
      } catch (error: any) {
        console.warn(`Failed to fetch crypto logo for ${symbol}:`, error.message);
      }
    } else {
      // For stocks, try multiple sources
      const urls: string[] = [];
      
      // Try Clearbit first
      const domain = STOCK_DOMAINS[symbolUpper];
      if (domain) {
        urls.push(`https://logo.clearbit.com/${domain}`);
      }
      
      // IEX Cloud (free tier)
      urls.push(`https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${symbolUpper}.png`);
      
      // Try each URL
      for (const url of urls) {
        try {
          const imageRes = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
            validateStatus: (status) => status === 200,
          });
          
          return new NextResponse(imageRes.data, {
            headers: {
              'Content-Type': imageRes.headers['content-type'] || 'image/png',
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
          });
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

        const imageUrl = res.data?.image?.small || res.data?.image?.thumb || res.data?.image?.large;
        
        if (imageUrl) {
          return NextResponse.json({
            success: true,
            logoUrl: imageUrl,
            proxyUrl: `/api/logo?symbol=${encodeURIComponent(symbol)}&type=crypto`,
          });
        }
      } catch (error: any) {
        console.warn(`Failed to fetch crypto logo for ${symbol}:`, error.message);
      }
    } else {
      // For stocks, return proxy URL
      const domain = STOCK_DOMAINS[symbolUpper];
      if (domain) {
        return NextResponse.json({
          success: true,
          logoUrl: `https://logo.clearbit.com/${domain}`,
          proxyUrl: `/api/logo?symbol=${encodeURIComponent(symbol)}&type=stock`,
        });
      }
      
      // Fallback to IEX
      return NextResponse.json({
        success: true,
        logoUrl: `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${symbolUpper}.png`,
        proxyUrl: `/api/logo?symbol=${encodeURIComponent(symbol)}&type=stock`,
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

