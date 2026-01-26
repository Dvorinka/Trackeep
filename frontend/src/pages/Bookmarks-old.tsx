import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  IconBookmark, 
  IconSearch, 
  IconPlus,
  IconExternalLink,
  IconTag,
  IconClock,
  IconLoader2
} from '@tabler/icons-solidjs'
import { createSignal, onMount, For } from 'solid-js'
import { bookmarksApi, type Bookmark } from '@/lib/api'

export function Bookmarks() {
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([])
  const [loading, setLoading] = createSignal(true)
  const [searchQuery, setSearchQuery] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)

  const loadBookmarks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await bookmarksApi.getAll()
      setBookmarks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
      console.error('Error loading bookmarks:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredBookmarks = () => {
    const query = searchQuery().toLowerCase()
    if (!query) return bookmarks()
    
    return bookmarks().filter(bookmark => 
      bookmark.title.toLowerCase().includes(query) ||
      bookmark.description?.toLowerCase().includes(query) ||
      bookmark.url.toLowerCase().includes(query) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  const handleDeleteBookmark = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bookmark?')) return
    
    try {
      await bookmarksApi.delete(id)
      setBookmarks(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark')
      console.error('Error deleting bookmark:', err)
    }
  }

  onMount(() => {
    loadBookmarks()
  })

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Bookmarks</h1>
          <p class="text-gray-400 mt-2">Manage and organize your saved links</p>
        </div>
        <Button>
          <IconPlus class="mr-2 h-4 w-4" />
          Add Bookmark
        </Button>
      </div>

      {/* Error Message */}
      {error() && (
        <div class="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
          {error()}
          <Button 
            variant="ghost" 
            size="sm" 
            class="ml-2 text-red-400 hover:text-red-300"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search bookmarks..."
            class="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            value={searchQuery()}
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement
              if (target) setSearchQuery(target.value)
            }}
          />
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm">
            <IconTag class="mr-2 h-4 w-4" />
            All Tags
          </Button>
          <Button variant="outline" size="sm">
            <IconClock class="mr-2 h-4 w-4" />
            Recent
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading() && (
        <div class="flex items-center justify-center py-12">
          <IconLoader2 class="h-8 w-8 animate-spin text-primary-500" />
          <span class="ml-2 text-gray-400">Loading bookmarks...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading() && filteredBookmarks().length === 0 && (
        <div class="text-center py-12">
          <IconBookmark class="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-300 mb-2">
            {searchQuery() ? 'No bookmarks found' : 'No bookmarks yet'}
          </h3>
          <p class="text-gray-500">
            {searchQuery() 
              ? 'Try adjusting your search terms' 
              : 'Start by adding your first bookmark'
            }
          </p>
        </div>
      )}

      {/* Bookmarks Grid */}
      {!loading() && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={filteredBookmarks()}>
            {(bookmark) => (
              <Card class="hover:shadow-lg transition-shadow">
                <CardHeader class="pb-3">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-3">
                      <span class="text-2xl">🔖</span>
                      <div class="min-w-0 flex-1">
                        <CardTitle class="text-lg text-white truncate">
                          {bookmark.title}
                        </CardTitle>
                        <CardDescription class="text-xs text-primary-400 truncate">
                          {bookmark.url}
                        </CardDescription>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      class="text-gray-400 hover:text-white"
                      onClick={() => window.open(bookmark.url, '_blank')}
                    >
                      <IconExternalLink class="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent class="space-y-3">
                  {bookmark.description && (
                    <p class="text-sm text-gray-300 line-clamp-2">
                      {bookmark.description}
                    </p>
                  )}
                  
                  {/* Tags */}
                  <div class="flex flex-wrap gap-1">
                    <For each={bookmark.tags}>
                      {(tag) => (
                        <span
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300"
                        >
                          {tag}
                        </span>
                      )}
                    </For>
                  </div>
                  
                  {/* Actions */}
                  <div class="flex items-center justify-between pt-2 border-t border-gray-700">
                    <span class="text-xs text-gray-400">
                      {new Date(bookmark.created_at).toLocaleDateString()}
                    </span>
                    <div class="flex space-x-1">
                      <Button variant="ghost" size="sm" class="text-gray-400 hover:text-white">
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        class="text-gray-400 hover:text-red-400"
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </For>
        </div>
      )}
    </div>
  )
}
