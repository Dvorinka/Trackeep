import { createSignal, onMount, For, Show } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchTagFilterBar } from '@/components/ui/SearchTagFilterBar';
import { FileUpload } from '@/components/ui/FileUpload';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';
import { getFileTypeConfig, formatFileSize, getFileCategoryColor } from '@/utils/fileTypes';
import { getApiV1BaseUrl } from '@/lib/api-url';
import { 
  IconUpload,
  IconEye,
  IconTrash,
  IconDownload,
  IconCopy,
  IconShare
} from '@tabler/icons-solidjs';

const API_BASE_URL = getApiV1BaseUrl();

interface FileItem {
  id: number;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  description?: string;
  tags: string[];
  associations?: Association[];
  url?: string;
  isLink?: boolean;
  preview?: string;
  downloadUrl?: string;
  viewUrl?: string;
  shareUrl?: string;
}

interface Association {
  id: string;
  type: 'task' | 'bookmark' | 'note' | 'project';
  title: string;
}

export const Files = () => {
  const [files, setFiles] = createSignal<FileItem[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [showUploadModal, setShowUploadModal] = createSignal(false);
  const [showPreviewModal, setShowPreviewModal] = createSignal(false);
  const [selectedFile, setSelectedFile] = createSignal<FileItem | null>(null);
  const [copiedLink, setCopiedLink] = createSignal(false);

  onMount(async () => {
    try {
      const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/files`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const filesData = await response.json();
      const mappedFiles: FileItem[] = (Array.isArray(filesData) ? filesData : []).map((file: any, index) => ({
        id: Number(file.id || index + 1),
        name: file.original_name || file.file_name || `File ${index + 1}`,
        size: Number(file.file_size || file.size || 0),
        type: file.mime_type || file.type || 'application/octet-stream',
        uploadedAt: file.created_at || file.uploadedAt || new Date().toISOString(),
        description: file.description,
        tags: Array.isArray(file.tags)
          ? file.tags.map((tag: any) => (typeof tag === 'string' ? tag : tag?.name)).filter(Boolean)
          : [],
        url: file.url,
        isLink: Boolean(file.is_link),
        preview: file.preview,
        downloadUrl: file.download_url,
        viewUrl: file.view_url,
        shareUrl: file.share_url
      }));
      setFiles(mappedFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  });

  const filteredFiles = () => {
    const term = searchTerm().toLowerCase();
    const tags = selectedTags();
    
    return files().filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(term) ||
        file.description?.toLowerCase().includes(term) ||
        file.tags.some(tag => tag.toLowerCase().includes(term));
      
      const matchesTags = tags.length === 0 || 
        tags.every(tag => file.tags.includes(tag));
      
      return matchesSearch && matchesTags;
    });
  };

  const allTags = () => {
    const tagSet = new Set<string>();
    files().forEach(file => {
      file.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const toggleTag = (tag: string) => {
    const currentTags = selectedTags();
    if (currentTags.includes(tag)) {
      setSelectedTags([]);
    } else {
      setSelectedTags([tag]);
    }
  };


  const handleFileUpload = async (uploadedFiles: any[]) => {
    try {
      // Convert uploaded files to FileItem format
      const newFiles: FileItem[] = uploadedFiles.map((fileData) => ({
        id: Date.now() + Math.random(),
        name: fileData.name || 'Untitled',
        size: fileData.size || 0,
        type: fileData.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        description: '',
        tags: [],
        url: fileData.url,
        isLink: !!fileData.url,
        downloadUrl: fileData.url || `/files/download/${Date.now()}`,
        viewUrl: fileData.url || `/files/view/${Date.now()}`,
        shareUrl: `/files/share/${Date.now()}`
      }));

      setFiles(prev => [...newFiles, ...prev]);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Failed to upload files:', error);
    }
  };

  const handlePreviewFile = (file: FileItem) => {
    setSelectedFile(file);
    setShowPreviewModal(true);
  };

  const handleCopyLink = async (file: FileItem) => {
    try {
      const link = file.isLink ? file.url : file.shareUrl || '#';
      if (link) {
        await navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareFile = (file: FileItem) => {
    // In a real app, this would open a share dialog or generate a shareable link
    const shareUrl = file.shareUrl || '#';
    if (navigator.share) {
      navigator.share({
        title: file.name,
        text: file.description,
        url: shareUrl
      });
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleDownloadFile = (file: FileItem) => {
    if (file.isLink && file.url) {
      window.open(file.url, '_blank');
    } else if (file.downloadUrl) {
      // In a real app, this would trigger an actual download
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.name;
      link.click();
    }
  };


  const deleteFile = async (fileId: number) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/v1/files/${fileId}`, { method: 'DELETE' });
      
      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  return (
    <div class="p-6 space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-foreground">Files</h1>
        <Button onClick={() => setShowUploadModal(true)}>
          <IconUpload class="size-4 mr-2" />
          Upload File
        </Button>
      </div>

      <SearchTagFilterBar
        searchPlaceholder="Search files..."
        searchValue={searchTerm()}
        onSearchChange={(value) => setSearchTerm(value)}
        tagOptions={allTags()}
        selectedTag={selectedTags()[0] || ''}
        onTagChange={(value) => setSelectedTags(value ? [value] : [])}
        onReset={() => {
          setSearchTerm('');
          setSelectedTags([]);
        }}
      />

      <Show when={copiedLink()}>
        <div class="bg-primary/15 text-primary px-3 py-1 rounded-md text-sm">
          Link copied!
        </div>
      </Show>

      {isLoading() ? (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map(() => (
            <Card class="p-6">
              <div class="animate-pulse">
                <div class="h-12 bg-[#262626] rounded mb-4"></div>
                <div class="h-4 bg-[#262626] rounded mb-2"></div>
                <div class="h-4 bg-[#262626] rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <For each={filteredFiles()}>
              {(file) => {
                const fileTypeConfig = getFileTypeConfig(file.type, file.name);
                const IconComponent = fileTypeConfig.icon;
                
                return (
                  <Card 
                    class="p-6 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handlePreviewFile(file)}
                  >
                    <div class="flex items-start justify-between mb-4">
                      <div class={`text-3xl ${fileTypeConfig.color}`}>
                        <IconComponent size={32} />
                      </div>
                      <div class="flex gap-1">
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewFile(file);
                          }}
                          class="text-foreground hover:text-foreground/80 p-1"
                        >
                          <IconEye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(file);
                          }}
                          class="text-foreground hover:text-foreground/80 p-1"
                        >
                          <IconCopy size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareFile(file);
                          }}
                          class="text-foreground hover:text-foreground/80 p-1"
                        >
                          <IconShare size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(file.id);
                          }}
                          class="text-destructive hover:text-destructive/80 p-1"
                        >
                          <IconTrash size={16} />
                        </Button>
                      </div>
                    </div>
                    
                    <div class="mb-2">
                      <span class={`inline-block px-2 py-1 text-xs rounded-full ${getFileCategoryColor(fileTypeConfig.category)}`}>
                        {fileTypeConfig.displayName}
                      </span>
                      {file.isLink && (
                        <span class="ml-2 inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Link
                        </span>
                      )}
                    </div>
                    
                    <h3 class="text-lg font-semibold text-foreground mb-1 truncate">
                      {file.name}
                    </h3>
                    
                    <p class="text-muted-foreground text-sm mb-2">
                      {formatFileSize(file.size)}
                    </p>
                    
                    {file.description && (
                      <p class="text-foreground text-sm mb-3 line-clamp-2">
                        {file.description}
                      </p>
                    )}
                    
                    {/* Tags */}
                    <div class="flex flex-wrap gap-1 mb-3">
                      <For each={file.tags}>
                        {(tag) => (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTag(tag);
                            }}
                            class="px-2 py-1 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs rounded-md transition-colors cursor-pointer"
                          >
                            {tag}
                          </button>
                        )}
                      </For>
                    </div>
                    
                    {/* Associations */}
                    <Show when={file.associations && file.associations.length > 0}>
                      <div class="mb-3">
                        <p class="text-xs text-muted-foreground mb-1">Linked to:</p>
                        <div class="flex flex-wrap gap-1">
                          <For each={file.associations}>
                            {(assoc) => (
                              <span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                                {assoc.type}: {assoc.title}
                              </span>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>
                    
                    <div class="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                      <div class="flex gap-1">
                        <Button 
                          variant="ghost" 
                          class="text-foreground hover:text-foreground/80 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
                          }}
                        >
                          <IconDownload size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              }}
            </For>
          </div>

          {filteredFiles().length === 0 && (
            <Card class="p-12 text-center">
              <p class="text-muted-foreground">
                {searchTerm() || selectedTags().length > 0 
                  ? 'No files found matching your search or filters.' 
                  : 'No files uploaded yet. Upload your first file!'}
              </p>
            </Card>
          )}
        </>
      )}

      {/* File Upload Modal */}
      <FileUpload
        isOpen={showUploadModal()}
        onClose={() => setShowUploadModal(false)}
        onFilesChange={handleFileUpload}
        maxFileSize={50}
        acceptedTypes={['image/jpeg', 'image/png', 'application/pdf', 'video/mp4']}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={showPreviewModal()}
        onClose={() => setShowPreviewModal(false)}
        file={selectedFile()}
      />
    </div>
  );
};
