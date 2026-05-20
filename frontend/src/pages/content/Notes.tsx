import { createSignal, onMount, For, Show } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchTagFilterBar } from '@/components/ui/SearchTagFilterBar';
import { NoteModal } from '@/components/ui/NoteModal';
import { ViewNoteModal } from '@/components/ui/ViewNoteModal';
import { NoteContentRenderer } from '@/components/notes/NoteContentRenderer';
import { IconPin, IconTrash, IconEdit, IconCopy } from '@tabler/icons-solidjs';
import { getMockNotes } from '@/lib/mockData';
import { isDemoMode, shouldUseRealBackend } from '@/lib/demo-mode';
import { getApiV1BaseUrl } from '@/lib/api-url';
import { useHaptics } from '@/lib/haptics';

const API_BASE_URL = getApiV1BaseUrl();

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

const normalizeNoteId = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const digits = value.match(/\d+/)?.[0];
    if (digits) {
      const parsed = Number(digits);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
};

const normalizeNoteDate = (value: unknown, fallback: Date = new Date()): string => {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    const relativeMatch = value.trim().match(/^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/i);
    if (relativeMatch) {
      const amount = Number(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      const relativeDate = new Date();
      const operations: Record<string, (date: Date, quantity: number) => void> = {
        minute: (date, quantity) => date.setMinutes(date.getMinutes() - quantity),
        hour: (date, quantity) => date.setHours(date.getHours() - quantity),
        day: (date, quantity) => date.setDate(date.getDate() - quantity),
        week: (date, quantity) => date.setDate(date.getDate() - quantity * 7),
        month: (date, quantity) => date.setMonth(date.getMonth() - quantity),
        year: (date, quantity) => date.setFullYear(date.getFullYear() - quantity),
      };
      operations[unit]?.(relativeDate, amount);
      return relativeDate.toISOString();
    }
  }

  return fallback.toISOString();
};

const getNoteKind = (note: Note): 'html' | 'markdown' | 'plain' => {
  if (note.isHtml) return 'html';
  if (note.isMarkdown) return 'markdown';
  return 'plain';
};

const formatDisplayDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return parsed.toLocaleDateString();
};

export const Notes = () => {
  const haptics = useHaptics();
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [loadError, setLoadError] = createSignal('');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showViewModal, setShowViewModal] = createSignal(false);
  const [editingNote, setEditingNote] = createSignal<Note | null>(null);
  const [viewingNote, setViewingNote] = createSignal<Note | null>(null);
  const [copiedContent, setCopiedContent] = createSignal(false);

  onMount(async () => {
    try {
      let notesData: any[] = [];
      setLoadError('');

      // Check if we should use demo mode or real API
      if (isDemoMode() && !shouldUseRealBackend()) {
        // Load mock notes data for demo mode
        const mockNotesData = getMockNotes();
        notesData = mockNotesData;
      } else {
        // Load from real API
        const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/notes`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load notes');
        }

        notesData = await response.json();
      }

      const adaptedNotes: Note[] = (Array.isArray(notesData) ? notesData : []).map((note: any, index) => {
        const tags = Array.isArray(note.tags)
          ? note.tags.map((tag: any) => (typeof tag === 'string' ? tag : tag?.name)).filter(Boolean)
          : [];

        const content = note.content || '';
        const createdAt = normalizeNoteDate(note.created_at || note.createdAt || note.createdAtLabel, new Date());
        const updatedAt = normalizeNoteDate(note.updated_at || note.updatedAt || createdAt, new Date(createdAt));

        return {
          id: normalizeNoteId(note.id, index + 1),
          title: note.title || 'Untitled note',
          content,
          createdAt,
          updatedAt,
          tags,
          pinned: Boolean(note.pinned ?? note.is_pinned ?? tags.includes('pinned')),
          attachments: Array.isArray(note.attachments)
            ? note.attachments.map((att: any, attachmentIndex: number) => ({
                id: String(att.id || `att_${attachmentIndex}`),
                name: att.name || 'attachment',
                type: att.type || 'file',
                size: att.size || '',
                url: att.url,
              }))
            : [],
          isMarkdown: Boolean(note.isMarkdown) || content.includes('#') || content.includes('*') || content.includes('```'),
          isHtml: content.includes('<') && content.includes('>'),
        };
      });

      setNotes(adaptedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setNotes([]);
      const message = error instanceof Error ? error.message : 'Failed to load notes.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  });

  const filteredNotes = () => {
    const term = searchTerm().toLowerCase();
    const tags = selectedTags();
    
    return notes().filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(term) ||
        note.content.toLowerCase().includes(term) ||
        note.tags.some(tag => tag.toLowerCase().includes(term));
      
      const matchesTags = tags.length === 0 || 
        tags.every(tag => note.tags.includes(tag));
      
      return matchesSearch && matchesTags;
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  const allTags = () => {
    const tagSet = new Set<string>();
    notes().forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
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

  const handleAddNote = async (noteData: any) => {
    try {
      if (isDemoMode() && !shouldUseRealBackend()) {
        // Demo mode: Add note locally
        const now = new Date();
        const note: Note = {
          id: Date.now(),
          title: noteData.title,
          content: noteData.content,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          tags: noteData.tags,
          pinned: false,
          isMarkdown: Boolean(noteData.content?.includes('```') || noteData.content?.includes('#')),
          isHtml: Boolean(noteData.content?.includes('<') && noteData.content?.includes('>')),
        };
        
        setNotes(prev => [note, ...prev]);
        setShowAddModal(false);
      } else {
        // Real API: Create note via API
        const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(noteData),
        });

        if (!response.ok) {
          throw new Error('Failed to create note');
        }

        const newNote = await response.json();
        const adaptedNote: Note = {
          id: normalizeNoteId(newNote.id, Date.now()),
          title: newNote.title,
          content: newNote.content || '',
          createdAt: normalizeNoteDate(newNote.created_at || newNote.createdAt || new Date().toISOString()),
          updatedAt: normalizeNoteDate(newNote.updated_at || newNote.updatedAt || newNote.created_at || new Date().toISOString()),
          tags: Array.isArray(newNote.tags) ? newNote.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name) : [],
          pinned: Boolean(newNote.pinned ?? newNote.is_pinned),
          attachments: [],
          isMarkdown: Boolean(newNote.content?.includes('#') || newNote.content?.includes('*') || newNote.content?.includes('```')),
          isHtml: Boolean(newNote.content?.includes('<') && newNote.content?.includes('>')),
        };

        setNotes(prev => [adaptedNote, ...prev]);
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleEditNote = async (noteData: any) => {
    try {
      if (isDemoMode() && !shouldUseRealBackend()) {
        // Demo mode: Update note locally
        setNotes(prev => prev.map(note => 
          note.id === noteData.id 
            ? { 
                ...note, 
                title: noteData.title, 
                content: noteData.content, 
                tags: noteData.tags,
                updatedAt: new Date().toISOString()
              }
            : note
        ));
        setShowEditModal(false);
        setEditingNote(null);
      } else {
        // Real API: Update note via API
        const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/notes/${noteData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(noteData),
        });

        if (!response.ok) {
          throw new Error('Failed to update note');
        }

        const updatedNote = await response.json();
        setNotes(prev => prev.map(note => 
          note.id === noteData.id 
            ? { 
                ...note, 
                title: updatedNote.title || noteData.title, 
                content: updatedNote.content || noteData.content, 
                tags: Array.isArray(updatedNote.tags) ? updatedNote.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name) : noteData.tags,
                updatedAt: updatedNote.updated_at || updatedNote.updatedAt || new Date().toISOString()
              }
            : note
        ));
        setShowEditModal(false);
        setEditingNote(null);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const togglePin = async (noteId: number) => {
    try {
      if (isDemoMode() && !shouldUseRealBackend()) {
        // Demo mode: Toggle pin locally
        setNotes(prev => prev.map(note => 
          note.id === noteId ? { ...note, pinned: !note.pinned } : note
        ));
      } else {
        // Real API: Toggle pin via API
        const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
        const note = notes().find(n => n.id === noteId);
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}/pin`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ pinned: !note?.pinned }),
        });

        if (!response.ok) {
          throw new Error('Failed to toggle pin');
        }

        setNotes(prev => prev.map(note => 
          note.id === noteId ? { ...note, pinned: !note.pinned } : note
        ));
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const deleteNote = async (noteId: number) => {
    try {
      if (isDemoMode() && !shouldUseRealBackend()) {
        // Demo mode: Delete note locally
        setNotes(prev => prev.filter(note => note.id !== noteId));
      } else {
        // Real API: Delete note via API
        const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete note');
        }

        setNotes(prev => prev.filter(note => note.id !== noteId));
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const startEditNote = (note: Note) => {
    setEditingNote(note);
    setShowEditModal(true);
  };

  const viewNote = (note: Note) => {
    console.log('Viewing note:', note.title);
    setViewingNote(note);
    setShowViewModal(true);
  };

  const copyNoteContent = async (note: Note) => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const exportNote = (note: Note) => {
    const content = note.isMarkdown ? `# ${note.title}\n\n${note.content}` : note.content;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateNoteCheckbox = (noteId: number, checkboxIndex: number, isChecked: boolean) => {
    setNotes(prev => prev.map(note => {
      if (note.id === noteId) {
        const lines = note.content.split('\n');
        let checkboxCount = 0;
        
        const updatedLines = lines.map(line => {
          const uncheckedMatch = line.match(/^- \[ \] (.*)$/);
          const checkedMatch = line.match(/^- \[x\] (.*)$/);
          
          if (uncheckedMatch || checkedMatch) {
            const currentCheckboxIndex = checkboxCount;
            checkboxCount++;
            if (currentCheckboxIndex === checkboxIndex) {
              const text = uncheckedMatch ? uncheckedMatch[1] : (checkedMatch ? checkedMatch[1] : '');
              return isChecked ? `- [x] ${text}` : `- [ ] ${text}`;
            }
          }
          return line;
        });
        
        return {
          ...note,
          content: updatedLines.join('\n'),
          updatedAt: new Date().toISOString()
        };
      }
      return note;
    }));

    setViewingNote(prev => {
      if (!prev || prev.id !== noteId) {
        return prev;
      }

      const lines = prev.content.split('\n');
      let checkboxCount = 0;
      const updatedLines = lines.map(line => {
        const uncheckedMatch = line.match(/^- \[ \] (.*)$/);
        const checkedMatch = line.match(/^- \[x\] (.*)$/);

        if (uncheckedMatch || checkedMatch) {
          const currentCheckboxIndex = checkboxCount;
          checkboxCount++;
          if (currentCheckboxIndex === checkboxIndex) {
            const text = uncheckedMatch ? uncheckedMatch[1] : (checkedMatch ? checkedMatch[1] : '');
            return isChecked ? `- [x] ${text}` : `- [ ] ${text}`;
          }
        }
        return line;
      });

      return {
        ...prev,
        content: updatedLines.join('\n'),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Handler for updating note content from ViewNoteModal
  const handleUpdateNoteContent = (noteId: number, content: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, content, updatedAt: new Date().toISOString() }
        : note
    ));
    setViewingNote(prev =>
      prev && prev.id === noteId
        ? { ...prev, content, updatedAt: new Date().toISOString() }
        : prev
    );
  };

  return (
    <div class="p-6 space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Notes</h1>
          <p class="text-muted-foreground mt-1">Your personal notes</p>
        </div>
        <Button
          onClick={() => {
            setShowAddModal(true);
            haptics.impact();
          }}
        >
          Add Note
        </Button>
      </div>

      <SearchTagFilterBar
        searchPlaceholder="Search notes..."
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

      <Show when={loadError()}>
        <Card class="border-destructive/30 bg-destructive/5 p-4">
          <p class="text-sm font-medium text-foreground">Notes could not be loaded</p>
          <p class="mt-1 text-sm text-muted-foreground">{loadError()}</p>
        </Card>
      </Show>

      <Show when={copiedContent()}>
        <div class="bg-primary/15 text-primary px-3 py-1 rounded-md text-sm">
          Content copied!
        </div>
      </Show>

      {isLoading() ? (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map(() => (
            <Card class="p-5 h-40">
              <div class="animate-pulse space-y-3">
                <div class="h-5 bg-muted rounded w-2/3"></div>
                <div class="h-3 bg-muted rounded w-full"></div>
                <div class="h-3 bg-muted rounded w-4/5"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={filteredNotes()}>
            {(note) => (
              <div
                class={`group relative bg-card rounded-xl border border-border p-5 cursor-pointer hover:shadow-lg hover:border-primary/20 transition-all ${note.pinned ? 'ring-1 ring-primary/20' : ''}`}
                onClick={() => viewNote(note)}
              >
                <Show when={note.pinned}>
                  <div class="absolute top-3 right-3">
                    <IconPin class="size-3.5 text-primary" />
                  </div>
                </Show>

                <h3 class={`text-base font-semibold text-foreground mb-2 pr-5 ${note.pinned ? 'text-primary' : ''}`}>
                  {note.title}
                </h3>

                <div class="text-muted-foreground text-sm line-clamp-3 mb-4">
                  <NoteContentRenderer
                    content={note.content}
                    kind={getNoteKind(note)}
                    preview={true}
                    maxBlocks={3}
                    onToggleTask={(taskIndex, nextChecked) => updateNoteCheckbox(note.id, taskIndex, nextChecked)}
                  />
                </div>

                <div class="flex flex-wrap gap-1.5 mb-3">
                  <For each={note.tags.slice(0, 4)}>
                    {(tag) => (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTag(tag);
                        }}
                        class="px-2 py-0.5 bg-muted/60 text-muted-foreground text-[10px] rounded-full cursor-pointer hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {tag}
                      </span>
                    )}
                  </For>
                  <Show when={note.tags.length > 4}>
                    <span class="px-2 py-0.5 text-muted-foreground text-[10px]">+{note.tags.length - 4}</span>
                  </Show>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-muted-foreground">
                    {formatDisplayDate(note.updatedAt)}
                  </span>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyNoteContent(note); }}
                      class="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Copy"
                    >
                      <IconCopy class="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditNote(note); }}
                      class="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <IconEdit class="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
                      class="p-1.5 rounded-md hover:bg-muted text-primary hover:text-primary/80"
                      title={note.pinned ? 'Unpin' : 'Pin'}
                    >
                      <IconPin class="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      class="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <IconTrash class="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>

          <Show when={filteredNotes().length === 0}>
            <div class="col-span-full">
              <Card class="p-12 text-center">
                <p class="text-muted-foreground">
                  {searchTerm() || selectedTags().length > 0
                    ? 'No notes found matching your search or filters.'
                    : 'No notes yet. Add your first note!'}
                </p>
              </Card>
            </div>
          </Show>
        </div>
      )}

      {/* Add Note Modal */}
      <NoteModal
        isOpen={showAddModal()}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddNote}
        availableTags={allTags()}
      />

      {/* Edit Note Modal */}
      <NoteModal
        isOpen={showEditModal()}
        onClose={() => {
          setShowEditModal(false);
          setEditingNote(null);
        }}
        onSubmit={handleEditNote}
        note={editingNote()}
        availableTags={allTags()}
      />

      {/* View Note Modal */}
      <ViewNoteModal
        isOpen={showViewModal()}
        onClose={() => {
          setShowViewModal(false);
          setViewingNote(null);
        }}
        note={viewingNote()}
        onEdit={startEditNote}
        onTogglePin={togglePin}
        onDelete={deleteNote}
        onCopyContent={copyNoteContent}
        onExportNote={exportNote}
        onUpdateNote={handleUpdateNoteContent}
      />
    </div>
  );
};
