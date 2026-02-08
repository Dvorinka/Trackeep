import { createSignal, For, Show, onMount } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { 
  IconSearch, 
  IconFilter, 
  IconBookmark, 
  IconChecklist, 
  IconNotebook, 
  IconFolder,
  IconX,
  IconStar,
  IconEye,
  IconEyeOff,
  IconFileText
} from '@tabler/icons-solidjs';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SavedSearches } from './SavedSearches';

interface SearchFilters {
  query: string;
  content_type: 'all' | 'bookmarks' | 'tasks' | 'notes' | 'files';
  tags: string[];
  date_range: {
    start: string;
    end: string;
  };
  author: string;
  language: string;
  file_types: string[];
  is_favorite?: boolean;
  is_read?: boolean;
  is_public?: boolean;
  limit: number;
  offset: number;
  search_mode: 'fulltext' | 'semantic' | 'hybrid'; // New field
  threshold: number; // Similarity threshold for semantic search
}

interface SearchResult {
  id: number;
  type: string;
  title: string;
  description: string;
  content: string;
  tags: Array<{ id: number; name: string; color: string }>;
  created_at: string;
  updated_at: string;
  url?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  is_favorite?: boolean;
  is_read?: boolean;
  is_public?: boolean;
  author?: string;
  file_size?: number;
  mime_type?: string;
  file_type?: string;
  progress?: number;
  highlights?: Record<string, string[]>;
  score: number;
  similarity?: number; // Semantic similarity score
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  filters: SearchFilters;
  took: number;
  suggestions: string[];
  aggregations: Record<string, number>;
}

export const EnhancedSearch = () => {
  const [activeTab, setActiveTab] = createSignal<'search' | 'saved'>('search');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filters, setFilters] = createSignal<SearchFilters>({
    query: '',
    content_type: 'all',
    tags: [],
    date_range: { start: '', end: '' },
    author: '',
    language: '',
    file_types: [],
    limit: 20,
    offset: 0,
    search_mode: 'fulltext',
    threshold: 0.7
  });
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const [total, setTotal] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [showFilters, setShowFilters] = createSignal(false);
  const [aggregations, setAggregations] = createSignal<Record<string, number>>({});
  const [took, setTook] = createSignal(0);
  const [searchParams] = useSearchParams();

  // API call to search
  const performSearch = async (resetOffset = true) => {
    setLoading(true);
    
    const currentFilters = { ...filters() };
    currentFilters.query = searchQuery();
    
    if (resetOffset) {
      currentFilters.offset = 0;
    }

    try {
      // Try multiple token sources for better compatibility
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('auth_token') || 
                    localStorage.getItem('trackeep_token');
      let response;
      
      if (currentFilters.search_mode === 'semantic') {
        // Use semantic search API
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/search/semantic`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            query: currentFilters.query,
            content_type: currentFilters.content_type,
            limit: currentFilters.limit,
            threshold: currentFilters.threshold
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (resetOffset) {
            setSearchResults(data.results);
          } else {
            setSearchResults(prev => [...prev, ...data.results]);
          }
          setTotal(data.results.length); // Semantic search doesn't return total count
          setTook(data.took);
        }
      } else {
        // Use enhanced full-text search API
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/search/enhanced`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(currentFilters)
        });

        if (response.ok) {
          const data: SearchResponse = await response.json();
          if (resetOffset) {
            setSearchResults(data.results);
          } else {
            setSearchResults(prev => [...prev, ...data.results]);
          }
          setTotal(data.total);
          setAggregations(data.aggregations);
          setTook(data.took);
        }
      }

      if (!response.ok) {
        // If unauthorized, fallback to mock data
        if (response.status === 401) {
          console.warn('Search authorization failed, using mock data');
          const mockResults: SearchResult[] = [
            {
              id: 1,
              type: 'bookmark',
              title: `Mock result for "${currentFilters.query}"`,
              description: 'This is a mock search result due to authorization issues',
              content: 'Mock content for demonstration purposes',
              tags: [{ id: 1, name: 'demo', color: '#6b7280' }],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              url: 'https://example.com',
              score: 0.9
            },
            {
              id: 2,
              type: 'note',
              title: `Another mock result for "${currentFilters.query}"`,
              description: 'Another mock search result in demo mode',
              content: 'Additional mock content for search demonstration',
              tags: [{ id: 2, name: 'mock', color: '#3b82f6' }],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              score: 0.8
            }
          ];
          
          if (resetOffset) {
            setSearchResults(mockResults);
          } else {
            setSearchResults(prev => [...prev, ...mockResults]);
          }
          setTotal(mockResults.length);
          setTook(50);
          return;
        }
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to mock data on any error
      const mockResults: SearchResult[] = [
        {
          id: 1,
          type: 'bookmark',
          title: `Fallback result for "${currentFilters.query}"`,
          description: 'This is a fallback search result due to API errors',
          content: 'Fallback content for demonstration purposes',
          tags: [{ id: 1, name: 'fallback', color: '#ef4444' }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          url: 'https://example.com',
          score: 0.7
        }
      ];
      
      if (resetOffset) {
        setSearchResults(mockResults);
      } else {
        setSearchResults(prev => [...prev, ...mockResults]);
      }
      setTotal(mockResults.length);
      setTook(100);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  let searchTimeout: number;
  const debouncedSearch = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(), 300);
  };

  // Handle search input
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    debouncedSearch();
  };

  // Handle filter changes
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setTimeout(() => performSearch(), 100);
  };

  // Add/remove tag filter
  const toggleTag = (tag: string) => {
    const currentTags = filters().tags;
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    updateFilter('tags', newTags);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      query: searchQuery(),
      content_type: 'all',
      tags: [],
      date_range: { start: '', end: '' },
      author: '',
      language: '',
      file_types: [],
      limit: 20,
      offset: 0,
      search_mode: 'fulltext',
      threshold: 0.7
    });
    setTimeout(() => performSearch(), 100);
  };

  // Load more results
  const loadMore = () => {
    setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }));
    setTimeout(() => performSearch(false), 100);
  };

  // Get icon for content type
  const getIcon = (type: string) => {
    switch (type) {
      case 'bookmark':
        return IconBookmark;
      case 'task':
        return IconChecklist;
      case 'note':
        return IconNotebook;
      case 'file':
        return IconFolder;
      default:
        return IconFileText;
    }
  };

  // Get color for content type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bookmark':
        return 'text-green-400';
      case 'task':
        return 'text-yellow-400';
      case 'note':
        return 'text-purple-400';
      case 'file':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Initial search on mount (respect URL query/tag params)
  onMount(() => {
    const urlQuery = (searchParams as any).query || '';
    const urlTag = (searchParams as any).tag || '';

    const initialQuery = urlQuery || urlTag || '';

    if (initialQuery) {
      setSearchQuery(initialQuery);
      setFilters(prev => ({
        ...prev,
        query: initialQuery,
        tags: urlTag ? [urlTag] : prev.tags,
      }));
    }

    performSearch();
  });

  return (
    <div class="space-y-6">
      {/* Header with Tabs */}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold">Enhanced Search</h1>
            <p class="text-muted-foreground mt-2">
              Search across all your content with powerful filters and AI-powered discovery
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div class="border-b">
          <nav class="flex space-x-8">
            <button
              class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab() === 'search'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('search')}
            >
              <div class="flex items-center gap-2">
                <IconSearch class="size-4" />
                Search
              </div>
            </button>
            <button
              class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab() === 'saved'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('saved')}
            >
              <div class="flex items-center gap-2">
                <IconBookmark class="size-4" />
                Saved Searches
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <Show when={activeTab() === 'search'}>
        <div class="space-y-6">
          {/* Search Input */}
          <div class="space-y-4">
            <div class="relative">
              <IconSearch class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-5" />
              <Input
                type="text"
                placeholder="Search across all your content..."
                value={searchQuery()}
                onInput={(e: any) => handleSearchInput(e.target?.value || '')}
                class="pl-10 pr-12 h-12 text-lg"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters())}
                class="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                <IconFilter class="size-4" />
              </Button>
            </div>

            {/* Search Stats */}
            <Show when={total() > 0}>
              <div class="flex items-center justify-between text-sm text-muted-foreground">
                <span>Found {total()} results in {took()}ms</span>
                <div class="flex items-center gap-4">
                  <For each={Object.entries(aggregations())}>
                    {([type, count]) => (
                      <span>{type}: {count}</span>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>

          {/* Filters Panel */}
          <Show when={showFilters()}>
            <Card class="p-6 space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Filters</h3>
                <div class="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                    <IconX class="size-4" />
                  </Button>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search Mode */}
                <div class="space-y-2">
                  <label class="text-sm font-medium">Search Mode</label>
                  <select
                    value={filters().search_mode}
                    onChange={(e: any) => updateFilter('search_mode', e.target.value)}
                    class="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="fulltext">Full-Text Search</option>
                    <option value="semantic">Semantic Search</option>
                    <option value="hybrid">Hybrid (Coming Soon)</option>
                  </select>
                </div>

                {/* Similarity Threshold (for semantic search) */}
                <Show when={filters().search_mode === 'semantic'}>
                  <div class="space-y-2">
                    <label class="text-sm font-medium">Similarity Threshold: {filters().threshold.toFixed(2)}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={filters().threshold}
                      onChange={(e: any) => updateFilter('threshold', parseFloat(e.target.value))}
                      class="w-full"
                    />
                    <div class="flex justify-between text-xs text-muted-foreground">
                      <span>More results</span>
                      <span>More precise</span>
                    </div>
                  </div>
                </Show>

                {/* Content Type Filter */}
                <div class="space-y-2">
                  <label class="text-sm font-medium">Content Type</label>
                  <select
                    value={filters().content_type}
                    onChange={(e: any) => updateFilter('content_type', e.target.value)}
                    class="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="all">All Types</option>
                    <option value="bookmarks">Bookmarks</option>
                    <option value="tasks">Tasks</option>
                    <option value="notes">Notes</option>
                    <option value="files">Files</option>
                  </select>
                </div>

                {/* Date Range */}
                <div class="space-y-2">
                  <label class="text-sm font-medium">Date Range</label>
                  <div class="flex gap-2">
                    <Input
                      type="date"
                      value={filters().date_range.start}
                      onChange={(e: any) => updateFilter('date_range', { 
                        ...filters().date_range, 
                        start: e.target?.value || '' 
                      })}
                      placeholder="Start date"
                    />
                    <Input
                      type="date"
                      value={filters().date_range.end}
                      onChange={(e: any) => updateFilter('date_range', { 
                        ...filters().date_range, 
                        end: e.target?.value || '' 
                      })}
                      placeholder="End date"
                    />
                  </div>
                </div>

                {/* Author Filter */}
                <div class="space-y-2">
                  <label class="text-sm font-medium">Author</label>
                  <Input
                    type="text"
                    value={filters().author}
                    onChange={(e: any) => updateFilter('author', e.target?.value || '')}
                    placeholder="Filter by author"
                  />
                </div>

                {/* Boolean Filters */}
                <div class="space-y-2">
                  <label class="text-sm font-medium">Quick Filters</label>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      variant={filters().is_favorite ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('is_favorite', !filters().is_favorite)}
                    >
                      <IconStar class="size-3 mr-1" />
                      Favorites
                    </Button>
                    <Button
                      variant={filters().is_read ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('is_read', !filters().is_read)}
                    >
                      <IconEye class="size-3 mr-1" />
                      Read
                    </Button>
                    <Button
                      variant={filters().is_public ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter('is_public', !filters().is_public)}
                    >
                      <IconEyeOff class="size-3 mr-1" />
                      Public
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Tags */}
              <Show when={filters().tags.length > 0}>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Active Tags</label>
                  <div class="flex flex-wrap gap-2">
                    <For each={filters().tags}>
                      {(tag) => (
                        <span class="inline-block bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded cursor-pointer hover:bg-secondary/80" onClick={() => toggleTag(tag)}>
                          {tag}
                          <IconX class="inline size-3 ml-1" />
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </Card>
          </Show>

          {/* Search Results */}
          <div class="space-y-4">
            <Show when={loading()}>
              <div class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p class="mt-2 text-muted-foreground">Searching...</p>
              </div>
            </Show>

            <Show when={!loading() && searchResults().length === 0 && searchQuery()}>
              <div class="text-center py-8 text-muted-foreground">
                <IconSearch class="size-12 mx-auto mb-4 opacity-50" />
                <h3 class="text-lg font-medium mb-2">No results found</h3>
                <p>Try adjusting your search terms or filters</p>
              </div>
            </Show>

            <Show when={!loading() && searchResults().length > 0}>
              <div class="space-y-4">
                <For each={searchResults()}>
                  {(result) => {
                    const Icon = getIcon(result.type);
                    return (
                      <Card class="p-6 hover:shadow-md transition-shadow">
                        <div class="flex items-start gap-4">
                          {/* Type Icon */}
                          <div class={`p-2 rounded-lg bg-muted ${getTypeColor(result.type)}`}>
                            <Icon class="size-5" />
                          </div>

                          {/* Content */}
                          <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-4">
                              <div class="flex-1">
                                <h3 class="text-lg font-semibold mb-1">{result.title}</h3>
                                <p class="text-muted-foreground mb-2">{result.description}</p>
                                
                                {/* Content preview */}
                                <Show when={result.content}>
                                  <p class="text-sm text-muted-foreground line-clamp-2 mb-3">
                                    {result.content.substring(0, 200)}...
                                  </p>
                                </Show>

                                {/* Tags */}
                                <Show when={result.tags.length > 0}>
                                  <div class="flex flex-wrap gap-1 mb-3">
                                    <For each={result.tags}>
                                      {(tag) => (
                                        <span 
                                          class="inline-block bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded cursor-pointer hover:bg-secondary/80"
                                          onClick={() => toggleTag(tag.name)}
                                        >
                                          {tag.name}
                                        </span>
                                      )}
                                    </For>
                                  </div>
                                </Show>

                                {/* Metadata */}
                                <div class="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span class="capitalize">{result.type}</span>
                                  <span>Created {formatDate(result.created_at)}</span>
                                  <Show when={result.updated_at !== result.created_at}>
                                    <span>Updated {formatDate(result.updated_at)}</span>
                                  </Show>
                                  <Show when={result.author}>
                                    <span>By {result.author}</span>
                                  </Show>
                                  <Show when={result.file_size}>
                                    <span>{formatFileSize(result.file_size)}</span>
                                  </Show>
                                  <Show when={result.score}>
                                    <span>Score: {result.score.toFixed(1)}</span>
                                  </Show>
                                  <Show when={result.similarity !== undefined}>
                                    <span>Similarity: {(result.similarity! * 100).toFixed(1)}%</span>
                                  </Show>
                                </div>
                              </div>

                              {/* Status/Priority Indicators */}
                              <div class="flex flex-col items-end gap-2">
                                <Show when={result.status}>
                                  <span class={`inline-block ${getStatusColor(result.status)} text-white text-xs px-2 py-1 rounded`}>
                                    {result.status}
                                  </span>
                                </Show>
                                <Show when={result.priority}>
                                  <span class={`inline-block ${getPriorityColor(result.priority)} text-white text-xs px-2 py-1 rounded`}>
                                    {result.priority}
                                  </span>
                                </Show>
                                <Show when={result.is_favorite}>
                                  <IconStar class="size-4 text-yellow-500 fill-current" />
                                </Show>
                                <Show when={result.is_read !== undefined}>
                                  {result.is_read ? (
                                    <IconEye class="size-4 text-green-500" />
                                  ) : (
                                    <IconEyeOff class="size-4 text-gray-400" />
                                  )}
                                </Show>
                                <Show when={result.progress !== undefined}>
                                  <div class="text-xs text-muted-foreground">
                                    {result.progress}%
                                  </div>
                                </Show>
                              </div>
                            </div>

                            {/* URL for bookmarks */}
                            <Show when={result.url}>
                              <div class="mt-3">
                                <a 
                                  href={result.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  class="text-sm text-blue-500 hover:underline"
                                >
                                  {result.url}
                                </a>
                              </div>
                            </Show>
                          </div>
                        </div>
                      </Card>
                    );
                  }}
                </For>

                {/* Load More */}
                <Show when={searchResults().length < total()}>
                  <div class="text-center">
                    <Button 
                      variant="outline" 
                      onClick={loadMore}
                      disabled={loading()}
                    >
                      Load More Results
                    </Button>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={activeTab() === 'saved'}>
        <SavedSearches />
      </Show>
    </div>
  );
};
