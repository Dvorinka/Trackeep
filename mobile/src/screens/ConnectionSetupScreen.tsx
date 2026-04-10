import React, { useState } from 'react';
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

export function ConnectionSetupScreen() {
  const { setInstanceUrl } = useAppContext();

  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await trackeepApi.probeInstance(inputUrl);
      const versionText = result.version ? ` | Version ${result.version}` : '';
      setMessage(`Connected: ${result.normalizedUrl}${versionText}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to this instance.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await trackeepApi.probeInstance(inputUrl);
      await setInstanceUrl(result.normalizedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save this instance URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      title="Connect To Your Trackeep"
      subtitle="Point the mobile app at your self-hosted instance."
    >
      <SectionCard>
        <Label>Instance URL</Label>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://trackeep.yourdomain.com"
          value={inputUrl}
          onChangeText={setInputUrl}
        />
        <Text style={uiStyles.muted}>
          For local testing use `http://10.0.2.2:8080` on Android emulator or `http://localhost:8080` on iOS simulator.
        </Text>

        <View style={uiStyles.row}>
          <Button label="Test Connection" variant="secondary" onPress={handleTest} loading={loading} />
          <Button label="Save & Continue" onPress={handleSave} loading={loading} />
        </View>

        <ErrorText message={error} />
        {message ? <Text style={[uiStyles.muted, { color: '#047857', fontWeight: '600' }]}>{message}</Text> : null}
      </SectionCard>
    </ScreenShell>
  );
}
