import { NextRequest, NextResponse } from 'next/server';
import { processMarketComparison } from '@/lib/llm/handlers/market-analysis-handler';
import { RequestMode } from '@/lib/llm/ai-request-router';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, timeframe, persona } = body;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ success: false, error: 'Symbols array is required' }, { status: 400 });
    }

    console.log(`🤖 [Analyze Comparison API] Re-analyzing ${symbols.join(', ')} for ${timeframe} with persona ${persona}`);

    // Call the internal handler directly
    const result = await processMarketComparison({
      message: `Bandingkan ${symbols.join(', ')} timeframe ${timeframe}`,
      persona: persona || 'investor',
      mode: RequestMode.MARKET_ANALYSIS,
    }, symbols, timeframe);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ [Analyze Comparison API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
