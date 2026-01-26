import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  IconSearch, 
  IconDownload,
  IconTrash,
  IconCalendar,
  IconLoader2,
  IconUpload
} from '@tabler/icons-solidjs'
import { createSignal, For, Show } from 'solid-js'
import { filesApi, type FileItem } from '@/lib/api-client'

const fileIcons = {
  'document': '📄',
  'image': '🖼️',
  'video': '🎥',
  'audio': '🎵',
  'archive': '📦',
  'other': '📁'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function Files() {
  const [searchQuery, setSearchQuery] = createSignal('')
  
  const filesQuery = filesApi.useGetAll()
  const deleteFileMutation = filesApi.useDelete()
  const uploadFileMutation = filesApi.useUpload()

  const filteredFiles = () => {
    const query = searchQuery().toLowerCase()
    if (!query) return filesQuery.data || []
    
    return (filesQuery.data || []).filter(file => 
      file.original_name.toLowerCase().includes(query) ||
      file.mime_type.toLowerCase().includes(query)
    )
  }

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('document') || mimeType.includes('pdf') || mimeType.includes('text')) return 'document'
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive'
    return 'other'
  }

  const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    try {
      await uploadFileMutation.mutateAsync(file)
      target.value = '' // Reset input
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    }
  }

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    
    try {
      await deleteFileMutation.mutateAsync(fileId)
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    }
  }

  const handleDownloadFile = (file: FileItem) => {
    const link = document.createElement('a')
    link.href = `http://localhost:8080/api/v1/files/${file.id}/download`
    link.download = file.original_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Files</h1>
          <p class="text-gray-400 mt-2">Store and manage your documents and media</p>
        </div>
        <div class="relative">
          <input
            type="file"
            id="file-upload"
            class="hidden"
            onChange={handleFileUpload}
            disabled={uploadFileMutation.isPending}
          />
          <label for="file-upload">
            <Button 
              disabled={uploadFileMutation.isPending}
              class="cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {uploadFileMutation.isPending ? (
                <>
                  <IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <IconUpload class="mr-2 h-4 w-4" />
                  Upload File
                </>
              )}
            </Button>
          </label>
        </div>
      </div>

      {/* Error Display */}
      <Show when={filesQuery.error}>
        <div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          Failed to load files: {filesQuery.error?.message}
        </div>
      </Show>

      {/* Search and Filters */}
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search files..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            class="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm">
            All Types
          </Button>
          <Button variant="outline" size="sm">
            All Tags
          </Button>
          <Button variant="outline" size="sm">
            <IconCalendar class="mr-2 h-4 w-4" />
            Recent
          </Button>
        </div>
      </div>

      {/* Loading State */}
      <Show when={filesQuery.isLoading}>
        <div class="flex items-center justify-center py-12">
          <IconLoader2 class="h-8 w-8 animate-spin text-blue-400" />
          <span class="ml-2 text-gray-400">Loading files...</span>
        </div>
      </Show>

      {/* Files Grid */}
      <Show when={!filesQuery.isLoading && !filesQuery.error}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={filteredFiles()}>
            {(file) => (
              <Card class="hover:shadow-lg transition-shadow">
                <CardHeader class="pb-3">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-3">
                      <span class="text-2xl">
                        {fileIcons[getFileType(file.mime_type) as keyof typeof fileIcons] || fileIcons.other}
                      </span>
                      <div class="min-w-0 flex-1">
                        <CardTitle class="text-lg text-white truncate">
                          {file.original_name}
                        </CardTitle>
                        <CardDescription class="text-xs text-gray-400">
                          {formatFileSize(file.file_size)} • {getFileType(file.mime_type).toUpperCase()}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent class="space-y-3">
                  {file.mime_type && (
                    <p class="text-sm text-gray-300 mb-3">
                      {file.mime_type}
                    </p>
                  )}
                  
                  {/* Actions */}
                  <div class="flex items-center justify-between pt-2 border-t border-gray-700">
                    <span class="text-xs text-gray-400">
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>
                    <div class="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        class="text-gray-400 hover:text-white"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <IconDownload class="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        class="text-gray-400 hover:text-red-400"
                        onClick={() => handleDeleteFile(file.id)}
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
        <Show when={filteredFiles().length === 0}>
          <div class="text-center py-12">
            <div class="mx-auto h-12 w-12 text-gray-400 mb-4 flex items-center justify-center text-2xl">📁</div>
            <h3 class="text-lg font-medium text-white mb-2">No files found</h3>
            <p class="text-gray-400 mb-4">
              {searchQuery() ? 'Try adjusting your search terms' : 'Upload your first file to get started'}
            </p>
            <label for="file-upload">
              <Button 
                disabled={uploadFileMutation.isPending}
                class="cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <IconUpload class="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </label>
          </div>
        </Show>
      </Show>

    </div>
  )
}
