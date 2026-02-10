import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { TagPicker } from '@/components/ui/TagPicker';
import { IconX, IconTag } from '@tabler/icons-solidjs';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: any) => void;
  note?: any;
  availableTags?: string[];
}

export const NoteModal = (props: NoteModalProps) => {
  const [noteData, setNoteData] = createSignal({
    title: props.note?.title || '',
    content: props.note?.content || '',
    tags: props.note?.tags || []
  });

  const defaultTags = ['ideas', 'work', 'personal', 'todo', 'meeting', 'project', 'research', 'important'];
  const availableTags = () => props.availableTags || defaultTags;

  const handleSubmit = () => {
    const note = {
      id: props.note?.id,
      title: noteData().title,
      content: noteData().content,
      tags: noteData().tags
    };
    props.onSubmit(note);
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
      }`} style="width: 600px; max-width: 90vw; max-height: 80vh; overflow-y: auto;">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-border">
          <h3 class="text-lg font-semibold">
            {props.note ? 'Edit Note' : 'Add New Note'}
          </h3>
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
            type="text"
            placeholder="Note title"
            value={noteData().title}
            onInput={(e: any) => setNoteData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <IconTag class="size-4" />
              Content
            </label>
            <RichTextEditor
              value={noteData().content}
              onChange={(content) => setNoteData(prev => ({ ...prev, content }))}
              placeholder="Write your note here..."
              mode="markdown"
            />
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">Tags</label>
            <TagPicker
              availableTags={availableTags()}
              selectedTags={noteData().tags}
              onTagsChange={(tags) => setNoteData(prev => ({ ...prev, tags }))}
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
          <Button onClick={handleSubmit} disabled={!noteData().title.trim()}>
            {props.note ? 'Update Note' : 'Save Note'}
          </Button>
        </div>
      </div>
    </>
  );
};
