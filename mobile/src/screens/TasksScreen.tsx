import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { trackeepApi } from '../lib/api';
import { formatDate, tagsToText } from '../lib/format';
import { Task } from '../types';
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

interface TasksScreenProps {
  instanceUrl: string;
  token: string;
  isActive: boolean;
}

export function TasksScreen({ instanceUrl, token, isActive }: TasksScreenProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await trackeepApi.tasks.list(instanceUrl, token);
      setTasks(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [instanceUrl, token]);

  useEffect(() => {
    if (isActive) {
      void loadTasks();
    }
  }, [isActive, loadTasks]);

  const createTask = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await trackeepApi.tasks.create(instanceUrl, token, {
        title: trimmedTitle,
        description: description.trim(),
        priority,
        status: 'pending',
      });
      setTitle('');
      setDescription('');
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    setSaving(true);
    setError(null);

    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';

    try {
      await trackeepApi.tasks.update(instanceUrl, token, task.id, {
        status: nextStatus,
        progress: nextStatus === 'completed' ? 100 : 0,
      });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id: number) => {
    setSaving(true);
    setError(null);

    try {
      await trackeepApi.tasks.remove(instanceUrl, token, id);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell title="Tasks" subtitle="Create, update and sync task state with your Trackeep backend.">
      <SectionCard>
        <Label>New Task</Label>
        <Input placeholder="Task title" value={title} onChangeText={setTitle} />
        <Input
          multiline
          placeholder="Task description"
          value={description}
          onChangeText={setDescription}
        />

        <Label>Priority</Label>
        <View style={uiStyles.row}>
          {(['low', 'medium', 'high'] as const).map((value) => (
            <Button
              key={value}
              label={value}
              variant={priority === value ? 'primary' : 'secondary'}
              onPress={() => setPriority(value)}
            />
          ))}
        </View>

        <View style={uiStyles.row}>
          <Button label="Refresh" variant="secondary" onPress={loadTasks} loading={loading} />
          <Button label="Create Task" onPress={createTask} loading={saving} />
        </View>
        <ErrorText message={error} />
      </SectionCard>

      {tasks.map((task) => {
        const tags = tagsToText(task.tags);
        const isCompleted = task.status === 'completed';

        return (
          <SectionCard key={task.id}>
            <View style={uiStyles.splitRow}>
              <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{task.title}</Text>
              <View style={[uiStyles.chip, { backgroundColor: isCompleted ? '#DCFCE7' : '#E6F6FB' }]}>
                <Text style={uiStyles.chipText}>{task.status}</Text>
              </View>
            </View>

            {task.description ? <Text style={uiStyles.muted}>{task.description}</Text> : null}
            <Text style={uiStyles.muted}>Priority: {task.priority}</Text>
            <Text style={uiStyles.muted}>Updated: {formatDate(task.updated_at)}</Text>
            {tags ? <Text style={uiStyles.muted}>Tags: {tags}</Text> : null}

            <View style={uiStyles.row}>
              <Button
                label={isCompleted ? 'Mark Pending' : 'Mark Complete'}
                variant="secondary"
                onPress={() => {
                  void toggleTaskStatus(task);
                }}
                loading={saving}
              />
              <Button
                label="Delete"
                variant="danger"
                onPress={() => {
                  void deleteTask(task.id);
                }}
                loading={saving}
              />
            </View>
          </SectionCard>
        );
      })}

      {!loading && tasks.length === 0 ? (
        <SectionCard>
          <Text style={uiStyles.muted}>No tasks found yet.</Text>
        </SectionCard>
      ) : null}
    </ScreenShell>
  );
}
