import { createSignal, For, Show } from 'solid-js';
import { IconSearch, IconExternalLink, IconLoader2, IconBookmark } from '@tabler/icons-solidjs';
import { type BraveSearchResult } from '@/lib/brave-search';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { isEnvDemoMode, shouldUseRealSearch } from '@/lib/demo-mode';
import { getSearchProvider, getApiBaseUrl } from '@/lib/credentials';

export const BrowserSearch = () => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<BraveSearchResult[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [hasSearched, setHasSearched] = createSignal(false);
  const [searchType, setSearchType] = createSignal<'web' | 'news'>('web');

  // Check if we're in demo mode
  const isDemo = () => {
    return isEnvDemoMode();
  };

  // Check if we should use real search APIs
  const shouldUseReal = () => {
    return shouldUseRealSearch();
  };

  const handleSearch = async () => {
    const query = searchQuery().trim();
    if (!query) return;

    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const isDemoMode = isDemo();
      const useRealAPIs = shouldUseReal();
      
      console.log(`[BrowserSearch] Demo mode: ${isDemoMode}, Use real APIs: ${useRealAPIs}`);
      
      // If we have credentials and should use real APIs, try them first
      if (useRealAPIs) {
        console.log('Using real search APIs...');
        
        // Try the configured search provider first
        const searchProvider = getSearchProvider();
        console.log(`Using search provider: ${searchProvider}`);
        
        if (searchProvider === 'brave' && import.meta.env.VITE_BRAVE_API_KEY) {
          try {
            const { searchBrave } = await import('@/lib/brave-search');
            const results = await searchBrave(query, 8, searchType());
            if (results && results.length > 0) {
              setSearchResults(results);
              return;
            }
          } catch (err) {
            console.warn('Brave Search failed:', err);
          }
        }
        
        // Try backend as fallback
        const API_BASE_URL = getApiBaseUrl();
        const token = localStorage.getItem('token') || 
                      localStorage.getItem('auth_token') || 
                      localStorage.getItem('trackeep_token');
        const endpoint = searchType() === 'news' ? '/api/v1/search/news' : '/api/v1/search/web';
        
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({ query, count: 8 }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              setSearchResults(data.results);
              return;
            }
          }
        } catch (err) {
          console.warn('Backend search failed:', err);
        }
      }
      
      // In demo mode or as fallback, use the demo mode API interceptor
      if (isDemoMode) {
        console.log('Demo mode detected, using demo API interceptor...');
        const API_BASE_URL = getApiBaseUrl();
        const endpoint = searchType() === 'news' ? '/api/v1/search/news' : '/api/v1/search/web';
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, count: 8 }),
        });

        if (response.ok) {
          const data = await response.json();
          // Handle demo mode response format
          const results = data.web?.results || data.news?.results || data.mixed?.results || data.results || [];
          if (results.length > 0) {
            setSearchResults(results);
            return;
          }
        }
        console.warn('Demo API failed, falling back to mock results...');
      }

      // If all APIs fail or return no results, show appropriate message
      throw new Error('No search results available');
      
    } catch (err) {
      console.error('Search failed:', err);
      
      // Only show demo data if all APIs fail
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const apiFailed = errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('No search results');
      
      if (apiFailed) {
        console.warn('All search APIs failed, showing demo results:', errorMessage);
        const mockResults: BraveSearchResult[] = [
          {
            title: `${query} - Search Result 1`,
            url: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
            description: `This is a mock search result for "${query}" demonstrating the search functionality in demo mode.`,
            published_date: new Date().toISOString().split('T')[0],
            language: 'English'
          },
          {
            title: `${query} - Search Result 2`,
            url: `https://demo-site.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
            description: `Another mock search result for "${query}" showing how the search interface works in demo mode.`,
            published_date: new Date().toISOString().split('T')[0],
            language: 'English'
          }
        ];
        setSearchResults(mockResults);
      } else {
        setError('Search temporarily unavailable. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInput = (e: InputEvent) => {
    const target = e.currentTarget as HTMLInputElement;
    if (target) {
      setSearchQuery(target.value);
    }
  };

  const openResult = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const bookmarkResult = async (result: BraveSearchResult) => {
    // If in demo mode, just show success message
    if (isDemo()) {
      // In demo mode, just show success without actual API call
      console.log('Demo mode: Bookmark created for', result.title);
      return;
    }

    try {
      const API_BASE_URL = getApiBaseUrl();
      const bookmarkData = {
        title: result.title,
        url: result.url,
        description: result.description,
        tags: ['web-search', 'browser-search']
      };

      const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        },
        body: JSON.stringify(bookmarkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bookmark');
      }
    } catch (err) {
      console.error('Failed to bookmark search result:', err);
    }
  };

  return (
    <div class="space-y-6">
      {/* Search Content */}
      <div class="space-y-6">
        {/* Search Bar */}
        <Card class="p-6">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs text-muted-foreground uppercase tracking-wide">Search type</span>
            <div class="inline-flex items-center gap-1 rounded-md bg-muted p-1">
              <Button
                variant={searchType() === 'web' ? 'default' : 'outline'}
                size="sm"
                class="h-7 px-3 text-xs"
                onClick={() => setSearchType('web')}
              >
                Web
              </Button>
              <Button
                variant={searchType() === 'news' ? 'default' : 'outline'}
                size="sm"
                class="h-7 px-3 text-xs"
                onClick={() => setSearchType('news')}
              >
                News
              </Button>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <Input
                type="text"
                placeholder={searchType() === 'news' ? 'Search news...' : 'Search the web...'}
                value={searchQuery()}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                class="text-base"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={isLoading() || !searchQuery().trim()}
              size="lg"
              class="px-8"
            >
              {isLoading() ? (
                <span class="flex items-center gap-2">
                  <IconLoader2 class="w-4 h-4 animate-spin" />
                  Searching...
                </span>
              ) : (
                <span class="flex items-center gap-2">
                  <IconSearch class="w-4 h-4" />
                  Search
                </span>
              )}
            </Button>
          </div>
        </Card>

      {/* Error Message */}
        <Show when={error()}>
          <Card class="p-4 border-red-500/20 bg-red-500/5">
            <p class="text-red-400 text-sm">{error()}</p>
          </Card>
        </Show>

        {/* Search Results */}
        <Show when={hasSearched() && !isLoading()}>
          <div class="space-y-4">
            <Show when={searchResults().length > 0}>
              <div class="flex items-center justify-between mb-4">
                <span class="text-sm text-muted-foreground">
                  Found {searchResults().length} results
                </span>
              </div>
              
              <div class="space-y-4">
                <For each={searchResults()}>
                  {(result) => (
                    <Card class="p-6 hover:bg-accent/50 transition-colors cursor-pointer group">
                      <div class="space-y-2">
                        {/* URL */}
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-primary truncate">
                            {result.url}
                          </span>
                          <IconExternalLink class="w-3.5 h-3.5 ml-1 text-primary flex-shrink-0" />
                        </div>
                        
                        {/* Title */}
                        <h3 
                          class="text-lg font-semibold hover:text-primary transition-colors"
                          onClick={() => openResult(result.url)}
                        >
                          {result.title}
                        </h3>
                        
                        {/* Description */}
                        <p class="text-muted-foreground text-sm line-clamp-2">
                          {result.description}
                        </p>
                        
                        {/* Meta info */}
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-4 text-xs text-muted-foreground">
                            <Show when={result.published_date}>
                              <span>{result.published_date}</span>
                            </Show>
                            <Show when={result.language}>
                              <span>Language: {result.language}</span>
                            </Show>
                          </div>
                          <div class="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => bookmarkResult(result)}
                              class="mt-2"
                            >
                              <IconBookmark class="w-3 h-3 mr-1" />
                              Bookmark
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openResult(result.url)}
                              class="mt-2"
                            >
                              <IconExternalLink class="w-3.5 h-3.5 mr-1" />
                              Visit
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </For>
              </div>
            </Show>

            <Show when={searchResults().length === 0 && !error()}>
              <Card class="p-12 text-center">
                <div class="max-w-md mx-auto">
                  <IconSearch class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 class="text-lg font-semibold mb-2">No results found</h3>
                  <p class="text-muted-foreground">
                    Try searching with different keywords or check your spelling.
                  </p>
                </div>
              </Card>
            </Show>
          </div>
        </Show>

        {/* Initial State */}
        <Show when={!hasSearched()}>
          <Card class="p-12 text-center">
            <div class="max-w-md mx-auto">
              <IconSearch class="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 class="text-lg font-semibold mb-2">Search the web using Brave Search API</h3>
              <p class="text-muted-foreground">
                Enter keywords above to search the web and bookmark results.
              </p>
            </div>
          </Card>
        </Show>
      </div>
    </div>
  );
};
