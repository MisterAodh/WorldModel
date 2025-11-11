import fetch from 'node-fetch';

type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

export async function webSearch(query: string, maxResults: number = 5): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    // If no API key, return empty; chat will gracefully message limitations.
    return [];
  }

  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: Math.min(maxResults, 10),
      include_answer: false,
      include_domains: [],
      exclude_domains: [],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Tavily search failed: ${resp.status} ${resp.statusText}`);
  }

  const json = await resp.json();
  const results = (json?.results || []) as Array<any>;
  return results.slice(0, maxResults).map((r) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    content: r.content ?? r.snippet ?? '',
  }));
}


