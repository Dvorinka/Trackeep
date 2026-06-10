import { createSignal, createEffect, onMount } from 'solid-js';
import { IconClock, IconActivity, IconCurrencyDollar } from '@tabler/icons-solidjs';
import { useHaptics } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { solidtimeApi } from '@/lib/solidtime-api';

export const TimeTracking = () => {
  const haptics = useHaptics();
  const [loading, setLoading] = createSignal(true);
  const [timeEntries, setTimeEntries] = createSignal<any[]>([]);
  const [currentRunningEntry, setCurrentRunningEntry] = createSignal<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = createSignal(0);
  const [stats, setStats] = createSignal({ total: 0, billable: 0, nonBillable: 0 });

  let timerInterval: ReturnType<typeof setInterval> | null = null;

  const loadData = async () => {
    try {
      setLoading(true);
      const entries = await solidtimeApi.getTimeEntries();
      setTimeEntries(entries);
      
      const active = await solidtimeApi.getActiveTimeEntry();
      setCurrentRunningEntry(active);
      
      if (active) {
        const start = new Date(active.start).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      } else {
        setElapsedSeconds(0);
      }
      
      const stats = await solidtimeApi.getTimeEntriesStats();
      setStats(stats);
    } catch (err) {
      console.error('Failed to load time entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async () => {
    try {
      const entry = await solidtimeApi.startTimeEntry({
        description: 'Working on Trackeep',
      });
      setCurrentRunningEntry(entry);
      setElapsedSeconds(0);
      haptics.impact();
      loadData();
    } catch (err) {
      console.error('Failed to start timer:', err);
    }
  };

  const stopTimer = async () => {
    if (!currentRunningEntry()) return;
    try {
      await solidtimeApi.stopTimeEntry(currentRunningEntry().id);
      setCurrentRunningEntry(null);
      setElapsedSeconds(0);
      haptics.selection();
      loadData();
    } catch (err) {
      console.error('Failed to stop timer:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diff = Math.floor((endTime - startTime) / 1000);
    return formatTime(diff);
  };

  onMount(() => {
    loadData();
  });

  createEffect(() => {
    if (currentRunningEntry()) {
      timerInterval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  });

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Time Tracking</h1>
          <p class="text-muted-foreground mt-1">
            Track your time with solidtime.io integration
          </p>
        </div>
      </div>

      <Card class="p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IconClock class="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 class="text-lg font-semibold">
                {currentRunningEntry() ? 'Timer Running' : 'Ready to Track'}
              </h2>
              <p class="text-sm text-muted-foreground">
                {currentRunningEntry() 
                  ? currentRunningEntry().description || 'No description'
                  : 'Start tracking your time'}
              </p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-4xl font-bold tabular-nums">
              {formatTime(elapsedSeconds())}
            </div>
            <div class="text-sm text-muted-foreground">
              {currentRunningEntry() ? 'Running' : 'Stopped'}
            </div>
          </div>
        </div>
        <div class="mt-6 flex gap-3">
          {!currentRunningEntry() ? (
            <Button onClick={startTimer} class="gap-2">
              <IconActivity class="w-4 h-4" />
              Start Timer
            </Button>
          ) : (
            <Button onClick={stopTimer} variant="destructive" class="gap-2">
              <IconClock class="w-4 h-4" />
              Stop Timer
            </Button>
          )}
        </div>
      </Card>

      <div class="grid gap-4 md:grid-cols-3">
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <IconClock class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Total Today</p>
              <p class="text-xl font-bold">{formatTime(stats().total)}</p>
            </div>
          </div>
        </Card>
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <IconCurrencyDollar class="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Billable</p>
              <p class="text-xl font-bold">{formatTime(stats().billable)}</p>
            </div>
          </div>
        </Card>
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <IconActivity class="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Non-Billable</p>
              <p class="text-xl font-bold">{formatTime(stats().nonBillable)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card class="p-6">
        <h3 class="text-lg font-semibold mb-4">Recent Time Entries</h3>
        {loading() ? (
          <LoadingState message="Loading entries..." center />
        ) : timeEntries().length === 0 ? (
          <div class="text-center py-8 text-muted-foreground">
            <IconClock class="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No time entries yet</p>
            <p class="text-sm">Start tracking your time to see entries here</p>
          </div>
        ) : (
          <div class="space-y-3">
            {timeEntries().map((entry) => (
              <div class="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full bg-primary" />
                  <div>
                    <p class="font-medium">{entry.description || 'Untitled'}</p>
                    <p class="text-sm text-muted-foreground">
                      {new Date(entry.start).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <Badge variant={entry.billable ? 'default' : 'secondary'}>
                    {entry.billable ? 'Billable' : 'Non-Billable'}
                  </Badge>
                  <span class="font-mono text-sm">
                    {formatDuration(entry.start, entry.end)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
