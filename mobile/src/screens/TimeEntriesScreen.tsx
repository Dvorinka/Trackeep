import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { trackeepApi } from '../lib/api';
import { formatDate, formatDuration } from '../lib/format';
import { TimeEntry } from '../types';
import {
  Button,
  ErrorText,
  Input,
  Label,
  ScreenShell,
  SectionCard,
  colors,
  uiStyles,
} from '../components/UI';

interface TimeEntriesScreenProps {
  instanceUrl: string;
  token: string;
  isActive: boolean;
}

function resolveDurationSeconds(entry: TimeEntry, nowMs: number): number {
  if (typeof entry.duration === 'number' && entry.duration >= 0) {
    return entry.duration;
  }

  const startMs = new Date(entry.start_time).getTime();
  if (Number.isNaN(startMs)) {
    return 0;
  }

  if (entry.is_running) {
    return Math.floor((nowMs - startMs) / 1000);
  }

  if (entry.end_time) {
    const endMs = new Date(entry.end_time).getTime();
    if (!Number.isNaN(endMs)) {
      return Math.floor((endMs - startMs) / 1000);
    }
  }

  return 0;
}

export function TimeEntriesScreen({ instanceUrl, token, isActive }: TimeEntriesScreenProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const hasRunningEntries = useMemo(() => entries.some((entry) => entry.is_running), [entries]);

  useEffect(() => {
    if (!hasRunningEntries) {
      return;
    }

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [hasRunningEntries]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await trackeepApi.timeEntries.list(instanceUrl, token);
      setEntries(response.time_entries);
      setNowMs(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time entries.');
    } finally {
      setLoading(false);
    }
  }, [instanceUrl, token]);

  useEffect(() => {
    if (isActive) {
      void loadEntries();
    }
  }, [isActive, loadEntries]);

  const startEntry = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      setError('Description is required to start tracking time.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await trackeepApi.timeEntries.create(instanceUrl, token, {
        description: trimmed,
        source: 'mobile',
      });
      setDescription('');
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer.');
    } finally {
      setSaving(false);
    }
  };

  const stopEntry = async (id: number) => {
    setSaving(true);
    setError(null);

    try {
      await trackeepApi.timeEntries.stop(instanceUrl, token, id);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: number) => {
    setSaving(true);
    setError(null);

    try {
      await trackeepApi.timeEntries.remove(instanceUrl, token, id);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell title="Time Tracking" subtitle="Start and stop timers synced with Trackeep time entries.">
      <SectionCard>
        <Label>Start New Timer</Label>
        <Input placeholder="What are you working on?" value={description} onChangeText={setDescription} />
        <View style={uiStyles.row}>
          <Button label="Refresh" variant="secondary" onPress={loadEntries} loading={loading} />
          <Button label="Start Timer" onPress={startEntry} loading={saving} />
        </View>
        <ErrorText message={error} />
      </SectionCard>

      {entries.map((entry) => {
        const duration = formatDuration(resolveDurationSeconds(entry, nowMs));

        return (
          <SectionCard key={entry.id}>
            <View style={uiStyles.splitRow}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{entry.description || 'Untitled entry'}</Text>
              <View style={[uiStyles.chip, { backgroundColor: entry.is_running ? '#DCFCE7' : '#E6F6FB' }]}>
                <Text style={uiStyles.chipText}>{entry.is_running ? 'Running' : 'Stopped'}</Text>
              </View>
            </View>

            <Text style={uiStyles.muted}>Duration: {duration}</Text>
            <Text style={uiStyles.muted}>Started: {formatDate(entry.start_time)}</Text>
            {entry.end_time ? <Text style={uiStyles.muted}>Ended: {formatDate(entry.end_time)}</Text> : null}

            <View style={uiStyles.row}>
              {entry.is_running ? (
                <Button
                  label="Stop"
                  variant="secondary"
                  onPress={() => {
                    void stopEntry(entry.id);
                  }}
                  loading={saving}
                />
              ) : null}
              <Button
                label="Delete"
                variant="danger"
                onPress={() => {
                  void deleteEntry(entry.id);
                }}
                loading={saving}
              />
            </View>
          </SectionCard>
        );
      })}

      {!loading && entries.length === 0 ? (
        <SectionCard>
          <Text style={uiStyles.muted}>No time entries found yet.</Text>
        </SectionCard>
      ) : null}
    </ScreenShell>
  );
}
