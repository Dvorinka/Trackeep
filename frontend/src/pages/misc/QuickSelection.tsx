import { createSignal, onMount } from 'solid-js';
import { IconUpload, IconFileText, IconFolder, IconVideo, IconBookmark, IconChecklist, IconNotebook, IconPlus, IconSearch } from '@tabler/icons-solidjs';

interface QuickItem {
  id: string;
  name: string;
  type: 'file' | 'bookmark' | 'task' | 'note' | 'video';
  description: string;
  icon: any;
  action: string;
}

export const QuickSelection = () => {
  const [quickItems, setQuickItems] = createSignal<QuickItem[]>([]);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('all');

  onMount(() => {
    setQuickItems([
      {
        id: '1',
        name: 'Upload Document',
        type: 'file',
        description: 'Upload a new document to your workspace',
        icon: IconUpload,
        action: 'upload'
      },
      {
        id: '2',
        name: 'Create Bookmark',
        type: 'bookmark',
        description: 'Save a new bookmark',
        icon: IconBookmark,
        action: 'create'
      },
      {
        id: '3',
        name: 'Add Task',
        type: 'task',
        description: 'Create a new task',
        icon: IconChecklist,
        action: 'create'
      },
      {
        id: '4',
        name: 'Write Note',
        type: 'note',
        description: 'Create a new note',
        icon: IconNotebook,
        action: 'create'
      },
      {
        id: '5',
        name: 'Import YouTube',
        type: 'video',
        description: 'Import a YouTube video',
        icon: IconVideo,
        action: 'import'
      },
      {
        id: '6',
        name: 'Browse Files',
        type: 'file',
        description: 'Browse existing files',
        icon: IconFolder,
        action: 'browse'
      },
      {
        id: '7',
        name: 'Quick Upload',
        type: 'file',
        description: 'Quick upload with drag & drop',
        icon: IconUpload,
        action: 'quick-upload'
      },
      {
        id: '8',
        name: 'Recent Files',
        type: 'file',
        description: 'View recently uploaded files',
        icon: IconFileText,
        action: 'recent'
      }
    ]);
  });

  const filteredItems = () => {
    return quickItems().filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm().toLowerCase());
      const matchesCategory = selectedCategory() === 'all' || item.type === selectedCategory();
      return matchesSearch && matchesCategory;
    });
  };

  const handleAction = (action: string) => {
    console.log(`Action: ${action}`);
    // Handle different actions based on the type
    switch (action) {
      case 'upload':
        // Trigger file upload
        break;
      case 'create':
        // Create new item
        break;
      case 'import':
        // Import from external source
        break;
      case 'browse':
        // Navigate to files
        break;
      case 'quick-upload':
        // Quick upload modal
        break;
      case 'recent':
        // Show recent files
        break;
      default:
        break;
    }
  };

  const categories = [
    { value: 'all', label: 'All Items' },
    { value: 'file', label: 'Files' },
    { value: 'bookmark', label: 'Bookmarks' },
    { value: 'task', label: 'Tasks' },
    { value: 'note', label: 'Notes' },
    { value: 'video', label: 'Videos' }
  ];

  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto">
      <h1 class="text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
        <IconUpload class="size-8" />
        Quick Selection
      </h1>

      {/* Search and Filter */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="relative">
          <IconSearch class="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search actions..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            class="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
          />
        </div>
        <select
          value={selectedCategory()}
          onChange={(e) => setSelectedCategory(e.target.value)}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
        >
          {categories.map(cat => (
            <option value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Quick Actions Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filteredItems().map((item) => {
          const Icon = item.icon;
          return (
            <div
              class="border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => handleAction(item.action)}
            >
              <div class="flex items-center gap-3 mb-3">
                <div class="p-2 rounded-lg bg-muted">
                  <Icon class="size-6 text-primary" />
                </div>
                <div>
                  <h3 class="font-medium text-foreground">{item.name}</h3>
                  <span class="text-xs text-muted-foreground capitalize">{item.type}</span>
                </div>
              </div>
              <p class="text-sm text-muted-foreground mb-4">{item.description}</p>
              <button
                type="button"
                class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-1.5 px-3"
              >
                <IconPlus class="size-4" />
                {item.action === 'upload' ? 'Upload' : 
                 item.action === 'create' ? 'Create' :
                 item.action === 'import' ? 'Import' :
                 item.action === 'browse' ? 'Browse' :
                 item.action === 'quick-upload' ? 'Quick Upload' :
                 item.action === 'recent' ? 'View Recent' : 'Action'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom Upload Section */}
      <div class="border rounded-lg p-6">
        <h2 class="text-xl font-semibold text-foreground mb-4">Custom Upload</h2>
        <div class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <IconUpload class="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 class="text-lg font-medium text-foreground mb-2">Drag & Drop Files</h3>
          <p class="text-muted-foreground mb-4">
            Or click to select files from your computer
          </p>
          <button
            type="button"
            class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
          >
            <IconUpload class="size-4" />
            Select Files
          </button>
        </div>
        
        <div class="mt-4">
          <h4 class="font-medium text-foreground mb-2">Supported Formats:</h4>
          <div class="flex flex-wrap gap-2">
            {['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'TXT', 'MD', 'JPG', 'PNG', 'GIF'].map(format => (
              <span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div class="border rounded-lg p-6 mt-6">
        <h2 class="text-xl font-semibold text-foreground mb-4">Recent Quick Actions</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div class="flex items-center gap-3">
              <IconFileText class="size-5 text-primary" />
              <div>
                <p class="font-medium text-foreground">Document uploaded</p>
                <p class="text-sm text-muted-foreground">presentation.pptx</p>
              </div>
            </div>
            <span class="text-sm text-muted-foreground">2 minutes ago</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div class="flex items-center gap-3">
              <IconBookmark class="size-5 text-primary" />
              <div>
                <p class="font-medium text-foreground">Bookmark created</p>
                <p class="text-sm text-muted-foreground">SolidJS Documentation</p>
              </div>
            </div>
            <span class="text-sm text-muted-foreground">15 minutes ago</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div class="flex items-center gap-3">
              <IconNotebook class="size-5 text-primary" />
              <div>
                <p class="font-medium text-foreground">Note created</p>
                <p class="text-sm text-muted-foreground">Project Notes</p>
              </div>
            </div>
            <span class="text-sm text-muted-foreground">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};
