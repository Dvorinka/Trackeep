import { Button } from '@/components/ui/Button';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { Show } from 'solid-js';
import { NoteContentRenderer } from '@/components/notes/NoteContentRenderer';
import { IconX, IconEdit, IconPin, IconTrash, IconCopy, IconDownload, IconPaperclip } from '@tabler/icons-solidjs';

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  pinned: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    url?: string;
  }>;
  isMarkdown?: boolean;
  isHtml?: boolean;
}

interface ViewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onEdit: (note: Note) => void;
  onTogglePin: (noteId: number) => void;
  onDelete: (noteId: number) => void;
  onCopyContent?: (note: Note) => void;
  onExportNote?: (note: Note) => void;
  onUpdateNote?: (noteId: number, content: string) => void;
}

export const ViewNoteModal = (props: ViewNoteModalProps) => {
  console.log('ViewNoteModal render:', { isOpen: props.isOpen, note: props.note?.title });

  const getNoteKind = () => {
    if (props.note?.isHtml) return 'html' as const;
    if (props.note?.isMarkdown) return 'markdown' as const;
    return 'plain' as const;
  };

  const updateNoteCheckbox = (checkboxIndex: number, nextChecked: boolean) => {
    if (!props.note || !props.onUpdateNote) return;

    let taskCounter = 0;
    const nextContent = props.note.content
      .split('\n')
      .map((line) => {
        const uncheckedMatch = line.match(/^- \[ \] (.*)$/);
        const checkedMatch = line.match(/^- \[(x|X)\] (.*)$/);
        if (!uncheckedMatch && !checkedMatch) {
          return line;
        }

        const currentIndex = taskCounter;
        taskCounter += 1;
        if (currentIndex !== checkboxIndex) {
          return line;
        }

        const label = uncheckedMatch?.[1] || checkedMatch?.[2] || '';
        return nextChecked ? `- [x] ${label}` : `- [ ] ${label}`;
      })
      .join('\n');

    props.onUpdateNote(props.note.id, nextContent);
  };
  
  return (
    <ModalPortal>
      <>
        {/* Backdrop */}
        <Show when={props.isOpen && props.note}>
          <div
            class="fixed inset-0 bg-black/60 z-50"
            onClick={props.onClose}
          />
        </Show>

        {/* Modal */}
        <Show when={props.isOpen && props.note}>
          <div
            class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-2xl transition-all duration-300 z-50"
            style="width: 800px; max-width: 90vw; max-height: 85vh; overflow-y: auto;"
          >
            {props.note && (
              <>
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-border">
          <div class="flex items-center gap-3">
            <h3 class="text-xl font-semibold text-[#fafafa]">{props.note.title}</h3>
            {props.note.pinned && <IconPin class="size-5 text-primary" />}
            {props.note.isMarkdown && <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded">MD</span>}
            {props.note.isHtml && <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded">HTML</span>}
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => props.onCopyContent?.(props.note!)}
              class="text-primary hover:text-primary/80 p-1"
            >
              <IconCopy size={18} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => props.onExportNote?.(props.note!)}
              class="text-primary hover:text-primary/80 p-1"
            >
              <IconDownload size={18} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                props.onEdit(props.note!);
                props.onClose();
              }}
              class="text-primary hover:text-primary/80 p-1"
            >
              <IconEdit size={18} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                props.onTogglePin(props.note!.id);
                props.onClose();
              }}
              class="text-primary hover:text-primary/80 p-1"
            >
              <IconPin size={18} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm('Are you sure you want to delete this note?')) {
                  props.onDelete(props.note!.id);
                  props.onClose();
                }
              }}
              class="text-red-400 hover:text-red-300 p-1"
            >
              <IconTrash size={18} />
            </Button>
            <button
              onClick={props.onClose}
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
            >
              <IconX class="size-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div class="p-6 space-y-4">
          {/* Tags */}
          {props.note.tags.length > 0 && (
            <div class="flex flex-wrap gap-2">
              {props.note.tags.map((tag) => (
                <span class="px-3 py-1 bg-[#262626] text-[#a3a3a3] text-sm rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Attachments */}
          {props.note.attachments && props.note.attachments.length > 0 && (
            <div>
              <div class="flex items-center gap-2 mb-3">
                <IconPaperclip class="size-4 text-[#a3a3a3]" />
                <span class="text-sm text-[#a3a3a3]">Attachments ({props.note.attachments.length})</span>
              </div>
              <div class="space-y-2">
                {props.note.attachments.map((attachment) => (
                  <div class="flex items-center justify-between p-3 bg-[#262626] rounded-md">
                    <div class="flex items-center gap-3">
                      <span class="text-[#fafafa]">{attachment.name}</span>
                      <span class="text-xs text-[#666]">({attachment.size})</span>
                    </div>
                    <Button variant="ghost" size="sm" class="text-primary hover:text-primary/80">
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note Content */}
          <div class="max-w-none note-content">
            <NoteContentRenderer
              content={props.note.content}
              kind={getNoteKind()}
              onToggleTask={props.onUpdateNote ? updateNoteCheckbox : undefined}
            />
          </div>

          {/* Metadata */}
          <div class="pt-4 border-t border-border">
            <div class="text-sm text-[#a3a3a3] space-y-1">
              <p>Created: {new Date(props.note.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(props.note.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
              </>
            )}
          </div>
        </Show>
      </>
    </ModalPortal>
  );
};
