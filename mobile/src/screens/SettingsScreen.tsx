import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useAppContext } from '../context/AppContext';
import { trackeepApi } from '../lib/api';
import {
  Button,
  ErrorText,
  Input,
  Label,
  ScreenShell,
  SectionCard,
  uiStyles,
} from '../components/UI';

interface SettingsScreenProps {
  isActive: boolean;
}

export function SettingsScreen({ isActive }: SettingsScreenProps) {
  const { instanceUrl, user, logout, setInstanceUrl, clearInstance, refreshUser, busy } = useAppContext();

  const [instanceDraft, setInstanceDraft] = useState(instanceUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    if (isActive) {
      setInstanceDraft(instanceUrl ?? '');
    }
  }, [instanceUrl, isActive]);

  const saveInstance = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const probe = await trackeepApi.probeInstance(instanceDraft);
      await setInstanceUrl(probe.normalizedUrl);
      const versionText = probe.version ? ` (version ${probe.version})` : '';
      setInfo(`Instance updated to ${probe.normalizedUrl}${versionText}. Sign in again to continue.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update instance URL.');
    } finally {
      setSaving(false);
    }
  };

  const checkUpdates = async () => {
    if (!instanceUrl) {
      return;
    }

    setCheckingUpdates(true);
    setError(null);
    setInfo(null);

    try {
      const result = await trackeepApi.checkForUpdates(instanceUrl);
      const updateAvailable = result.update_available ? 'Yes' : 'No';
      const current = result.current_version || 'unknown';
      const latest = result.latest_version || 'unknown';
      const message = result.message ? ` | ${result.message}` : '';
      setInfo(`Update available: ${updateAvailable} | Current: ${current} | Latest: ${latest}${message}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check updates.');
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <ScreenShell title="Settings" subtitle="Manage instance connection, session and server checks.">
      <SectionCard>
        <Label>Connected User</Label>
        <Text style={uiStyles.muted}>{user ? `${user.full_name || user.username} (${user.email})` : 'Not signed in'}</Text>
        <View style={uiStyles.row}>
          <Button label="Refresh Profile" variant="secondary" onPress={() => void refreshUser()} loading={busy} />
          <Button label="Logout" variant="danger" onPress={() => void logout()} loading={busy} />
        </View>
      </SectionCard>

      <SectionCard>
        <Label>Trackeep Instance</Label>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://trackeep.yourdomain.com"
          value={instanceDraft}
          onChangeText={setInstanceDraft}
        />
        <View style={uiStyles.row}>
          <Button label="Save Instance" onPress={saveInstance} loading={saving} />
          <Button
            label="Disconnect"
            variant="secondary"
            onPress={() => {
              void clearInstance();
            }}
          />
        </View>
        <Text style={uiStyles.muted}>
          Switching instance clears your current session to keep auth isolated per server.
        </Text>
      </SectionCard>

      <SectionCard>
        <Label>Server Update Check</Label>
        <Text style={uiStyles.muted}>Checks `/api/updates/check` on your connected Trackeep instance.</Text>
        <Button
          label="Check For Updates"
          variant="secondary"
          onPress={checkUpdates}
          loading={checkingUpdates}
          disabled={!instanceUrl}
        />
      </SectionCard>

      <ErrorText message={error} />
      {info ? <Text style={[uiStyles.muted, { color: '#047857', fontWeight: '600' }]}>{info}</Text> : null}
    </ScreenShell>
  );
}
