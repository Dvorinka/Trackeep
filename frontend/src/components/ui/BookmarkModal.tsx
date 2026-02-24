import { createSignal, createEffect } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TagPicker } from '@/components/ui/TagPicker';
import { IconX } from '@tabler/icons-solidjs';

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookmark: any) => void;
  availableTags?: string[];
}

export const BookmarkModal = (props: BookmarkModalProps) => {
  const [newBookmark, setNewBookmark] = createSignal({
    title: '',
    url: '',
    description: ''
  });
  const [faviconPreview, setFaviconPreview] = createSignal('');
  const [tags, setTags] = createSignal<string[]>([]);

  const defaultTags = ['reading', 'article', 'dev', 'tutorial', 'docs', 'tool', 'video', 'personal', 'work'];
  const availableTags = () => (props.availableTags && props.availableTags.length > 0 ? props.availableTags : defaultTags);

  // Update favicon preview when URL changes
  createEffect(() => {
    const url = newBookmark().url;
    if (url) {
      try {
        const urlObj = new URL(url);
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
        setFaviconPreview(faviconUrl);
      } catch {
        setFaviconPreview('');
      }
    } else {
      setFaviconPreview('');
    }
  });

  const handleSubmit = () => {
    const bookmark = {
      title: newBookmark().title || newBookmark().url,
      url: newBookmark().url,
      description: newBookmark().description,
      tags: tags()
    };
    props.onSubmit(bookmark);
    setNewBookmark({ title: '', url: '', description: '' });
    setTags([]);
  };

  return (
    <>
      {/* Backdrop */}
      {props.isOpen && (
        <div class="fixed inset-0 bg-black/50 z-[60] mt-0" onClick={props.onClose} />
      )}

      {/* Modal */}
      <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-[70] ${
        props.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`} style="width: min(500px, 90vw); max-height: min(80vh, 600px); overflow-y: auto;">
        {/* Header */}
        <div class="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <h3 class="text-lg font-semibold">Add New Bookmark</h3>
          <button
            onClick={props.onClose}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
          >
            <IconX class="size-4" />
          </button>
        </div>

        {/* Content */}
        <div class="p-4 sm:p-6 space-y-4">
          <div class="relative">
            <Input
              type="url"
              placeholder="URL *"
              value={newBookmark().url}
              onInput={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                if (target) setNewBookmark(prev => ({ ...prev, url: target.value }));
              }}
              required
              class="pr-12"
            />
            {faviconPreview() && (
              <div class="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-muted rounded flex items-center justify-center overflow-hidden">
                <img 
                  src={faviconPreview()} 
                  alt="Site favicon" 
                  class="w-4 h-4 object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
          <Input
            type="text"
            placeholder="Title (optional)"
            value={newBookmark().title}
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              if (target) setNewBookmark(prev => ({ ...prev, title: target.value }));
            }}
          />
          <Input
            type="text"
            placeholder="Description (optional)"
            value={newBookmark().description}
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              if (target) setNewBookmark(prev => ({ ...prev, description: target.value }));
            }}
          />
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">Tags</label>
            <TagPicker
              availableTags={availableTags()}
              selectedTags={tags()}
              onTagsChange={(next) => setTags(next)}
              placeholder="Add tags..."
              allowNew={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div class="flex flex-col sm:flex-row justify-end gap-2 p-4 sm:p-6 border-t border-border">
          <Button variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!newBookmark().url.trim()}>
            Save Bookmark
          </Button>
        </div>
      </div>
    </>
  );
};
