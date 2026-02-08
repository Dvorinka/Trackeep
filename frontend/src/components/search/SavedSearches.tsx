import { createSignal, For, Show, onMount } from 'solid-js';
import { 
  IconBookmark, 
  IconSearch, 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconPlayerPlay, 
  IconBell,
  IconTag,
  IconEye,
  IconX,
  IconClock
} from '@tabler/icons-solidjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface SavedSearch {
  id: number;
  name: string;
  query: string;
  filters: Record<string, any>;
  alert: boolean;
  last_run?: string;
  run_count: number;
  is_public: boolean;
  description?: string;
  tags: Array<{ id: number; name: string; color: string }>;
  created_at: string;
  updated_at: string;
}

interface SavedSearchFormData {
  name: string;
  query: string;
  filters: Record<string, any>;
  alert: boolean;
  is_public: boolean;
  description: string;
  tags: string[];
}

export const SavedSearches = () => {
  const [savedSearches, setSavedSearches] = createSignal<SavedSearch[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingSearch, setEditingSearch] = createSignal<SavedSearch | null>(null);
  const [formData, setFormData] = createSignal<SavedSearchFormData>({
    name: '',
    query: '',
    filters: {},
    alert: false,
    is_public: false,
    description: '',
    tags: []
  });

  // Load saved searches
  const loadSavedSearches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/search/saved`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSavedSearches(data.saved_searches || []);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load available tags
  const loadTags = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/search/saved/tags`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Tags loaded but not used currently
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  // Create or update saved search
  const saveSavedSearch = async () => {
    try {
      const token = localStorage.getItem('token');
      const isEditing = editingSearch() !== null;
      const url = isEditing 
        ? `/api/v1/search/saved/${editingSearch()!.id}`
        : '/api/v1/search/saved';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData())
      });

      if (response.ok) {
        setShowCreateModal(false);
        setEditingSearch(null);
        setFormData({
          name: '',
          query: '',
          filters: {},
          alert: false,
          is_public: false,
          description: '',
          tags: []
        });
        loadSavedSearches();
      }
    } catch (error) {
      console.error('Failed to save saved search:', error);
    }
  };

  // Delete saved search
  const deleteSavedSearch = async (id: number) => {
    if (!confirm('Are you sure you want to delete this saved search?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/search/saved/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        loadSavedSearches();
      }
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  // Run saved search
  const runSavedSearch = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/search/saved/${id}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to search results or show results in modal
        console.log('Search results:', data);
        // For now, just reload to show updated run_count
        loadSavedSearches();
      }
    } catch (error) {
      console.error('Failed to run saved search:', error);
    }
  };

  // Edit saved search
  const editSavedSearch = (search: SavedSearch) => {
    setEditingSearch(search);
    setFormData({
      name: search.name,
      query: search.query,
      filters: search.filters,
      alert: search.alert,
      is_public: search.is_public,
      description: search.description || '',
      tags: search.tags.map(tag => tag.name)
    });
    setShowCreateModal(true);
  };

  // Handle form input changes
  const updateFormData = (field: keyof SavedSearchFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format relative time
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  onMount(() => {
    loadSavedSearches();
    loadTags();
  });

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold flex items-center gap-2">
            <IconBookmark class="size-8" />
            Saved Searches
          </h1>
          <p class="text-muted-foreground mt-2">
            Save and manage your frequently used searches with alerts
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <IconPlus class="size-4 mr-2" />
          New Saved Search
        </Button>
      </div>

      {/* Loading State */}
      <Show when={loading()}>
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p class="mt-2 text-muted-foreground">Loading saved searches...</p>
        </div>
      </Show>

      {/* Saved Searches List */}
      <Show when={!loading() && savedSearches().length === 0}>
        <div class="text-center py-8 text-muted-foreground">
          <IconBookmark class="size-12 mx-auto mb-4 opacity-50" />
          <h3 class="text-lg font-medium mb-2">No saved searches yet</h3>
          <p>Create your first saved search to get started</p>
        </div>
      </Show>

      <Show when={!loading() && savedSearches().length > 0}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={savedSearches()}>
            {(search) => (
              <Card class="p-6 hover:shadow-md transition-shadow">
                <div class="space-y-4">
                  {/* Header */}
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h3 class="font-semibold text-lg mb-1">{search.name}</h3>
                      <Show when={search.description}>
                        <p class="text-sm text-muted-foreground mb-2">{search.description}</p>
                      </Show>
                    </div>
                    <div class="flex items-center gap-1">
                      <Show when={search.alert}>
                        <IconBell class="size-4 text-blue-500" />
                      </Show>
                      <Show when={search.is_public}>
                        <IconEye class="size-4 text-green-500" />
                      </Show>
                    </div>
                  </div>

                  {/* Query */}
                  <div class="bg-muted p-3 rounded-md">
                    <div class="flex items-center gap-2 mb-1">
                      <IconSearch class="size-4 text-muted-foreground" />
                      <span class="text-sm font-medium">Query</span>
                    </div>
                    <p class="text-sm font-mono">{search.query}</p>
                  </div>

                  {/* Tags */}
                  <Show when={search.tags.length > 0}>
                    <div class="flex flex-wrap gap-1">
                      <For each={search.tags}>
                        {(tag) => (
                          <span 
                            class="inline-block text-xs px-2 py-1 rounded"
                            style={{ 
                              'background-color': tag.color + '20',
                              'color': tag.color,
                              'border': `1px solid ${tag.color}40`
                            }}
                          >
                            <IconTag class="inline size-3 mr-1" />
                            {tag.name}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>

                  {/* Metadata */}
                  <div class="text-xs text-muted-foreground space-y-1">
                    <div class="flex items-center gap-2">
                      <IconClock class="size-3" />
                      <span>Run {search.run_count} times</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <IconClock class="size-3" />
                      <span>Last run: {formatRelativeTime(search.last_run)}</span>
                    </div>
                    <div>Created {formatDate(search.created_at)}</div>
                  </div>

                  {/* Actions */}
                  <div class="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => runSavedSearch(search.id)}
                      class="flex-1"
                    >
                      <IconPlayerPlay class="size-3 mr-1" />
                      Run
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => editSavedSearch(search)}
                    >
                      <IconEdit class="size-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => deleteSavedSearch(search.id)}
                    >
                      <IconTrash class="size-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </For>
        </div>
      </Show>

      {/* Create/Edit Modal */}
      <Show when={showCreateModal()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card class="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold">
                {editingSearch() ? 'Edit Saved Search' : 'Create Saved Search'}
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingSearch(null);
                  setFormData({
                    name: '',
                    query: '',
                    filters: {},
                    alert: false,
                    is_public: false,
                    description: '',
                    tags: []
                  });
                }}
              >
                <IconX class="size-4" />
              </Button>
            </div>

            <div class="space-y-4">
              {/* Name */}
              <div class="space-y-2">
                <label class="text-sm font-medium">Name *</label>
                <Input
                  type="text"
                  value={formData().name}
                  onInput={(e: any) => updateFormData('name', e.target?.value || '')}
                  placeholder="Enter a descriptive name"
                />
              </div>

              {/* Query */}
              <div class="space-y-2">
                <label class="text-sm font-medium">Search Query *</label>
                <Input
                  type="text"
                  value={formData().query}
                  onInput={(e: any) => updateFormData('query', e.target?.value || '')}
                  placeholder="Enter your search query"
                />
              </div>

              {/* Description */}
              <div class="space-y-2">
                <label class="text-sm font-medium">Description</label>
                <textarea
                  class="w-full p-2 border rounded-md bg-background min-h-[80px]"
                  value={formData().description}
                  onInput={(e: any) => updateFormData('description', e.target?.value || '')}
                  placeholder="Optional description of this saved search"
                />
              </div>

              {/* Tags */}
              <div class="space-y-2">
                <label class="text-sm font-medium">Tags</label>
                <Input
                  type="text"
                  value={formData().tags.join(', ')}
                  onInput={(e: any) => updateFormData('tags', e.target?.value?.split(',').map((t: string) => t.trim()).filter(Boolean) || [])}
                  placeholder="Enter tags separated by commas"
                />
              </div>

              {/* Options */}
              <div class="space-y-3">
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData().alert}
                    onChange={(e: any) => updateFormData('alert', e.target.checked)}
                    class="rounded"
                  />
                  <span class="text-sm">Enable alerts for new results</span>
                </label>

                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData().is_public}
                    onChange={(e: any) => updateFormData('is_public', e.target.checked)}
                    class="rounded"
                  />
                  <span class="text-sm">Make this saved search public</span>
                </label>
              </div>

              {/* Actions */}
              <div class="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  class="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveSavedSearch}
                  disabled={!formData().name || !formData().query}
                  class="flex-1"
                >
                  {editingSearch() ? 'Update' : 'Create'} Saved Search
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Show>
    </div>
  );
};
