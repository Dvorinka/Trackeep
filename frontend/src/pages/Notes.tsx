import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { SearchTagFilterBar } from '@/components/ui/SearchTagFilterBar';
import { NoteModal } from '@/components/ui/NoteModal';
import { ViewNoteModal } from '@/components/ui/ViewNoteModal';
import { IconPin, IconTrash, IconEdit, IconCopy, IconDownload, IconPaperclip } from '@tabler/icons-solidjs';
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

const renderMarkdownPreviewHtml = (content: string, maxBlocks = 4): string => {
  const html = content
    .replace(/^# (.*$)/gim, '<h1 class="text-base font-semibold mb-1">$1<\/h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-sm font-semibold mb-1">$1<\/h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold mb-1">$1<\/h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-xs font-semibold mb-1">$1<\/h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1<\/strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1<\/em>')
    .replace(/`(.*?)`/g, '<code class="bg-[#262626] px-1 py-0.5 rounded text-xs">$1<\/code>')
    .replace(/```(.*?)\n([\s\S]*?)```/g, '<pre class="bg-[#262626] p-3 rounded mb-2 overflow-x-auto"><code class="text-xs">$2<\/code><\/pre>')
    .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 mb-1"><input type="checkbox" class="note-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6;" onclick="this.checked=!this.checked" onchange="this.parentElement.nextElementSibling.textContent=this.checked?\'x\':\' \'"><span class="text-xs">$1</span></div>')
    .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 mb-1"><input type="checkbox" checked class="note-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6;" onclick="this.checked=!this.checked" onchange="this.parentElement.nextElementSibling.textContent=this.checked?\'x\':\' \'"><span class="text-xs">$1</span></div>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1<\/li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1<\/li>')
    .replace(/> (.*$)/gim, '<blockquote class="border-l-4 border-[#444] pl-3 italic text-[#aaa] mb-2">$1<\/blockquote>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1<\/a>')
    .replace(/\n\n+/g, '<\/p><p class="mb-2">');

  const parts = html.split('<\/p><p class="mb-2">');
  const limited = parts.slice(0, maxBlocks).join('<\/p><p class="mb-2">');
  return limited;
};

const renderPlainTextPreviewHtml = (content: string): string => {
  return content
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1<\/a>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1<\/strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1<\/em>')
    .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 mb-1"><input type="checkbox" class="note-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6;" onclick="this.checked=!this.checked"><span class="text-xs">$1</span></div>')
    .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 mb-1"><input type="checkbox" checked class="note-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6;" onclick="this.checked=!this.checked"><span class="text-xs">$1</span></div>')
    .split('\n')
    .slice(0, 6)
    .map((line) => (line ? line : '<br \/>'))
    .join('\n');
};

export const Notes = () => {
  const haptics = useHaptics();
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showViewModal, setShowViewModal] = createSignal(false);
  const [editingNote, setEditingNote] = createSignal<Note | null>(null);
  const [viewingNote, setViewingNote] = createSignal<Note | null>(null);
  const [copiedContent, setCopiedContent] = createSignal(false);
  const [expandedNotes, setExpandedNotes] = createSignal<Set<number>>(new Set());

  onMount(async () => {
    try {
      let notesData: any[] = [];

      // Check if we should use demo mode or real API
      if (isDemoMode() && !shouldUseRealBackend()) {
        console.log('[Notes] Loading demo notes data');
        // Load mock notes data for demo mode
        const mockNotesData = getMockNotes();
        notesData = mockNotesData;
      } else {
        console.log('[Notes] Loading notes from real API');
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
        const createdAt = note.created_at || note.createdAt || new Date().toISOString();
        const updatedAt = note.updated_at || note.updatedAt || createdAt;

        return {
          id: Number(note.id || index + 1),
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
          isMarkdown: content.includes('#') || content.includes('*'),
          isHtml: content.includes('<') && content.includes('>'),
        };
      });

      setNotes(adaptedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      // Fallback to demo data if API fails
      if (!isDemoMode()) {
        console.log('[Notes] API failed, falling back to demo data');
        const mockNotesData = getMockNotes();
        const adaptedNotes: Note[] = mockNotesData.map((note: any, index) => {
          const tags = Array.isArray(note.tags)
            ? note.tags.map((tag: any) => (typeof tag === 'string' ? tag : tag?.name)).filter(Boolean)
            : [];

          const content = note.content || '';
          const createdAt = note.created_at || note.createdAt || new Date().toISOString();
          const updatedAt = note.updated_at || note.updatedAt || createdAt;

          return {
            id: Number(note.id || index + 1),
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
            isMarkdown: content.includes('#') || content.includes('*'),
            isHtml: content.includes('<') && content.includes('>'),
          };
        });
        setNotes(adaptedNotes);
      } else {
        setNotes([]);
      }
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
        const note: Note = {
          id: Date.now(),
          title: noteData.title,
          content: noteData.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: noteData.tags,
          pinned: false
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
          id: newNote.id,
          title: newNote.title,
          content: newNote.content,
          createdAt: newNote.created_at || newNote.createdAt,
          updatedAt: newNote.updated_at || newNote.updatedAt,
          tags: Array.isArray(newNote.tags) ? newNote.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name) : [],
          pinned: Boolean(newNote.pinned ?? newNote.is_pinned),
          attachments: [],
          isMarkdown: newNote.content.includes('#') || newNote.content.includes('*'),
          isHtml: newNote.content.includes('<') && newNote.content.includes('>'),
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

  const toggleNoteExpansion = (noteId: number) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
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

  // Add this function to handle checkbox changes
  const updateNoteCheckbox = (noteId: number, checkboxIndex: number, isChecked: boolean) => {
    setNotes(prev => prev.map(note => {
      if (note.id === noteId) {
        const lines = note.content.split('\n');
        let checkboxCount = 0;
        
        const updatedLines = lines.map(line => {
          const uncheckedMatch = line.match(/^- \[ \] (.*)$/);
          const checkedMatch = line.match(/^- \[x\] (.*)$/);
          
          if (uncheckedMatch || checkedMatch) {
            if (checkboxCount === checkboxIndex) {
              const text = uncheckedMatch ? uncheckedMatch[1] : (checkedMatch ? checkedMatch[1] : '');
              return isChecked ? `- [x] ${text}` : `- [ ] ${text}`;
            }
            checkboxCount++;
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
  };

  // Handler for updating note content from ViewNoteModal
  const handleUpdateNoteContent = (noteId: number, content: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, content, updatedAt: new Date().toISOString() }
        : note
    ));
  };

  // Make the function available globally for checkbox onchange handlers
  createEffect(() => {
    (window as any).updateNoteContent = (checkbox: HTMLInputElement) => {
      const noteElement = checkbox.closest('[data-note-id]');
      if (noteElement) {
        const noteId = parseInt(noteElement.getAttribute('data-note-id') || '0');
        const checkboxElements = noteElement.querySelectorAll('input[type="checkbox"]');
        const checkboxIndex = Array.from(checkboxElements).indexOf(checkbox);
        updateNoteCheckbox(noteId, checkboxIndex, checkbox.checked);
      }
    };
  });

  return (
    <div class="fixed inset-0 bg-background flex flex-col">
      <style>
        {`
          .note-checkbox {
            width: 16px !important;
            height: 16px !important;
            cursor: pointer !important;
            accent-color: #3b82f6 !important;
            border: 2px solid #4b5563 !important;
            border-radius: 3px !important;
            transition: all 0.2s ease !important;
          }
          .note-checkbox:hover {
            border-color: #3b82f6 !important;
            transform: scale(1.1) !important;
          }
          .note-checkbox:checked {
            background-color: #3b82f6 !important;
            border-color: #3b82f6 !important;
          }
          .note-checkbox:focus {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
          }
        `}
      </style>
      
      {/* Header - Signal/Discord style */}
      <div class="bg-[#2c2c2e] border-b border-[#404040] px-4 py-3 flex-shrink-0">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-xl font-semibold text-white">Notes</h1>
            <p class="text-sm text-[#b9b9b9]">Your personal notes</p>
          </div>
          <Button 
            onClick={() => {
              setShowAddModal(true);
              haptics.impact();
            }}
            class="bg-[#5865f2] hover:bg-[#4752c4] text-white border-0"
          >
            Add Note
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div class="flex-1 flex overflow-hidden">
        {/* Sidebar - Discord style */}
        <div class="w-64 bg-[#202225] border-r border-[#404040] flex-shrink-0 overflow-y-auto">
          <div class="p-4">
            <h3 class="text-xs font-semibold text-[#8e9297] uppercase tracking-wide mb-3">Search & Filter</h3>
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
            
            <div class="mt-6">
              <h3 class="text-xs font-semibold text-[#8e9297] uppercase tracking-wide mb-3">Quick Stats</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-[#b9b9b9]">Total Notes</span>
                  <span class="text-sm font-medium text-white">{filteredNotes().length}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-[#b9b9b9]">Pinned</span>
                  <span class="text-sm font-medium text-white">{filteredNotes().filter(n => n.pinned).length}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-[#b9b9b9]">Tags</span>
                  <span class="text-sm font-medium text-white">{allTags().length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes List - Signal style chat */}
        <div class="flex-1 bg-[#36393f] overflow-y-auto">
          <div class="p-4 space-y-2">
            <Show when={copiedContent()}>
              <div class="bg-green-500/20 border border-green-500/50 text-green-400 px-3 py-2 rounded-lg text-sm mb-4">
                Content copied!
              </div>
            </Show>

            {isLoading() ? (
              <div class="space-y-3">
                {[...Array(3)].map(() => (
                  <div class="bg-[#2c2c2e] rounded-lg p-4 animate-pulse">
                    <div class="h-4 bg-[#404040] rounded mb-2"></div>
                    <div class="h-3 bg-[#404040] rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {filteredNotes().length > 0 ? (
                  filteredNotes().map((note) => (
                    <div 
                      data-note-id={note.id}
                      class={`bg-[#2c2c2e] hover:bg-[#35363c] rounded-lg p-4 cursor-pointer transition-all border border-transparent ${note.pinned ? 'border-l-4 border-l-[#5865f2]' : ''}`}
                      onClick={() => viewNote(note)}
                    >
                      <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2">
                          <h3 class="text-white font-medium">{note.title}</h3>
                          {note.pinned && <IconPin class="size-4 text-[#faa61a]" />}
                          {note.isMarkdown && <span class="text-xs px-2 py-1 bg-[#5865f2]/20 text-[#5865f2] rounded">MD</span>}
                          {note.isHtml && <span class="text-xs px-2 py-1 bg-[#5865f2]/20 text-[#5865f2] rounded">HTML</span>}
                        </div>
                        <div class="flex gap-1">
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyNoteContent(note);
                            }}
                            class="text-[#b9b9b9] hover:text-white p-1 h-6 w-6"
                          >
                            <IconCopy size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportNote(note);
                            }}
                            class="text-[#b9b9b9] hover:text-white p-1 h-6 w-6"
                          >
                            <IconDownload size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditNote(note);
                            }}
                            class="text-[#b9b9b9] hover:text-white p-1 h-6 w-6"
                          >
                            <IconEdit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(note.id);
                            }}
                            class="text-[#b9b9b9] hover:text-white p-1 h-6 w-6"
                            {...{title: note.pinned ? "Unpin note" : "Pin note"}}
                          >
                            <IconPin size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNote(note.id);
                            }}
                            class="text-[#ed4245] hover:text-[#ff6b6b] p-1 h-6 w-6"
                          >
                            <IconTrash size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Note Preview */}
                      <div class="text-[#dcddde] text-sm">
                        <div class="prose prose-invert max-w-none">
                          <Show 
                            when={expandedNotes().has(note.id)} 
                            fallback={
                              <div
                                class="overflow-hidden"
                                style={{
                                  display: '-webkit-box',
                                  '-webkit-line-clamp': '2',
                                  '-webkit-box-orient': 'vertical',
                                  'max-height': '3em',
                                  'line-height': '1.5em'
                                }}
                                innerHTML={
                                  note.isHtml
                                    ? note.content
                                    : note.isMarkdown
                                      ? renderMarkdownPreviewHtml(note.content)
                                      : renderPlainTextPreviewHtml(note.content)
                                }
                              />
                            }
                          >
                            <div
                              innerHTML={
                                note.isHtml
                                  ? note.content
                                  : note.isMarkdown
                                    ? note.content.replace(/^# (.*$)/gim, '<h1 class="text-base font-semibold mb-2">$1</h1>')
                                      .replace(/^## (.*$)/gim, '<h2 class="text-sm font-semibold mb-1">$1</h2>')
                                      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold mb-1">$1</h3>')
                                      .replace(/^#### (.*$)/gim, '<h4 class="text-xs font-semibold mb-1">$1</h4>')
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                                      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                      .replace(/`(.*?)`/g, '<code class="bg-[#404040] px-1 py-0.5 rounded text-xs">$1</code>')
                                      .replace(/```(.*?)\n([\s\S]*?)```/g, '<pre class="bg-[#404040] p-3 rounded mb-2 overflow-x-auto"><code class="text-xs">$2</code></pre>')
                                      .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 mb-1"><input type="checkbox" class="note-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #5865f2;" onclick="this.checked=!this.checked" onchange="updateNoteContent(this)"><span class="text-sm">$1</span></div>')
                                      .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 mb-1"><input type="checkbox" checked class="note-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #5865f2;" onclick="this.checked=!this.checked" onchange="updateNoteContent(this)"><span class="text-sm">$1</span></div>')
                                      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
                                      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
                                      .replace(/> (.*$)/gim, '<blockquote class="border-l-4 border-[#404040] pl-3 italic text-[#b9b9b9] mb-2">$1</blockquote>')
                                      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#5865f2] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
                                      .replace(/\n\n+/g, '</p><p class="mb-2">')
                                    : note.content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="text-[#5865f2] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                                      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                      .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 mb-1"><input type="checkbox" class="note-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #5865f2;" onclick="this.checked=!this.checked" onchange="updateNoteContent(this)"><span class="text-sm">$1</span></div>')
                                      .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 mb-1"><input type="checkbox" checked class="note-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #5865f2;" onclick="this.checked=!this.checked" onchange="updateNoteContent(this)"><span class="text-sm">$1</span></div>')
                                      .split('\n').map((line) => line ? `<p class="mb-2">${line}</p>` : '<br />').join('')
                              }
                            />
                          </Show>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Show more clicked for note:', note.title);
                            toggleNoteExpansion(note.id);
                          }}
                          class="mt-2 text-xs text-[#5865f2] hover:text-[#7289da] font-medium cursor-pointer transition-colors"
                        >
                          {expandedNotes().has(note.id) ? 'Show less ←' : 'Show more →'}
                        </button>
                      </div>
                      
                      {/* Tags */}
                      <div class="flex flex-wrap gap-1 mt-3">
                        <For each={note.tags}>
                          {(tag) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTag(tag);
                              }}
                              class="px-2 py-1 bg-[#404040] hover:bg-[#4a4b4e] text-[#b9b9b9] hover:text-white text-xs rounded-md transition-colors cursor-pointer"
                            >
                              {tag}
                            </button>
                          )}
                        </For>
                      </div>
                      
                      {/* Attachments */}
                      <Show when={note.attachments && note.attachments.length > 0}>
                        <div class="mt-3">
                          <div class="flex items-center gap-2 mb-2">
                            <IconPaperclip class="size-3 text-[#b9b9b9]" />
                            <span class="text-xs text-[#b9b9b9]">Attachments ({note.attachments?.length || 0})</span>
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <For each={note.attachments || []}>
                              {(attachment) => (
                                <div class="flex items-center gap-2 px-2 py-1 bg-[#404040] rounded-md text-xs">
                                  <span class="text-[#dcddde]">{attachment.name}</span>
                                  <span class="text-[#8e9297]">({attachment.size})</span>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                      
                      <div class="flex justify-between items-center mt-3 pt-3 border-t border-[#404040]">
                        <p class="text-xs text-[#8e9297]">
                          Updated: {note.updatedAt && !isNaN(new Date(note.updatedAt).getTime()) ? new Date(note.updatedAt).toLocaleDateString() : 'Invalid Date'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div class="bg-[#2c2c2e] rounded-lg p-8 text-center">
                    <div class="text-6xl mb-4">📝</div>
                    <p class="text-[#b9b9b9] text-lg font-medium mb-2">
                      {searchTerm() || selectedTags().length > 0 
                        ? 'No notes found matching your search or filters.' 
                        : 'No notes yet. Add your first note!'}
                    </p>
                    <p class="text-[#8e9297] text-sm">
                      {searchTerm() || selectedTags().length > 0 
                        ? 'Try adjusting your search terms or filters.'
                        : 'Click the "Add Note" button to get started.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
