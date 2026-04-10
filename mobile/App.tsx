import { StatusBar } from 'expo-status-bar';
import { ShareIntent, useShareIntent } from 'expo-share-intent';
import React from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AppProvider, useAppContext } from './src/context/AppContext';
import { colors } from './src/components/UI';
import { AuthScreen } from './src/screens/AuthScreen';
import { ConnectionSetupScreen } from './src/screens/ConnectionSetupScreen';
import { WebAppScreen } from './src/screens/WebAppScreen';

interface ShareIntentState {
  hasShareIntent: boolean;
  shareIntent: ShareIntent;
  resetShareIntent: (clearNativeModule?: boolean) => void;
  error: string | null;
}

function AppRouter({ shareIntentState }: { shareIntentState: ShareIntentState }) {
  const { ready, instanceUrl, token, user, logout } = useAppContext();

  if (!ready) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.bootText}>Loading Trackeep Mobile...</Text>
      </SafeAreaView>
    );
  }

  if (!instanceUrl) {
    return <ConnectionSetupScreen />;
  }

  if (!token) {
    return <AuthScreen />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.bootText}>Loading user session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <WebAppScreen
      instanceUrl={instanceUrl}
      token={token}
      user={user}
      onLogout={logout}
      shareIntentState={shareIntentState}
    />
  );
}

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent({
    resetOnBackground: false,
  });

  return (
    <AppProvider>
      <View style={styles.appRoot}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <AppRouter shareIntentState={{ hasShareIntent, shareIntent, resetShareIntent, error }} />
        </SafeAreaView>
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 10,
  },
  bootText: {
    color: colors.muted,
    fontSize: 14,
  },
});
