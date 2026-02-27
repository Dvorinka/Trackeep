// Brave Search API integration
import { isDemoMode } from '@/lib/demo-mode';
import { getApiV1BaseUrl } from '@/lib/api-url';

const BACKEND_API_URL = getApiV1BaseUrl();
const BRAVE_API_KEY = import.meta.env.VITE_BRAVE_API_KEY || 'BSAw0HNI1v3rKmXlSTr0C_UfZDjw7fT';

// Use the variable to avoid unused warning
console.log('Brave API key available:', !!BRAVE_API_KEY);

// Helper function to get auth headers
const getAuthHeaders = () => {
  const isDemo = isDemoMode();
  
  let token = null;
  
  if (isDemo) {
    // In demo mode, use a mock token
    token = 'demo-token-' + Date.now();
  } else {
    // In normal mode, get token from localStorage
    token = localStorage.getItem('token') || localStorage.getItem('trackeep_token');
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

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
    // Use backend proxy to avoid CORS issues
    const endpoint = type === 'news' ? '/search/news' : '/search/web';
    const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        query,
        count,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Return results from the backend response
    if (data.results && Array.isArray(data.results)) {
      return data.results;
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
