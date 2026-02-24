import { createSignal, For, Show, onMount } from 'solid-js';
import { IconSearch, IconFileText, IconBookmark, IconChecklist, IconNotebook, IconFolder } from '@tabler/icons-solidjs';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'bookmark' | 'task' | 'note' | 'file';
  url?: string;
  description?: string;
  path?: string;
}

export const QuickSearch = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  // Mock data for demonstration - replace with actual API calls
  const mockData: SearchResult[] = [
    { id: '1', title: 'Project Documentation', type: 'document', path: '/documents/project-docs' },
    { id: '2', title: 'SolidJS Tutorial', type: 'bookmark', url: 'https://solidjs.com/tutorial' },
    { id: '3', title: 'Review Pull Request', type: 'task', description: 'Review and merge feature branch' },
    { id: '4', title: 'Meeting Notes', type: 'note', path: '/notes/meeting-2024-01-28' },
    { id: '5', title: 'Design Assets', type: 'file', path: '/files/design-assets.zip' },
    { id: '6', title: 'API Documentation', type: 'document', path: '/documents/api-docs' },
    { id: '7', title: 'GitHub Repository', type: 'bookmark', url: 'https://github.com/user/repo' },
    { id: '8', title: 'Fix Navigation Bug', type: 'task', description: 'Resolve navigation issue in mobile view' },
  ];

  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = mockData.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(filtered);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen()) return;

    const results = searchResults();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev === 0 ? results.length - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex()]) {
          handleResultClick(results[selectedIndex()]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        break;
    }
  };

  const handleInput = (e: InputEvent) => {
    const target = e.currentTarget as HTMLInputElement;
    if (target) {
      const query = target.value;
      setSearchQuery(query);
      performSearch(query);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Handle navigation or action based on result type
    if (result.url) {
      window.open(result.url, '_blank');
    } else if (result.path) {
      // Navigate to internal path - you might want to use your router here
      console.log('Navigate to:', result.path);
    }
    
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'document':
        return IconFileText;
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

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'document':
        return 'text-blue-400';
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

  // Global keyboard shortcut (Ctrl/Cmd + K) and Escape to close
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    // Add click outside listener
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen()) {
        const target = e.target as HTMLElement;
        // Check if click is outside the search modal
        if (!target.closest('.quick-search-modal')) {
          setIsOpen(false);
          setSearchQuery('');
          setSearchResults([]);
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  });

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        class="inline-flex items-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 lg:min-w-64 justify-start"
      >
        <IconSearch class="size-4 mr-2" />
        Quick search
        <span class="ml-auto text-xs text-muted-foreground hidden sm:inline">⌘ K</span>
      </button>

      {/* Search Modal */}
      <Show when={isOpen()}>
        <div class="fixed inset-0 z-[70] flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm quick-search-modal" onClick={(e) => {
          // Close if clicking on the backdrop
          if (e.target === e.currentTarget) {
            setIsOpen(false);
            setSearchQuery('');
            setSearchResults([]);
          }
        }}>
          <div class="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <Card class="p-4 shadow-2xl">
              {/* Search Input */}
              <div class="flex items-center gap-3 mb-4">
                <IconSearch class="size-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search documents, bookmarks, tasks, notes..."
                  value={searchQuery()}
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  class="border-0 shadow-none text-base focus-visible:ring-0"
                  ref={(el: HTMLInputElement) => el?.focus()}
                />
                <button
                  onClick={() => setIsOpen(false)}
                  class="text-muted-foreground hover:text-foreground"
                >
                  <span class="text-sm">ESC</span>
                </button>
              </div>

              {/* Search Results */}
              <Show when={searchResults().length > 0}>
                <div class="max-h-96 overflow-y-auto">
                  <For each={searchResults()}>
                    {(result, index) => {
                      const Icon = getIcon(result.type);
                      return (
                        <div
                          class={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            index() === selectedIndex() ? 'bg-accent' : 'hover:bg-accent/50'
                          }`}
                          onClick={() => handleResultClick(result)}
                          onMouseEnter={() => setSelectedIndex(index())}
                        >
                          <Icon class={`size-5 ${getTypeColor(result.type)}`} />
                          <div class="flex-1 min-w-0">
                            <div class="font-medium text-sm truncate">{result.title}</div>
                            <div class="text-xs text-muted-foreground truncate">
                              {result.description || result.url || result.path}
                            </div>
                          </div>
                          <span class={`text-xs ${getTypeColor(result.type)} capitalize`}>
                            {result.type}
                          </span>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>

              {/* Empty State */}
              <Show when={searchQuery() && searchResults().length === 0}>
                <div class="text-center py-8 text-muted-foreground">
                  <IconSearch class="size-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for "{searchQuery()}"</p>
                </div>
              </Show>

              {/* Initial State */}
              <Show when={!searchQuery()}>
                <div class="text-center py-8 text-muted-foreground">
                  <p class="text-sm">Start typing to search across your workspace...</p>
                  <div class="flex justify-center gap-4 mt-4 text-xs">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>ESC Close</span>
                  </div>
                </div>
              </Show>
            </Card>
          </div>
        </div>
      </Show>
    </>
  );
};
