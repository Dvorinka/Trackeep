import { createSignal, onMount } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TagPicker } from '@/components/ui/TagPicker';
import { IconX } from '@tabler/icons-solidjs';

interface Bookmark {
  id: number;
  title: string;
  url: string;
  description?: string;
  tags: string[];
}

interface EditBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookmark: Partial<Bookmark>) => void;
  bookmark: Bookmark | null;
  availableTags?: string[];
}

export const EditBookmarkModal = (props: EditBookmarkModalProps) => {
  const [editBookmark, setEditBookmark] = createSignal({
    title: '',
    url: '',
    description: ''
  });
  const [tags, setTags] = createSignal<string[]>([]);

  const defaultTags = ['reading', 'article', 'dev', 'tutorial', 'docs', 'tool', 'video', 'personal', 'work'];
  const availableTags = () => (props.availableTags && props.availableTags.length > 0 ? props.availableTags : defaultTags);

  // Update form when bookmark changes
  onMount(() => {
    if (props.bookmark) {
      setEditBookmark({
        title: props.bookmark.title,
        url: props.bookmark.url,
        description: props.bookmark.description || ''
      });
      setTags(props.bookmark.tags || []);
    }
  });

  // Update form when bookmark prop changes
  const updateForm = () => {
    if (props.bookmark) {
      setEditBookmark({
        title: props.bookmark.title,
        url: props.bookmark.url,
        description: props.bookmark.description || ''
      });
      setTags(props.bookmark.tags || []);
    }
  };

  // Call updateForm when bookmark changes
  if (props.bookmark) {
    updateForm();
  }

  const handleSubmit = () => {
    const bookmark = {
      title: editBookmark().title || editBookmark().url,
      url: editBookmark().url,
      description: editBookmark().description,
      tags: tags()
    };
    props.onSubmit(bookmark);
  };

  return (
    <>
      {/* Backdrop */}
      {props.isOpen && (
        <div class="fixed inset-0 bg-black/50 z-40" onClick={props.onClose} />
      )}

      {/* Modal */}
      <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-50 ${
        props.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`} style="width: 500px; max-width: 90vw;">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-border">
          <h3 class="text-lg font-semibold">Edit Bookmark</h3>
          <button
            onClick={props.onClose}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
          >
            <IconX class="size-4" />
          </button>
        </div>

        {/* Content */}
        <div class="p-6 space-y-4">
          <Input
            type="url"
            placeholder="URL *"
            value={editBookmark().url}
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              if (target) setEditBookmark(prev => ({ ...prev, url: target.value }));
            }}
            required
          />
          <Input
            type="text"
            placeholder="Title"
            value={editBookmark().title}
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              if (target) setEditBookmark(prev => ({ ...prev, title: target.value }));
            }}
          />
          <Input
            type="text"
            placeholder="Description"
            value={editBookmark().description}
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              if (target) setEditBookmark(prev => ({ ...prev, description: target.value }));
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
        <div class="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!editBookmark().url.trim()}>
            Save Changes
          </Button>
        </div>
      </div>
    </>
  );
};
