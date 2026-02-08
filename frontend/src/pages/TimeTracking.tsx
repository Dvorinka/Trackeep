import { createSignal, createEffect, onMount } from 'solid-js';
import { Timer } from '@/components/Timer';
import { TimeEntriesList } from '@/components/TimeEntriesList';
import { type TimeEntry, timeEntriesApi, demoTimeEntriesApi } from '@/lib/api';
import { IconClock, IconActivity, IconCurrencyDollar } from '@tabler/icons-solidjs';
import { isDemoMode } from '@/lib/demo-mode';

export const TimeTracking = () => {
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);
  const [timeEntries, setTimeEntries] = createSignal<TimeEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [currentRunningEntry, setCurrentRunningEntry] = createSignal<TimeEntry | null>(null);
  const [currentElapsedSeconds, setCurrentElapsedSeconds] = createSignal(0);

  // Use appropriate API based on demo mode
  const getApi = () => isDemoMode() ? demoTimeEntriesApi : timeEntriesApi;

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
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
      setTimeEntries([]); // Ensure empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Calculate today's statistics including real-time running timer
  const getTodayStats = () => {
    const entries = timeEntries() || [];
    const today = new Date().toDateString();
    const todayEntries = entries.filter(entry => 
      new Date(entry.start_time).toDateString() === today
    );

    // Start with completed entries
    let totalSeconds = todayEntries.reduce((sum, entry) => 
      sum + (entry.duration || 0), 0
    );
    
    let billableSeconds = todayEntries.reduce((sum, entry) => 
      sum + (entry.duration || 0), 0
    );
    
    let totalBillableAmount = todayEntries.reduce((sum, entry) => {
      if (entry.duration && entry.hourly_rate && entry.billable) {
        return sum + (entry.duration / 3600 * entry.hourly_rate);
      }
      return sum;
    }, 0);

    // Add real-time data from currently running timer
    const runningEntry = currentRunningEntry();
    if (runningEntry && new Date(runningEntry.start_time).toDateString() === today) {
      const elapsed = currentElapsedSeconds();
      totalSeconds += elapsed;
      
      if (runningEntry.billable) {
        billableSeconds += elapsed;
        if (runningEntry.hourly_rate) {
          totalBillableAmount += (elapsed / 3600 * runningEntry.hourly_rate);
        }
      }
    }

    const runningCount = todayEntries.filter(entry => entry.is_running).length + 
                       (runningEntry ? 1 : 0);

    return {
      totalSeconds,
      totalEntries: todayEntries.length + (runningEntry ? 1 : 0),
      billableSeconds,
      totalBillableAmount,
      runningCount
    };
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatAmount = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const handleTimeEntryCreated = (_timeEntry: TimeEntry) => {
    // Trigger refresh of the time entries list
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle real-time timer updates
  const handleTimerUpdate = (entry: TimeEntry | null, elapsedSeconds: number) => {
    setCurrentRunningEntry(entry);
    setCurrentElapsedSeconds(elapsedSeconds);
  };

  // Load time entries on mount and when refresh trigger changes
  onMount(() => {
    loadTimeEntries();
  });

  createEffect(() => {
    if (refreshTrigger() > 0) {
      loadTimeEntries();
    }
  });

  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer Component */}
        <div>
          <Timer 
            onTimeEntryCreated={handleTimeEntryCreated}
            onTimerUpdate={handleTimerUpdate}
          />
        </div>
        
        {/* Time Stats - Standardized Design */}
        <div class="border rounded-lg p-4">
          <h2 class="text-lg font-semibold mb-4">Today's Overview</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex items-center gap-3">
              <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                <IconClock class="size-5 text-primary" />
              </div>
              <div>
                <p class="text-2xl font-light">{formatTime(getTodayStats().totalSeconds)}</p>
                <p class="text-sm text-muted-foreground">Total Time Today</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                <IconActivity class="size-5 text-primary" />
              </div>
              <div>
                <p class="text-2xl font-light">{getTodayStats().totalEntries}</p>
                <p class="text-sm text-muted-foreground">Entries Today</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                <IconCurrencyDollar class="size-5 text-primary" />
              </div>
              <div>
                <p class="text-2xl font-light">{formatAmount(getTodayStats().totalBillableAmount)}</p>
                <p class="text-sm text-muted-foreground">
                  Billable Today
                  {currentRunningEntry() && currentRunningEntry()?.billable && (
                    <span class="ml-1 text-green-600 dark:text-green-400">
                      ● Live
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                <IconActivity class="size-5 text-primary" />
              </div>
              <div>
                <p class="text-2xl font-light">{getTodayStats().runningCount}</p>
                <p class="text-sm text-muted-foreground">Running Timers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      {/* Time Entries List */}
      <div>
        <TimeEntriesList refreshTrigger={refreshTrigger()} />
      </div>
    </div>
  );
};
