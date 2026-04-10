import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useAppContext } from '../context/AppContext';
import {
  Button,
  ErrorText,
  Input,
  Label,
  ScreenShell,
  SectionCard,
  uiStyles,
} from '../components/UI';

type AuthMode = 'login' | 'register';

export function AuthScreen() {
  const { instanceUrl, login, register, busy } = useAppContext();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ctaLabel = useMemo(() => (mode === 'login' ? 'Sign In' : 'Create Account'), [mode]);

  const submit = async () => {
    setError(null);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        return;
      }

      await register({
        email: email.trim(),
        username: username.trim(),
        fullName: fullName.trim(),
        password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    }
  };

  return (
    <ScreenShell
      title={mode === 'login' ? 'Sign In' : 'Register'}
      subtitle={instanceUrl ? `Instance: ${instanceUrl}` : undefined}
    >
      <SectionCard>
        <View style={uiStyles.row}>
          <Button
            label="Login"
            onPress={() => setMode('login')}
            variant={mode === 'login' ? 'primary' : 'secondary'}
          />
          <Button
            label="Register"
            onPress={() => setMode('register')}
            variant={mode === 'register' ? 'primary' : 'secondary'}
          />
        </View>

        <Label>Email</Label>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
        />

        {mode === 'register' ? (
          <>
            <Label>Username</Label>
            <Input autoCapitalize="none" autoCorrect={false} placeholder="yourname" value={username} onChangeText={setUsername} />

            <Label>Full Name</Label>
            <Input placeholder="Your Name" value={fullName} onChangeText={setFullName} />
          </>
        ) : null}

        <Label>Password</Label>
        <Input secureTextEntry placeholder="••••••••" value={password} onChangeText={setPassword} />

        <Button label={ctaLabel} onPress={submit} loading={busy} />
        <ErrorText message={error} />

        {mode === 'register' ? (
          <Text style={uiStyles.muted}>
            Registration succeeds for first setup or when an admin allows user creation.
          </Text>
        ) : null}
      </SectionCard>
    </ScreenShell>
  );
}
