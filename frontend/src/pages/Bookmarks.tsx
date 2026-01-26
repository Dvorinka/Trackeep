import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SkeletonGrid } from '@/components/ui/LoadingState'
import { 
  IconBookmark, 
  IconSearch, 
  IconPlus,
  IconExternalLink,
  IconTag,
  IconClock,
  IconStar,
  IconStarOff,
  IconRefresh,
  IconAlertTriangle
} from '@tabler/icons-solidjs'
import { createSignal, For, Show } from 'solid-js'
import { bookmarksApi, type Bookmark } from '@/lib/api-client'

export function Bookmarks() {
  const [searchQuery, setSearchQuery] = createSignal('')
  
  const bookmarksQuery = bookmarksApi.useGetAll()
  const deleteBookmarkMutation = bookmarksApi.useDelete()
  const updateBookmarkMutation = bookmarksApi.useUpdate()

  const filteredBookmarks = () => {
    const query = searchQuery().toLowerCase()
    if (!query) return bookmarksQuery.data || []
    
    return (bookmarksQuery.data || []).filter(bookmark => 
      bookmark.title.toLowerCase().includes(query) ||
      bookmark.description?.toLowerCase().includes(query) ||
      bookmark.url.toLowerCase().includes(query) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  const handleDeleteBookmark = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bookmark?')) return
    
    try {
      await deleteBookmarkMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error deleting bookmark:', error)
      // Error is already handled by the mutation's onError callback
    }
  }

  const handleToggleFavorite = async (bookmark: Bookmark) => {
    try {
      await updateBookmarkMutation.mutateAsync({
        id: bookmark.id,
        data: { is_favorite: !bookmark.is_favorite }
      })
    } catch (error) {
      console.error('Error updating bookmark:', error)
      // Error is already handled by the mutation's onError callback
    }
  }

  const handleToggleRead = async (bookmark: Bookmark) => {
    try {
      await updateBookmarkMutation.mutateAsync({
        id: bookmark.id,
        data: { is_read: !bookmark.is_read }
      })
    } catch (error) {
      console.error('Error updating bookmark:', error)
      // Error is already handled by the mutation's onError callback
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <ErrorBoundary>
      <div class="space-y-6">
        {/* Header */}
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-[#fafafa]">Bookmarks</h1>
            <p class="text-[#a3a3a3]">Save and organize your favorite links</p>
          </div>
          <Button class="bg-[#39b9ff] hover:bg-[#2a8fdb]">
            <IconPlus class="mr-2 h-4 w-4" />
            Add Bookmark
          </Button>
        </div>

        {/* Search */}
        <div class="relative">
          <IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" />
          <Input
            type="search"
            placeholder="Search bookmarks..."
            value={searchQuery()}
            onInput={(e) => e.target && setSearchQuery((e.target as HTMLInputElement).value)}
            class="pl-10 bg-[#141415] border-[#262626] text-[#fafafa] placeholder-[#a3a3a3]"
          />
        </div>

        {/* Loading State */}
        <Show when={bookmarksQuery.isLoading}>
          <SkeletonGrid count={6} />
        </Show>

        {/* Error State */}
        <Show when={bookmarksQuery.isError}>
          <div class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
            <div class="flex items-center">
              <IconAlertTriangle class="mr-2 h-5 w-5" />
              <span>Failed to load bookmarks: {bookmarksQuery.error?.message}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => bookmarksQuery.refetch()}
              class="text-red-400 hover:text-red-300"
            >
              <IconRefresh class="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </Show>

        {/* Bookmarks Grid */}
        <Show when={!bookmarksQuery.isLoading && !bookmarksQuery.isError}>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <For each={filteredBookmarks()}>
            {(bookmark) => (
              <Card class="bg-[#141415] border-[#262626] hover:border-[#39b9ff] transition-colors">
                <CardHeader class="pb-3">
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <CardTitle class="text-[#fafafa] truncate">
                        <a 
                          href={bookmark.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="hover:text-[#39b9ff] transition-colors"
                        >
                          {bookmark.title}
                        </a>
                      </CardTitle>
                      <CardDescription class="text-[#a3a3a3] text-xs mt-1">
                        {new URL(bookmark.url).hostname}
                      </CardDescription>
                    </div>
                    <div class="flex items-center space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-[#a3a3a3] hover:text-[#fafafa]"
                        onClick={() => handleToggleFavorite(bookmark)}
                      >
                        <Show when={bookmark.is_favorite} fallback={<IconStarOff class="h-4 w-4" />}>
                          <IconStar class="h-4 w-4 text-yellow-500" />
                        </Show>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent class="space-y-3">
                  <Show when={bookmark.description}>
                    <p class="text-sm text-[#a3a3a3] line-clamp-2">
                      {bookmark.description}
                    </p>
                  </Show>

                  {/* Tags */}
                  <Show when={bookmark.tags.length > 0}>
                    <div class="flex flex-wrap gap-1">
                      <For each={bookmark.tags}>
                        {(tag) => (
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-[#262626] text-[#a3a3a3]">
                            <IconTag class="mr-1 h-3 w-3" />
                            {tag}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>

                  {/* Actions */}
                  <div class="flex items-center justify-between pt-2 border-t border-[#262626]">
                    <div class="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        class={`text-xs ${bookmark.is_read ? 'text-[#a3a3a3]' : 'text-[#39b9ff]'}`}
                        onClick={() => handleToggleRead(bookmark)}
                      >
                        {bookmark.is_read ? 'Read' : 'Unread'}
                      </Button>
                      <span class="text-xs text-[#a3a3a3] flex items-center">
                        <IconClock class="mr-1 h-3 w-3" />
                        {formatDate(bookmark.created_at)}
                      </span>
                    </div>
                    
                    <div class="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-[#a3a3a3] hover:text-[#fafafa]"
                        onClick={() => window.open(bookmark.url, '_blank')}
                      >
                        <IconExternalLink class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-[#a3a3a3] hover:text-red-400"
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </For>
        </div>

        {/* Empty State */}
        <Show when={filteredBookmarks().length === 0}>
          <div class="text-center py-12">
            <IconBookmark class="mx-auto h-12 w-12 text-[#a3a3a3]" />
            <h3 class="mt-2 text-sm font-medium text-[#fafafa]">No bookmarks found</h3>
            <p class="mt-1 text-sm text-[#a3a3a3]">
              {searchQuery() ? 'Try adjusting your search terms' : 'Get started by adding your first bookmark'}
            </p>
          </div>
        </Show>
        </Show>
      </div>
    </ErrorBoundary>
  )
}
