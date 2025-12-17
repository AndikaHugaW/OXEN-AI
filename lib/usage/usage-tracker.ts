/**
 * Usage Tracking Service
 * Tracks API usage for cost management and analytics
 */

import { createClient } from '@/lib/supabase/client';

export interface UsageLog {
  queryType: 'chat' | 'market_analysis' | 'comparison' | 'rag' | 'letter' | 'other';
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cached: boolean;
  metadata?: Record<string, any>;
}

/**
 * Log API usage
 */
export async function logUsage(userId: string | null, usage: UsageLog): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 1. Insert detailed log
    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        query_type: usage.queryType,
        model_used: usage.modelUsed,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        latency_ms: usage.latencyMs,
        cached: usage.cached,
        metadata: usage.metadata || {}
      });
    
    if (error) {
      console.error('Usage log error:', error);
      // Don't fail the whole request just because logging failed, but return false
      return false;
    }

    // 2. Update Daily Summary (Fire and Forget)
    // We call the DB function we created in migration
    const totalTokens = (usage.inputTokens || 0) + (usage.outputTokens || 0);
    
    supabase.rpc('update_daily_health_stat', {
        p_tokens: totalTokens,
        p_latency: usage.latencyMs,
        p_is_error: false, // Default success log
        p_is_cache_hit: usage.cached
    }).then(({ error: rpcError }) => {
        if (rpcError) console.warn('Failed to update daily stats:', rpcError);
    });

    // 3. Track Document Usage (if RAG)
    // If metadata contains source_documents (array of IDs)
    if (usage.metadata?.source_documents && Array.isArray(usage.metadata.source_documents) && userId) {
        trackDocumentUsage(userId, usage.metadata.source_documents, usage.metadata.rag_relevance);
    }
    
    return true;
  } catch (err) {
    console.error('Usage log error:', err);
    return false;
  }
}

/** 
 * Track which documents were used in a query
 */
export async function trackDocumentUsage(
    userId: string, 
    documentIds: string[], 
    relevanceScores?: number[]
) {
    if (!documentIds || documentIds.length === 0) return;

    try {
        const supabase = createClient();
        const records = documentIds.map((docId, index) => ({
            document_id: docId,
            user_id: userId,
            relevance_score: relevanceScores ? relevanceScores[index] : null,
            // query_id: we don't have usage_log id here easily without extra roundtrip, 
            // so we skip link or handle it differently if critical
        }));

        await supabase.from('document_usage').insert(records);
    } catch (err) {
        console.warn('Failed to track document usage:', err);
    }
}

/**
 * Get user's usage statistics
 */
export async function getUserUsageStats(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    queryType?: string;
  } = {}
): Promise<{
  totalQueries: number;
  totalTokens: number;
  cachedQueries: number;
  avgLatency: number;
  byType: Record<string, number>;
} | null> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId);
    
    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    
    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }
    
    if (options.queryType) {
      query = query.eq('query_type', options.queryType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Usage stats error:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return {
        totalQueries: 0,
        totalTokens: 0,
        cachedQueries: 0,
        avgLatency: 0,
        byType: {}
      };
    }
    
    const stats = {
      totalQueries: data.length,
      totalTokens: data.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
      cachedQueries: data.filter(log => log.cached).length,
      avgLatency: Math.round(data.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / data.length),
      byType: {} as Record<string, number>
    };
    
    // Count by type
    data.forEach(log => {
      stats.byType[log.query_type] = (stats.byType[log.query_type] || 0) + 1;
    });
    
    return stats;
  } catch (err) {
    console.error('Usage stats error:', err);
    return null;
  }
}

/**
 * Check if user has exceeded their quota
 */
export async function checkUserQuota(
  userId: string,
  quotaLimit: number = 100000 // Default 100k tokens per period
): Promise<{
  used: number;
  limit: number;
  remaining: number;
  exceeded: boolean;
}> {
  try {
    const supabase = createClient();
    
    // Get usage for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('usage_logs')
      .select('total_tokens')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());
    
    if (error) {
      console.error('Quota check error:', error);
      return { used: 0, limit: quotaLimit, remaining: quotaLimit, exceeded: false };
    }
    
    const used = (data || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0);
    const remaining = Math.max(0, quotaLimit - used);
    
    return {
      used,
      limit: quotaLimit,
      remaining,
      exceeded: used >= quotaLimit
    };
  } catch (err) {
    console.error('Quota check error:', err);
    return { used: 0, limit: quotaLimit, remaining: quotaLimit, exceeded: false };
  }
}

/**
 * Estimate tokens from text (rough approximation)
 * ~4 characters per token for English, ~2-3 for Indonesian
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English, 2.5 for Indonesian
  const avgCharsPerToken = 3;
  return Math.ceil(text.length / avgCharsPerToken);
}

/**
 * Create a usage tracker for timing requests
 */
export function createUsageTracker() {
  const startTime = Date.now();
  
  return {
    getLatencyMs: () => Date.now() - startTime,
    
    log: async (
      userId: string | null,
      data: Omit<UsageLog, 'latencyMs'>
    ) => {
      return logUsage(userId, {
        ...data,
        latencyMs: Date.now() - startTime
      });
    }
  };
}
