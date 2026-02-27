import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { 
  IconX, 
  IconUpload, 
  IconLink, 
  IconTag,
  IconFileText,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFolder
} from '@tabler/icons-solidjs';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (fileData: any) => void;
}

interface Association {
  id: string;
  type: 'task' | 'bookmark' | 'note' | 'project';
  title: string;
}

export const FileUploadModal = (props: FileUploadModalProps) => {
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [description, setDescription] = createSignal('');
  const [tags, setTags] = createSignal<string[]>([]);
  const [tagInput, setTagInput] = createSignal('');
  const [associations, setAssociations] = createSignal<Association[]>([]);
  const [linkUrl, setLinkUrl] = createSignal('');
  const [isLinkMode, setIsLinkMode] = createSignal(false);
  const [dragActive, setDragActive] = createSignal(false);

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.isOpen) {
        props.onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
    });
  });

  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      setSelectedFile(target.files[0]);
      setIsLinkMode(false);
    }
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setIsLinkMode(false);
    }
  };

  const addTag = () => {
    const tag = tagInput().trim();
    if (tag && !tags().includes(tag)) {
      setTags([...tags(), tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags().filter(tag => tag !== tagToRemove));
  };

  const addAssociation = (type: Association['type']) => {
    // Mock association - in real app, this would open a picker
    const mockAssociation: Association = {
      id: Date.now().toString(),
      type,
      title: `Sample ${type} ${Date.now()}`
    };
    setAssociations([...associations(), mockAssociation]);
  };

  const removeAssociation = (id: string) => {
    setAssociations(associations().filter(assoc => assoc.id !== id));
  };

  const handleUpload = () => {
    const fileData = {
      file: selectedFile(),
      linkUrl: linkUrl(),
      description: description(),
      tags: tags(),
      associations: associations(),
      isLinkMode: isLinkMode()
    };
    
    props.onUpload(fileData);
    props.onClose();
    
    // Reset form
    setSelectedFile(null);
    setDescription('');
    setTags([]);
    setTagInput('');
    setAssociations([]);
    setLinkUrl('');
    setIsLinkMode(false);
  };

  const getFileIcon = (file?: File) => {
    if (!file) return IconFolder;
    
    if (file.type.startsWith('image/')) return IconPhoto;
    if (file.type.startsWith('video/')) return IconVideo;
    if (file.type.startsWith('audio/')) return IconMusic;
    return IconFileText;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const canUpload = () => {
    if (isLinkMode()) {
      return linkUrl() && isValidUrl(linkUrl());
    }
    return selectedFile() !== null;
  };

  return (
    <ModalPortal>
      <Show when={props.isOpen}>
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={props.onClose}
        >
          <div
            class="bg-card rounded-lg border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 my-4"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold">Upload File</h2>
            <Button variant="ghost" onClick={props.onClose}>
              <IconX class="size-4" />
            </Button>
          </div>

          {/* Upload Mode Toggle */}
          <div class="flex gap-2 mb-6">
            <Button
              variant={!isLinkMode() ? "default" : "outline"}
              onClick={() => setIsLinkMode(false)}
              class="flex-1"
            >
              <IconUpload class="size-4 mr-2" />
              Upload File
            </Button>
            <Button
              variant={isLinkMode() ? "default" : "outline"}
              onClick={() => setIsLinkMode(true)}
              class="flex-1"
            >
              <IconLink class="size-4 mr-2" />
              Add Link
            </Button>
          </div>

          {/* File Upload Area */}
          <Show when={!isLinkMode()}>
            <Card class="p-8 mb-6">
              <div
                class={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive() 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  onChange={handleFileSelect}
                  class="hidden"
                  id="file-input"
                />
                
                <Show 
                  when={selectedFile()}
                  fallback={
                    <div>
                      <IconUpload class="size-12 mx-auto mb-4 text-muted-foreground" />
                      <p class="text-lg font-medium mb-2">Drop file here or click to browse</p>
                      <p class="text-sm text-muted-foreground mb-4">
                        Supports all file types
                      </p>
                      <Button onClick={() => document.getElementById('file-input')?.click()}>
                        Choose File
                      </Button>
                    </div>
                  }
                >
                  <div class="flex items-center gap-4 justify-center">
                    <div class="text-4xl text-primary">
                      {(() => {
                        const IconComponent = getFileIcon(selectedFile()!);
                        return <IconComponent size={48} />;
                      })()}
                    </div>
                    <div class="text-left">
                      <p class="font-medium">{selectedFile()!.name}</p>
                      <p class="text-sm text-muted-foreground">
                        {(selectedFile()!.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById('file-input')?.click()}
                        class="mt-2"
                      >
                        Change File
                      </Button>
                    </div>
                  </div>
                </Show>
              </div>
            </Card>
          </Show>

          {/* Link Input */}
          <Show when={isLinkMode()}>
            <div class="mb-6">
              <label class="block text-sm font-medium mb-2">File URL</label>
              <Input
                type="url"
                placeholder="https://example.com/file.pdf"
                value={linkUrl()}
                onInput={(e: any) => setLinkUrl(e.currentTarget.value)}
                class="w-full"
              />
            </div>
          </Show>

          {/* Description */}
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Description</label>
            <textarea
              class="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
              rows={3}
              placeholder="Optional description..."
              value={description()}
              onInput={(e: any) => setDescription(e.currentTarget.value)}
            />
          </div>

          {/* Tags */}
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Tags</label>
            <div class="flex gap-2 mb-3">
              <Input
                type="text"
                placeholder="Add tag..."
                value={tagInput()}
                onInput={(e: any) => setTagInput(e.currentTarget.value)}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                class="flex-1"
              />
              <Button onClick={addTag} disabled={!tagInput().trim()}>
                <IconTag class="size-4" />
              </Button>
            </div>
            <div class="flex flex-wrap gap-2">
              <For each={tags()}>
                {(tag) => (
                  <span class="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTag(tag)}
                      class="h-4 w-4 p-0 hover:bg-primary/20"
                    >
                      <IconX class="size-3" />
                    </Button>
                  </span>
                )}
              </For>
            </div>
          </div>

          {/* Associations */}
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Link to</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addAssociation('task')}
              >
                Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addAssociation('bookmark')}
              >
                Bookmark
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addAssociation('note')}
              >
                Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addAssociation('project')}
              >
                Project
              </Button>
            </div>
            <div class="space-y-2">
              <For each={associations()}>
                {(assoc) => (
                  <div class="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span class="text-sm">
                      <span class="font-medium capitalize">{assoc.type}:</span> {assoc.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssociation(assoc.id)}
                      class="h-6 w-6 p-0"
                    >
                      <IconX class="size-3" />
                    </Button>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Actions */}
          <div class="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={props.onClose} class="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!canUpload()} class="flex-1">
              Upload
            </Button>
          </div>
          </div>
        </div>
      </Show>
    </ModalPortal>
  );
};
