import { createSignal, createEffect, onCleanup, onMount, Show } from 'solid-js';
import { 
  IconPlayerPlay, 
  IconPlayerPause, 
  IconSquare, 
  IconClock, 
  IconCurrencyDollar, 
  IconLink
} from '@tabler/icons-solidjs';
import { 
  timeEntriesApi, 
  demoTimeEntriesApi, 
  bookmarksApi, 
  tasksApi, 
  notesApi, 
  type TimeEntry 
} from '../lib/api';
import { TagPicker } from '@/components/ui/TagPicker';

interface TimerProps {
  onTimeEntryCreated?: (timeEntry: TimeEntry) => void;
  onTimerUpdate?: (entry: TimeEntry | null, elapsedSeconds: number) => void;
  className?: string;
}

export const Timer = (props: TimerProps) => {
  const [isRunning, setIsRunning] = createSignal(false);
  const [startTime, setStartTime] = createSignal<Date | null>(null);
  const [elapsedTime, setElapsedTime] = createSignal(0);
  const [description, setDescription] = createSignal('');
  const [selectedTaskId, setSelectedTaskId] = createSignal<number | undefined>();
  const [selectedBookmarkId, setSelectedBookmarkId] = createSignal<number | undefined>();
  const [selectedNoteId, setSelectedNoteId] = createSignal<number | undefined>();
  const [tags, setTags] = createSignal<string[]>([]);
  const [billable, setBillable] = createSignal(false);
  const [hourlyRate, setHourlyRate] = createSignal('');
  const [currentTimeEntry, setCurrentTimeEntry] = createSignal<TimeEntry | null>(null);
  const [showSettings, setShowSettings] = createSignal(false);
  const [availableTags, setAvailableTags] = createSignal<string[]>([]);

  // Check if we're in demo mode
  const isDemoMode = () => {
    return localStorage.getItem('demoMode') === 'true' || 
           document.title.includes('Demo Mode') ||
           window.location.search.includes('demo=true');
  };

  // Use appropriate API based on demo mode
  const getApi = () => isDemoMode() ? demoTimeEntriesApi : timeEntriesApi;

  let intervalRef: number | null = null;

  // Update elapsed time every second when running
  createEffect(() => {
    if (isRunning() && startTime()) {
      intervalRef = setInterval(() => {
        const start = startTime();
        if (start) {
          const elapsed = Math.floor((new Date().getTime() - start.getTime()) / 1000);
          setElapsedTime(elapsed);
          // Send real-time updates to parent
          props.onTimerUpdate?.(currentTimeEntry(), elapsed);
        }
      }, 1000);
    } else {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
      // Send update when timer stops
      props.onTimerUpdate?.(null, 0);
    }

    onCleanup(() => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
    });
  });

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load available tags from bookmarks, tasks, and notes
  onMount(async () => {
    try {
      const [bookmarksResponse, tasksResponse, notesResponse] = await Promise.all([
        bookmarksApi.getAll(),
        tasksApi.getAll(),
        notesApi.getAll()
      ]);

      const tagSet = new Set<string>();

      const collectTags = (items: any[]) => {
        items.forEach((item) => {
          const rawTags = item?.tags || [];
          (rawTags as any[]).forEach((tag) => {
            if (!tag) return;
            if (typeof tag === 'string') {
              tagSet.add(tag);
            } else if (typeof tag.name === 'string') {
              tagSet.add(tag.name);
            }
          });
        });
      };

      collectTags(bookmarksResponse as any[]);
      collectTags(tasksResponse as any[]);
      collectTags(notesResponse as any[]);

      setAvailableTags(Array.from(tagSet).sort());
    } catch (error) {
      console.error('Failed to load available tags for timer:', error);
    }
  });

  const allAvailableTags = () => {
    const set = new Set<string>(availableTags());
    tags().forEach((tag) => set.add(tag));
    return Array.from(set).sort();
  };

  // Start timer
  const startTimer = async () => {
    try {
      // Allow starting timer without description - use default if empty
      const finalDescription = description().trim() || 'Untitled';
      
      const response = await getApi().create({
        description: finalDescription,
        task_id: selectedTaskId(),
        bookmark_id: selectedBookmarkId(),
        note_id: selectedNoteId(),
        tags: tags(),
        billable: billable(),
        hourly_rate: hourlyRate() ? parseFloat(hourlyRate()) : undefined,
        source: 'manual'
      });

      const newTimeEntry = response.time_entry;
      
      setIsRunning(true);
      setStartTime(new Date());
      setElapsedTime(0);
      setCurrentTimeEntry(newTimeEntry);

      props.onTimeEntryCreated?.(newTimeEntry);
    } catch (error) {
      console.error('Failed to start timer:', error);
      // Remove browser alert - just log the error
    }
  };

  // Pause timer (local UI-only pause, backend entry keeps running until stopped)
  const pauseTimer = () => {
    const start = startTime();
    if (!start) return;

    const now = new Date();
    const totalElapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
    setElapsedTime(totalElapsed);
    setIsRunning(false);
  };

  // Resume timer from paused state
  const resumeTimer = () => {
    const currentElapsed = elapsedTime();
    const now = new Date();
    const resumeStart = new Date(now.getTime() - currentElapsed * 1000);
    setStartTime(resumeStart);
    setIsRunning(true);
  };

  // Stop timer
  const stopTimer = async () => {
    const entry = currentTimeEntry();
    if (!entry) return;

    try {
      await getApi().stop(entry.id);
      
      setIsRunning(false);
      setStartTime(null);
      setCurrentTimeEntry(null);
    } catch (error) {
      console.error('Failed to stop timer:', error);
      // Remove browser alert - just log the error
    }
  };

  // Discard timer
  const discardTimer = async () => {
    const entry = currentTimeEntry();
    if (!entry) return;

    try {
      await getApi().delete(entry.id);
      
      setIsRunning(false);
      setStartTime(null);
      setElapsedTime(0);
      setCurrentTimeEntry(null);
    } catch (error) {
      console.error('Failed to discard timer:', error);
      // Remove browser alert - just log the error
    }
  };

  // Calculate current billable amount for running timer
  const getCurrentBillableAmount = (): number => {
    if (!billable() || !hourlyRate() || !isRunning()) {
      return 0;
    }
    const rate = parseFloat(hourlyRate());
    if (isNaN(rate) || rate <= 0) {
      return 0;
    }
    return (elapsedTime() / 3600) * rate;
  };

  const formatAmount = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const hasActiveEntry = () => currentTimeEntry() !== null;

  return (
    <div class={`border rounded-lg p-6 bg-card ${props.className || ''}`}>
      <div class="space-y-4">
        {/* Timer Display */}
        <div class="text-center">
          <div class="text-4xl font-mono font-bold text-foreground mb-2" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
            {formatTime(elapsedTime())}
          </div>
          <div class="text-sm text-muted-foreground mb-2">
            {hasActiveEntry() ? (isRunning() ? 'Running' : 'Paused') : 'Stopped'}
          </div>
          
          {/* Real-time Billable Amount Display */}
          {hasActiveEntry() && billable() && hourlyRate() && (
            <div class="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div class="flex items-center justify-center gap-2 text-green-800 dark:text-green-200">
                <IconCurrencyDollar class="size-4" />
                <span class="text-sm font-medium">
                  Current earnings: <strong>{formatAmount(getCurrentBillableAmount())}</strong>
                </span>
              </div>
              <div class="text-xs text-green-600 dark:text-green-400 mt-1">
                {hourlyRate()} USD/hour
              </div>
            </div>
          )}
        </div>

        {/* Description Input */}
        <div>
          <input
            type="text"
            placeholder="What are you working on? (optional)"
            value={description()}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isRunning()}
            class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground disabled:opacity-50"
          />
          <p class="text-xs text-muted-foreground mt-1">
            You can start the timer without entering a description
          </p>
        </div>

        {/* Tags */}
        <div>
          <div class="space-y-2">
            <TagPicker
              availableTags={allAvailableTags()}
              selectedTags={tags()}
              onTagsChange={(next) => {
                if (!hasActiveEntry()) {
                  setTags(next);
                }
              }}
              placeholder="Add tags..."
              allowNew={true}
            />
            <Show when={hasActiveEntry()}>
              <p class="text-xs text-muted-foreground">
                Tags can be adjusted before starting the timer. Stop and edit the time entry if you need to change them later.
              </p>
            </Show>
          </div>
        </div>

        {/* Control Buttons */}
        <div class="flex gap-2">
          {!hasActiveEntry() ? (
            <button
              onClick={startTimer}
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <IconPlayerPlay class="size-4" />
              Start
            </button>
          ) : (
            <>
              <button
                onClick={isRunning() ? pauseTimer : resumeTimer}
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {isRunning() ? (
                  <>
                    <IconPlayerPause class="size-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <IconPlayerPlay class="size-4" />
                    Resume
                  </>
                )}
              </button>
              <button
                onClick={stopTimer}
                class="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              >
                <IconSquare class="size-4" />
                Stop
              </button>
              <button
                onClick={discardTimer}
                class="flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                <IconSquare class="size-4" />
                Discard
              </button>
            </>
          )}
        </div>

        {/* Billable Settings - Always Visible but Optional */}
        <div class="border-t border-border pt-4">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={billable()}
                onChange={(e) => setBillable(e.target.checked)}
                disabled={isRunning()}
                class="rounded border-border accent-primary"
              />
              <span class="text-sm text-foreground">Mark as billable</span>
            </label>
            {billable() && (
              <div class="flex items-center gap-2">
                <IconCurrencyDollar class="size-4 text-muted-foreground" />
                <input
                  type="number"
                  placeholder="Hourly rate ($)"
                  value={hourlyRate()}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  disabled={isRunning()}
                  class="w-28 px-3 py-1 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground disabled:opacity-50 text-sm"
                  min="0"
                  step="0.01"
                />
                <span class="text-xs text-muted-foreground">USD/hour</span>
              </div>
            )}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Optional: Mark time entries as billable for client invoicing
          </p>
        </div>

        {/* Settings Toggle for Advanced Options */}
        <div class="flex justify-center">
          <button
            onClick={() => setShowSettings(!showSettings())}
            class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconClock class="size-4" />
            {showSettings() ? 'Hide' : 'Show'} Advanced Options
          </button>
        </div>

        {/* Advanced Settings */}
        {showSettings() && (
          <div class="border-t border-border pt-4 space-y-4">
            {/* Associated Items */}
            <div class="text-sm">
              <div class="flex items-center gap-2 mb-3">
                <IconLink class="size-4 text-primary" />
                <span class="text-foreground font-medium">Link to existing items</span>
              </div>
              <p class="text-xs text-muted-foreground mb-3">
                Optional: Connect this time entry to tasks, bookmarks, or notes for better organization
              </p>
              <div class="grid grid-cols-1 gap-3">
                <div>
                  <label class="block text-foreground mb-1 text-xs font-medium">Related Task</label>
                  <select
                    value={selectedTaskId() || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedTaskId(value ? parseInt(value) : undefined);
                    }}
                    disabled={isRunning()}
                    class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground disabled:opacity-50 text-sm"
                  >
                    <option value="">No task selected</option>
                    <option value="1">Complete project documentation</option>
                    <option value="2">Review pull requests</option>
                    <option value="3">Setup CI/CD pipeline</option>
                  </select>
                </div>
                <div>
                  <label class="block text-foreground mb-1 text-xs font-medium">Related Bookmark</label>
                  <select
                    value={selectedBookmarkId() || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedBookmarkId(value ? parseInt(value) : undefined);
                    }}
                    disabled={isRunning()}
                    class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground disabled:opacity-50 text-sm"
                  >
                    <option value="">No bookmark selected</option>
                    <option value="1">SolidJS Documentation</option>
                    <option value="2">TypeScript Handbook</option>
                    <option value="3">Go Programming Language</option>
                  </select>
                </div>
                <div>
                  <label class="block text-foreground mb-1 text-xs font-medium">Related Note</label>
                  <select
                    value={selectedNoteId() || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedNoteId(value ? parseInt(value) : undefined);
                    }}
                    disabled={isRunning()}
                    class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground disabled:opacity-50 text-sm"
                  >
                    <option value="">No note selected</option>
                    <option value="1">Meeting notes - Q4 Planning</option>
                    <option value="2">Project brainstorming</option>
                    <option value="3">API documentation notes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
