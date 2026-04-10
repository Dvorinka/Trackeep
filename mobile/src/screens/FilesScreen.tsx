import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { trackeepApi } from '../lib/api';
import { formatDate, formatFileSize } from '../lib/format';
import { FileItem } from '../types';
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

interface FilesScreenProps {
  instanceUrl: string;
  token: string;
  isActive: boolean;
}

export function FilesScreen({ instanceUrl, token, isActive }: FilesScreenProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await trackeepApi.files.list(instanceUrl, token);
      setFiles(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files.');
    } finally {
      setLoading(false);
    }
  }, [instanceUrl, token]);

  useEffect(() => {
    if (isActive) {
      void loadFiles();
    }
  }, [isActive, loadFiles]);

  const pickAndUpload = async () => {
    setError(null);

    const pickerResult = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (pickerResult.canceled || pickerResult.assets.length === 0) {
      return;
    }

    setSaving(true);

    try {
      await trackeepApi.files.upload(instanceUrl, token, pickerResult.assets[0], description);
      setDescription('');
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async (id: number) => {
    setSaving(true);
    setError(null);

    try {
      await trackeepApi.files.remove(instanceUrl, token, id);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file.');
    } finally {
      setSaving(false);
    }
  };

  const openDownload = async (id: number) => {
    const url = trackeepApi.files.getDownloadUrl(instanceUrl, token, id);

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('This device cannot open the download URL.');
      }
      await Linking.openURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open download URL.');
    }
  };

  return (
    <ScreenShell title="Files" subtitle="Upload from your phone and manage file records on your server.">
      <SectionCard>
        <Label>Upload</Label>
        <Input
          placeholder="Optional description"
          value={description}
          onChangeText={setDescription}
        />
        <View style={uiStyles.row}>
          <Button label="Refresh" variant="secondary" onPress={loadFiles} loading={loading} />
          <Button label="Pick & Upload" onPress={pickAndUpload} loading={saving} />
        </View>
        <ErrorText message={error} />
      </SectionCard>

      {files.map((file) => (
        <SectionCard key={file.id}>
          <View style={uiStyles.splitRow}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{file.original_name}</Text>
            <View style={uiStyles.chip}>
              <Text style={uiStyles.chipText}>{file.file_type}</Text>
            </View>
          </View>

          <Text style={uiStyles.muted}>Size: {formatFileSize(file.file_size)}</Text>
          <Text style={uiStyles.muted}>Uploaded: {formatDate(file.created_at)}</Text>
          {file.description ? <Text style={uiStyles.muted}>Description: {file.description}</Text> : null}

          <View style={uiStyles.row}>
            <Button label="Download" variant="secondary" onPress={() => void openDownload(file.id)} />
            <Button
              label="Delete"
              variant="danger"
              onPress={() => {
                void deleteFile(file.id);
              }}
              loading={saving}
            />
          </View>
        </SectionCard>
      ))}

      {!loading && files.length === 0 ? (
        <SectionCard>
          <Text style={uiStyles.muted}>No files uploaded yet.</Text>
        </SectionCard>
      ) : null}
    </ScreenShell>
  );
}
