import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { trackeepApi } from '../lib/api';
import { formatDate, tagsToText } from '../lib/format';
import { Note } from '../types';
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

interface NotesScreenProps {
  instanceUrl: string;
  token: string;
  isActive: boolean;
}

export function NotesScreen({ instanceUrl, token, isActive }: NotesScreenProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await trackeepApi.notes.list(instanceUrl, token);
      setNotes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }, [instanceUrl, token]);

  useEffect(() => {
    if (isActive) {
      void loadNotes();
    }
  }, [isActive, loadNotes]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingId(null);
  };

  const saveNote = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Note title is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await trackeepApi.notes.update(instanceUrl, token, editingId, {
          title: trimmedTitle,
          content,
        });
      } else {
        await trackeepApi.notes.create(instanceUrl, token, {
          title: trimmedTitle,
          content,
          is_public: false,
        });
      }

      resetForm();
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content || '');
  };

  const deleteNote = async (id: number) => {
    setSaving(true);
    setError(null);

    try {
      await trackeepApi.notes.remove(instanceUrl, token, id);
      if (editingId === id) {
        resetForm();
      }
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell title="Notes" subtitle="Write notes and keep them synced with your server.">
      <SectionCard>
        <Label>{editingId ? 'Edit Note' : 'New Note'}</Label>
        <Input placeholder="Note title" value={title} onChangeText={setTitle} />
        <Input multiline placeholder="Write your note..." value={content} onChangeText={setContent} />

        <View style={uiStyles.row}>
          <Button label="Refresh" variant="secondary" onPress={loadNotes} loading={loading} />
          <Button label={editingId ? 'Save Changes' : 'Create Note'} onPress={saveNote} loading={saving} />
          {editingId ? <Button label="Cancel" variant="secondary" onPress={resetForm} /> : null}
        </View>

        <ErrorText message={error} />
      </SectionCard>

      {notes.map((note) => {
        const tags = tagsToText(note.tags);

        return (
          <SectionCard key={note.id}>
            <View style={uiStyles.splitRow}>
              <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{note.title}</Text>
              {note.is_public ? (
                <View style={[uiStyles.chip, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={uiStyles.chipText}>Public</Text>
                </View>
              ) : null}
            </View>

            {note.content ? <Text style={uiStyles.muted}>{note.content}</Text> : null}
            {tags ? <Text style={uiStyles.muted}>Tags: {tags}</Text> : null}
            <Text style={uiStyles.muted}>Updated: {formatDate(note.updated_at)}</Text>

            <View style={uiStyles.row}>
              <Button label="Edit" variant="secondary" onPress={() => beginEdit(note)} />
              <Button
                label="Delete"
                variant="danger"
                onPress={() => {
                  void deleteNote(note.id);
                }}
                loading={saving}
              />
            </View>
          </SectionCard>
        );
      })}

      {!loading && notes.length === 0 ? (
        <SectionCard>
          <Text style={uiStyles.muted}>No notes found yet.</Text>
        </SectionCard>
      ) : null}
    </ScreenShell>
  );
}
