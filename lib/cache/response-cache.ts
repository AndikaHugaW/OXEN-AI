/**
 * Response Cache Service
 * Caches AI responses to improve performance for repeated queries
 */

import { createClient } from '@/lib/supabase/client';
import crypto from 'crypto';

interface CacheEntry {
  response_text: string;
  hit: boolean;
}

interface CacheOptions {
  ttlDays?: number; // Time to live in days
  model?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate a hash for the query to use as cache key
 */
export function generateQueryHash(query: string, context?: string): string {
  // Normalize the query: lowercase, trim, remove extra spaces
  const normalized = `${query.toLowerCase().trim().replace(/\s+/g, ' ')}${context || ''}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Get cached response for a query
 */
export async function getCachedResponse(query: string, context?: string): Promise<CacheEntry | null> {
  try {
    const supabase = createClient();
    const queryHash = generateQueryHash(query, context);
    
    const { data, error } = await supabase
      .rpc('get_cached_response', { p_query_hash: queryHash });
    
    if (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
    
    if (data && data.length > 0 && data[0].hit) {
      console.log('🎯 Cache HIT for query');
      return {
        response_text: data[0].response_text,
        hit: true
      };
    }
    
    console.log('❌ Cache MISS for query');
    return null;
  } catch (err) {
    console.error('Cache error:', err);
    return null;
  }
}

/**
 * Store response in cache
 */
export async function setCachedResponse(
  query: string,
  response: string,
  options: CacheOptions = {}
): Promise<boolean> {
  try {
    const supabase = createClient();
    const queryHash = generateQueryHash(query);
    const ttlDays = options.ttlDays || 7;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);
    
    const { error } = await supabase
      .from('response_cache')
      .upsert({
        query_hash: queryHash,
        query_text: query,
        response_text: response,
        model_used: options.model || 'gemini-2.0-flash',
        metadata: options.metadata || {},
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'query_hash'
      });
    
    if (error) {
      console.error('Cache store error:', error);
      return false;
    }
    
    console.log('✅ Response cached successfully');
    return true;
  } catch (err) {
    console.error('Cache store error:', err);
    return false;
  }
}

/**
 * Invalidate cache for specific queries (e.g., when data changes)
 */
export async function invalidateCache(pattern?: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    if (pattern) {
      // Delete cache entries matching pattern
      const { error } = await supabase
        .from('response_cache')
        .delete()
        .ilike('query_text', `%${pattern}%`);
      
      if (error) throw error;
    } else {
      // Clean expired cache
      const { error } = await supabase.rpc('clean_expired_cache');
      if (error) throw error;
    }
    
    return true;
  } catch (err) {
    console.error('Cache invalidation error:', err);
    return false;
  }
}

/**
 * Check if a query should be cached
 * Some queries shouldn't be cached (real-time data, personalized content)
 */
export function shouldCacheQuery(query: string): boolean {
  const noCachePatterns = [
    /harga.*sekarang/i,     // Real-time prices
    /harga.*hari ini/i,
    /saat ini/i,
    /live/i,
    /realtime/i,
    /terbaru/i,             // Latest data
    /cuaca/i,               // Weather
    /waktu/i,               // Time
    /tanggal/i,             // Date
  ];
  
  return !noCachePatterns.some(pattern => pattern.test(query));
}
