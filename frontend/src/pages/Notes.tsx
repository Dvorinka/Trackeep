import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  IconNotebook, 
  IconSearch, 
  IconPlus,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconTag,
  IconLoader2
} from '@tabler/icons-solidjs'
import { createSignal, For, Show } from 'solid-js'
import { notesApi, type Note } from '@/lib/api-client'

export function Notes() {
  const [searchQuery, setSearchQuery] = createSignal('')
  
  const notesQuery = notesApi.useGetAll()
  const deleteNoteMutation = notesApi.useDelete()

  const filteredNotes = () => {
    const query = searchQuery().toLowerCase()
    if (!query) return notesQuery.data || []
    
    return (notesQuery.data || []).filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    
    try {
      await deleteNoteMutation.mutateAsync(noteId)
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note')
    }
  }

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Notes</h1>
          <p class="text-gray-400 mt-2">Capture and organize your thoughts and ideas</p>
        </div>
        <Button>
          <IconPlus class="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Error Display */}
      <Show when={notesQuery.error}>
        <div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          Failed to load notes: {notesQuery.error?.message}
        </div>
      </Show>

      {/* Search and Filters */}
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search notes..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            class="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm">
            <IconTag class="mr-2 h-4 w-4" />
            All Tags
          </Button>
          <Button variant="outline" size="sm">
            <IconCalendar class="mr-2 h-4 w-4" />
            Recent
          </Button>
        </div>
      </div>

      {/* Loading State */}
      <Show when={notesQuery.isLoading}>
        <div class="flex items-center justify-center py-12">
          <IconLoader2 class="h-8 w-8 animate-spin text-blue-400" />
          <span class="ml-2 text-gray-400">Loading notes...</span>
        </div>
      </Show>

      {/* Notes Grid */}
      <Show when={!notesQuery.isLoading && !notesQuery.error}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={filteredNotes()}>
            {(note) => (
              <Card class="hover:shadow-lg transition-shadow">
                <CardHeader class="pb-3">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                        <IconNotebook class="h-4 w-4 text-white" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <CardTitle class="text-lg text-white truncate">
                          {note.title}
                        </CardTitle>
                        <CardDescription class="text-xs text-gray-400">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent class="space-y-3">
                  {note.content && (
                    <p class="text-sm text-gray-300 line-clamp-3">
                      {note.content}
                    </p>
                  )}
                  
                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div class="flex flex-wrap gap-1">
                      <For each={note.tags}>
                        {(tag) => (
                          <span
                            class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300"
                          >
                            {tag}
                          </span>
                        )}
                      </For>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div class="flex items-center justify-between pt-2 border-t border-gray-700">
                    <span class="text-xs text-gray-400">
                      Created {new Date(note.created_at).toLocaleDateString()}
                    </span>
                    <div class="flex space-x-1">
                      <Button variant="ghost" size="sm" class="text-gray-400 hover:text-white">
                        <IconEdit class="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        class="text-gray-400 hover:text-red-400"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <IconTrash class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </For>
        </div>
        
        {/* Empty State */}
        <Show when={filteredNotes().length === 0}>
          <div class="text-center py-12">
            <IconNotebook class="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 class="text-lg font-medium text-white mb-2">No notes found</h3>
            <p class="text-gray-400 mb-4">
              {searchQuery() ? 'Try adjusting your search terms' : 'Create your first note to get started'}
            </p>
            <Button>
              <IconPlus class="mr-2 h-4 w-4" />
              New Note
            </Button>
          </div>
        </Show>
      </Show>

    </div>
  )
}
