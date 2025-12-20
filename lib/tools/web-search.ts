/**
 * Web Search Service
 * Provides real-time information from the web
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export async function performWebSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ Web Search API Key not configured. Using fallback dummy search.');
    return [
      {
        title: `Search Result for ${query}`,
        url: 'https://example.com/mock-search',
        snippet: `This is a mock search result for "${query}". To enable real search, please configure TAVILY_API_KEY or SERPER_API_KEY in your .env file.`,
        source: 'Oxen AI Mock'
      }
    ];
  }

  try {
    // If using Tavily (Recommended for AI)
    if (process.env.TAVILY_API_KEY) {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: query,
          search_depth: 'smart',
          max_results: 5,
        }),
      });

      if (!response.ok) throw new Error('Tavily search failed');
      const data = await response.json();
      
      return data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        source: new URL(r.url).hostname,
      }));
    }

    // Fallback or other providers can be added here
    return [];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

/**
 * Build search context for LLM
 */
export async function buildSearchContext(query: string): Promise<string> {
  const results = await performWebSearch(query);
  
  if (results.length === 0) return "";

  const contextText = results
    .map((r, i) => `[Source ${i+1}: ${r.title}](${r.url})\n${r.snippet}`)
    .join('\n\n');

  return `
LATEST WEB SEARCH RESULTS FOR: "${query}"

${contextText}

---
Gunakan informasi terbaru di atas untuk menjawab pertanyaan user. Prioritaskan data real-time ini jika ada konflik dengan data historis.
`;
}
