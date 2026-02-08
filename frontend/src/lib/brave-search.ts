// Brave Search API integration
const BRAVE_API_KEY = import.meta.env.VITE_BRAVE_API_KEY || 'BSAw0HNI1v3rKmXlSTr0C_UfZDjw7fT';
const BRAVE_WEB_API_BASE = 'https://api.search.brave.com/res/v1/web/search';
const BRAVE_NEWS_API_BASE = 'https://api.search.brave.com/res/v1/news/search';

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  published_date?: string;
  language?: string;
  family_friendly?: boolean;
  type?: string;
  subtype?: string;
}

export interface BraveSearchResponse {
  web?: {
    results: BraveSearchResult[];
  };
  news?: {
    results: BraveSearchResult[];
  };
  mixed?: {
    results: BraveSearchResult[];
  };
  query?: {
    original: string;
    display: string;
  };
}

export async function searchBrave(query: string, count: number = 10, type: 'web' | 'news' = 'web'): Promise<BraveSearchResult[]> {
  try {
    const apiBase = type === 'news' ? BRAVE_NEWS_API_BASE : BRAVE_WEB_API_BASE;
    const response = await fetch(`${apiBase}?q=${encodeURIComponent(query)}&count=${count}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
    }

    const data: BraveSearchResponse = await response.json();
    
    // Return results from appropriate search type
    if (type === 'news' && data.news?.results) {
      return data.news.results;
    } else if (data.web?.results) {
      return data.web.results;
    } else if (data.mixed?.results) {
      return data.mixed.results;
    }
    
    return [];
  } catch (error) {
    console.error('Brave search error:', error);
    throw error;
  }
}

export async function searchWeb(query: string, count: number = 10): Promise<BraveSearchResult[]> {
  return searchBrave(query, count, 'web');
}

export async function searchNews(query: string, count: number = 10): Promise<BraveSearchResult[]> {
  return searchBrave(query, count, 'news');
}

export async function getQuickSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
  try {
    const results = await searchBrave(query, limit);
    return results.map(result => result.title);
  } catch (error) {
    console.error('Failed to get search suggestions:', error);
    return [];
  }
}
