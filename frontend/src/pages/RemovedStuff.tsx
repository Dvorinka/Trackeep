import { createEffect, createSignal, onMount, Show } from 'solid-js';
import { IconTrash, IconRestore, IconFileText, IconFileTypePpt, IconFileTypeDocx, IconClock, IconSettings, IconAlertTriangle } from '@tabler/icons-solidjs';

interface RemovedItem {
  id: string;
  name: string;
  type: string;
  removedAt: string;
  removedBy: string;
  size?: string;
  path?: string;
  daysInTrash?: number;
}

interface AutoRemoveSettings {
  enabled: boolean;
  afterDays: number;
  autoEmpty: boolean;
}

export const RemovedStuff = () => {
  const [removedItems, setRemovedItems] = createSignal<RemovedItem[]>([]);
  const [autoRemoveSettings, setAutoRemoveSettings] = createSignal<AutoRemoveSettings>({
    enabled: false,
    afterDays: 30,
    autoEmpty: false
  });
  const [showSettings, setShowSettings] = createSignal(false);
  const [selectedItems, setSelectedItems] = createSignal<string[]>([]);

  createEffect(() => {
    localStorage.setItem('removedItems', JSON.stringify(removedItems()));
  });

  onMount(() => {
    // Load auto-remove settings from localStorage
    const savedSettings = localStorage.getItem('autoRemoveSettings');
    if (savedSettings) {
      setAutoRemoveSettings(JSON.parse(savedSettings));
    }

    const savedItems = localStorage.getItem('removedItems');
    if (savedItems) {
      try {
        const parsedItems = JSON.parse(savedItems);
        setRemovedItems(Array.isArray(parsedItems) ? parsedItems : []);
      } catch {
        setRemovedItems([]);
      }
    }

    // Check for auto-remove on mount
    checkAutoRemove();
  });

  const checkAutoRemove = () => {
    const settings = autoRemoveSettings();
    if (!settings.enabled) return;

    const itemsToRemove = removedItems().filter(item => 
      (item.daysInTrash || 0) >= settings.afterDays
    );

    if (itemsToRemove.length > 0) {
      if (settings.autoEmpty) {
        // Auto-empty trash
        setRemovedItems([]);
        console.log(`Auto-removed ${itemsToRemove.length} items from trash`);
      } else {
        // Show notification for manual review
        console.log(`${itemsToRemove.length} items are ready for auto-remove`);
      }
    }
  };

  const saveAutoRemoveSettings = (settings: AutoRemoveSettings) => {
    setAutoRemoveSettings(settings);
    localStorage.setItem('autoRemoveSettings', JSON.stringify(settings));
    checkAutoRemove();
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'docx':
        return IconFileTypeDocx;
      case 'pptx':
        return IconFileTypePpt;
      case 'zip':
        return IconFileText;
      case 'folder':
        return IconFileText;
      default:
        return IconFileText;
    }
  };

  const handleEmptyTrash = () => {
    if (confirm('Are you sure you want to permanently delete all items in the trash? This action cannot be undone.')) {
      setRemovedItems([]);
      alert('Trash emptied successfully!');
    }
  };

  const handleRestoreItem = (id: string) => {
    const item = removedItems().find(item => item.id === id);
    if (item) {
      setRemovedItems(prev => prev.filter(item => item.id !== id));
      alert(`"${item.name}" has been restored successfully!`);
    }
  };

  const handlePermanentlyDelete = (id: string) => {
    const item = removedItems().find(item => item.id === id);
    if (item && confirm(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`)) {
      setRemovedItems(prev => prev.filter(item => item.id !== id));
      alert(`"${item.name}" has been permanently deleted!`);
    }
  };

  const handleBulkRestore = () => {
    if (selectedItems().length === 0) return;
    
    if (confirm(`Are you sure you want to restore ${selectedItems().length} items?`)) {
      const itemsToRestore = removedItems().filter(item => selectedItems().includes(item.id));
      setRemovedItems(prev => prev.filter(item => !selectedItems().includes(item.id)));
      setSelectedItems([]);
      alert(`${itemsToRestore.length} items have been restored successfully!`);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems().length === 0) return;
    
    if (confirm(`Are you sure you want to permanently delete ${selectedItems().length} items? This action cannot be undone.`)) {
      const itemsToDelete = removedItems().filter(item => selectedItems().includes(item.id));
      setRemovedItems(prev => prev.filter(item => !selectedItems().includes(item.id)));
      setSelectedItems([]);
      alert(`${itemsToDelete.length} items have been permanently deleted!`);
    }
  };

  const getItemsReadyForAutoRemove = () => {
    const settings = autoRemoveSettings();
    if (!settings.enabled) return [];
    
    return removedItems().filter(item => 
      (item.daysInTrash || 0) >= settings.afterDays
    );
  };

  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Removed Stuff</h1>
          <p class="text-muted-foreground mt-1">
            {removedItems().length} items in trash
            {autoRemoveSettings().enabled && ` • Auto-remove enabled (${autoRemoveSettings().afterDays} days)`}
          </p>
        </div>
        <div class="flex gap-2">
          <button 
            type="button" 
            onClick={() => setShowSettings(!showSettings())}
            class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 h-auto items-center gap-2 py-2 px-4"
          >
            <IconSettings class="size-4" />
            Auto-Remove
          </button>
          <button 
            type="button" 
            onClick={handleEmptyTrash} 
            class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-auto items-center gap-2 py-2 px-4"
          >
            <IconTrash class="size-4" />
            Empty Trash
          </button>
        </div>
      </div>

      {/* Auto-Remove Settings */}
      <Show when={showSettings()}>
        <div class="border rounded-lg p-4 mb-6 bg-muted/30">
          <h3 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
            <IconClock class="size-5" />
            Auto-Remove Settings
          </h3>
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-remove-enabled"
                checked={autoRemoveSettings().enabled}
                onChange={(e) => saveAutoRemoveSettings({
                  ...autoRemoveSettings(),
                  enabled: e.currentTarget.checked
                })}
                class="rounded border-input"
              />
              <label for="auto-remove-enabled" class="text-sm font-medium text-foreground">
                Enable automatic removal
              </label>
            </div>
            
            <Show when={autoRemoveSettings().enabled}>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-muted-foreground mb-1">
                    Remove items after (days):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={autoRemoveSettings().afterDays}
                    onChange={(e) => saveAutoRemoveSettings({
                      ...autoRemoveSettings(),
                      afterDays: parseInt(e.currentTarget.value) || 30
                    })}
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                  />
                </div>
                
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-empty"
                    checked={autoRemoveSettings().autoEmpty}
                    onChange={(e) => saveAutoRemoveSettings({
                      ...autoRemoveSettings(),
                      autoEmpty: e.currentTarget.checked
                    })}
                    class="rounded border-input"
                  />
                  <label for="auto-empty" class="text-sm font-medium text-foreground">
                    Auto-empty trash when items expire
                  </label>
                </div>
              </div>
            </Show>
          </div>
          
          {/* Items ready for auto-remove */}
          <Show when={autoRemoveSettings().enabled && getItemsReadyForAutoRemove().length > 0}>
            <div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div class="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <IconAlertTriangle class="size-4" />
                <span class="text-sm font-medium">
                  {getItemsReadyForAutoRemove().length} items are ready for automatic removal
                </span>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Bulk Actions */}
      <Show when={selectedItems().length > 0}>
        <div class="border rounded-lg p-3 mb-4 bg-primary/5">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">
              {selectedItems().length} items selected
            </span>
            <div class="flex gap-2">
              <button 
                onClick={handleBulkRestore}
                class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-1.5 px-3"
              >
                <IconRestore class="size-4" />
                Restore Selected
              </button>
              <button 
                onClick={handleBulkDelete}
                class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-auto items-center gap-2 py-1.5 px-3"
              >
                <IconTrash class="size-4" />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Enhanced Table */}
      <div class="w-full overflow-auto">
        <table class="w-full caption-bottom text-sm">
          <thead class="[&_tr]:border-b">
            <tr class="border-b transition-colors data-[state=selected]:bg-muted">
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selectedItems().length === removedItems().length && removedItems().length > 0}
                  onChange={() => {
                    if (selectedItems().length === removedItems().length) {
                      setSelectedItems([]);
                    } else {
                      setSelectedItems(removedItems().map(item => item.id));
                    }
                  }}
                  class="rounded border-input"
                />
              </th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Item</th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Type</th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Size</th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Removed By</th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Removed At</th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="[&_tr:last-child]:border-0">
            {removedItems().map((item) => {
              const FileIcon = getFileIcon(item.type);
              return (
                <tr class="border-b transition-colors data-[state=selected]:bg-muted">
                  <td class="p-2 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedItems().includes(item.id)}
                      onChange={() => {
                        if (selectedItems().includes(item.id)) {
                          setSelectedItems(prev => prev.filter(id => id !== item.id));
                        } else {
                          setSelectedItems(prev => [...prev, item.id]);
                        }
                      }}
                      class="rounded border-input"
                    />
                  </td>
                  <td class="p-2 align-middle">
                    <div class="flex items-center gap-3">
                      <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                        <FileIcon class="size-6 text-destructive" />
                      </div>
                      <div>
                        <div class="font-medium">{item.name}</div>
                        <div class="text-xs text-muted-foreground">{item.path}</div>
                      </div>
                    </div>
                  </td>
                  <td class="p-2 align-middle">
                    <span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      {item.type}
                    </span>
                  </td>
                  <td class="p-2 align-middle text-muted-foreground">
                    {item.size}
                  </td>
                  <td class="p-2 align-middle text-muted-foreground">
                    {item.removedBy}
                  </td>
                  <td class="p-2 align-middle text-muted-foreground">
                    {item.removedAt}
                  </td>
                  <td class="p-2 align-middle">
                    <div class="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => handleRestoreItem(item.id)} class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-1.5 px-3">
                        <IconRestore class="size-4" />
                        Restore
                      </button>
                      <button type="button" onClick={() => handlePermanentlyDelete(item.id)} class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-auto items-center gap-2 py-1.5 px-3">
                        <IconTrash class="size-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
