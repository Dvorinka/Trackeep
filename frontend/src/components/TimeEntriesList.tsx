import { createSignal, onMount, createEffect, For } from 'solid-js';
import { 
  IconClock, 
  IconCalendar, 
  IconCurrencyDollar, 
  IconTrash, 
  IconSquare 
} from '@tabler/icons-solidjs';
import { timeEntriesApi, demoTimeEntriesApi, type TimeEntry } from '../lib/api';
import { isDemoMode } from '../lib/demo-mode';

interface TimeEntriesListProps {
  class?: string;
  refreshTrigger?: number;
}

export const TimeEntriesList = (props: TimeEntriesListProps) => {
  const [timeEntries, setTimeEntries] = createSignal<TimeEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Use appropriate API based on demo mode
  const getApi = () => isDemoMode() ? demoTimeEntriesApi : timeEntriesApi;

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getApi().getAll();
      
      // Handle different response formats
      let entries: TimeEntry[] = [];
      if (response && response.time_entries) {
        entries = response.time_entries;
      } else if (response && Array.isArray(response)) {
        entries = response;
      } else {
        console.warn('Unexpected response format:', response);
        entries = [];
      }
      
      setTimeEntries(entries);
    } catch (err) {
      console.error('Failed to load time entries:', err);
      setError('Failed to load time entries');
      setTimeEntries([]); // Ensure empty array on error
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadTimeEntries();
  });

  // Refresh when refreshTrigger changes
  createEffect(() => {
    if (props.refreshTrigger !== undefined) {
      loadTimeEntries();
    }
  });

  const stopTimeEntry = async (id: number) => {
    try {
      await getApi().stop(id);
      loadTimeEntries();
    } catch (err) {
      console.error('Failed to stop time entry:', err);
      setError('Failed to stop time entry');
    }
  };

  const deleteTimeEntry = async (id: number) => {
    try {
      await getApi().delete(id);
      loadTimeEntries();
    } catch (err) {
      console.error('Failed to delete time entry:', err);
      setError('Failed to delete time entry');
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div class={`border rounded-lg p-6 bg-card ${props.class || ''}`}>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-foreground">Time Entries</h2>
        <button
          onClick={loadTimeEntries}
          class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Refresh
        </button>
      </div>

      {loading() && (
        <div class="text-center py-8">
          <div class="text-muted-foreground">Loading time entries...</div>
        </div>
      )}

      {error() && (
        <div class="text-center py-8">
          <div class="text-destructive">{error()}</div>
        </div>
      )}

      {!loading() && !error() && (timeEntries() || []).length === 0 && (
        <div class="text-center py-8">
          <IconClock class="size-12 mx-auto text-muted-foreground mb-4" />
          <div class="text-muted-foreground">No time entries yet</div>
          <div class="text-sm text-muted-foreground mt-2">
            Start tracking your time to see entries here
          </div>
        </div>
      )}

      {!loading() && !error() && (timeEntries() || []).length > 0 && (
        <div class="space-y-3">
          <For each={timeEntries() || []}>
            {(entry) => (
              <div class="border border-border/50 rounded-lg p-4 hover:bg-accent/30 transition-all duration-200 hover:shadow-sm">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <h3 class="font-semibold text-foreground text-base">
                        {entry.description}
                      </h3>
                      {entry.is_running && (
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                          <span class="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                          Running
                        </span>
                      )}
                      {entry.billable && (
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          <IconCurrencyDollar class="size-3 mr-1" />
                          Billable
                        </span>
                      )}
                    </div>

                    <div class="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                      <div class="flex items-center gap-1.5">
                        <IconCalendar class="size-4 opacity-70" />
                        <span>{formatDate(entry.start_time)}</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <IconClock class="size-4 opacity-70" />
                        <span class="font-medium">{entry.duration ? formatDuration(entry.duration) : 'In progress'}</span>
                      </div>
                      {entry.hourly_rate && entry.billable && entry.duration && (
                        <div class="flex items-center gap-1.5">
                          <IconCurrencyDollar class="size-4 opacity-70" />
                          <span class="font-semibold text-green-600 dark:text-green-400">
                            ${(entry.duration / 3600 * entry.hourly_rate).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div class="flex flex-wrap gap-2 mb-3 text-muted-foreground">
                        <For each={entry.tags}>
                          {(tag) => (
                            <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted text-xs">
                              <span class="size-1.5 rounded-full bg-primary"></span>
                              <span class="font-medium text-foreground">{tag}</span>
                            </span>
                          )}
                        </For>
                      </div>
                    )}

                    {/* Associated Items */}
                    {(entry.task || entry.bookmark || entry.note) && (
                      <div class="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border border-border/50">
                        <span class="font-medium mb-1 block">Linked items:</span>
                        <div class="space-y-1">
                          {entry.task && <div class="flex items-center gap-1"><span class="w-1 h-1 bg-muted-foreground rounded-full"></span>Task: {entry.task.title}</div>}
                          {entry.bookmark && <div class="flex items-center gap-1"><span class="w-1 h-1 bg-muted-foreground rounded-full"></span>Bookmark: {entry.bookmark.title}</div>}
                          {entry.note && <div class="flex items-center gap-1"><span class="w-1 h-1 bg-muted-foreground rounded-full"></span>Note: {entry.note.title}</div>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div class="flex items-center gap-1 ml-4">
                    {entry.is_running && (
                      <button
                        onClick={() => stopTimeEntry(entry.id)}
                        class="p-2 rounded-md text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Stop timer"
                      >
                        <IconSquare class="size-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteTimeEntry(entry.id)}
                      class="p-2 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete entry"
                    >
                      <IconTrash class="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      )}
    </div>
  );
};
