/**
 * Analytics API Route
 * Aggregates usage data for dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. RBAC Check
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    const role = profile?.role || 'user';
    if (role !== 'admin') {
       return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    // Parameters (optional date range)
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d'; // 7d, 30d, 90d
    
    const startDate = new Date();
    if (range === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (range === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate.setDate(startDate.getDate() - 30); // Default 30d

    // 2. Fetch Global Usage Stats (Admin sees ALL)
    const { data: usageLogs, error: usageError } = await supabase
      .from('usage_logs')
      .select('query_type, model_used, total_tokens, cached, latency_ms, created_at')
      // REMOVED .eq('user_id', user.id) -> Admin sees all
      .gte('created_at', startDate.toISOString());

    if (usageError) throw usageError;

    // 3. Fetch Daily Health Stats (New Advanced Metrics)
    const { data: healthStats, error: healthError } = await supabase
      .from('daily_ai_health')
      .select('*')
      .gte('date', startDate.toISOString());

    // Process Data
    const totalRequests = usageLogs?.length || 0;
    const totalTokens = usageLogs?.reduce((acc, log) => acc + (log.total_tokens || 0), 0) || 0;
    const cachedRequests = usageLogs?.filter(log => log.cached).length || 0;
    
    // Calculate simple stats
    const cacheRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0;
    const avgLatency = totalRequests > 0 
      ? usageLogs?.reduce((acc, log) => acc + (log.latency_ms || 0), 0) / totalRequests 
      : 0;

    // Estimate Cost Savings (Assume roughly $0.50 per 1M tokens input/output blended for high performance models)
    const avgTokensPerReq = totalRequests > 0 ? totalTokens / totalRequests : 0;
    const savedTokens = cachedRequests * avgTokensPerReq;
    const estimatedSavings = (savedTokens / 1000000) * 0.50; // $0.50 per 1M tokens
    const estimatedCost = (totalTokens / 1000000) * 0.50;

    // Aggregate Health Metrics
    const totalErrors = healthStats?.reduce((acc, day) => acc + (day.error_count || 0), 0) || 0;
    const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 100;
    
    // Calculate Accuracy (Avg Rating)
    // Since feedback is in 'messages' table, we can query that or rely on daily_ai_health if we aggregated it there.
    // For now let's query messages table directly for ratings in this period for accuracy
    const { data: feedbackData } = await supabase
       .from('messages')
       .select('rating')
       .neq('rating', 0) // Only rated messages
       .gte('created_at', startDate.toISOString());
    
    let avgAccuracy = 0; // % of positive ratings
    if (feedbackData && feedbackData.length > 0) {
        const positive = feedbackData.filter(m => m.rating === 1).length;
        avgAccuracy = (positive / feedbackData.length) * 100;
    }

    // Group by Day for Charts
    const historyByDay: Record<string, {date: string, tokens: number, requests: number, errors: number}> = {};
    
    usageLogs?.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!historyByDay[date]) {
        historyByDay[date] = { date, tokens: 0, requests: 0, errors: 0 };
      }
      historyByDay[date].tokens += (log.total_tokens || 0);
      historyByDay[date].requests += 1;
    });
    
    // Add errors from health stats if available per day
    healthStats?.forEach(stat => {
        if (historyByDay[stat.date as string]) {
            historyByDay[stat.date as string].errors = stat.error_count;
        }
    });

    // Fill missing days
    const chartData = [];
    const daysToFill = range === '7d' ? 7 : (range === '90d' ? 90 : 30);
    for (let i = daysToFill - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartData.push(historyByDay[dateStr] || { date: dateStr, tokens: 0, requests: 0, errors: 0 });
    }

    // Group by Type (Pie Chart data)
    const typeDistribution: Record<string, number> = {};
    usageLogs?.forEach(log => {
      const type = log.query_type || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    return NextResponse.json({
      summary: {
        totalRequests,
        totalTokens,
        cacheRate: Math.round(cacheRate * 10) / 10,
        avgLatency: Math.round(avgLatency),
        estimatedCost: estimatedCost.toFixed(4),
        estimatedSavings: estimatedSavings.toFixed(4),
        successRate: Math.round(successRate * 10) / 10,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        errorCount: totalErrors
      },
      chartData,
      typeDistribution
    });

  } catch (error: any) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
