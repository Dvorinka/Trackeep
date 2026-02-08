import React, { useEffect, useState } from 'react';
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import {
  Provider as PaperProvider,
  DefaultTheme as PaperDefaultTheme,
  MD3DarkTheme as PaperDarkTheme,
} from 'react-native-paper';
import { StatusBar } from 'react-native';
import { AuthProvider } from './services/AuthContext';
import { OfflineProvider } from './services/OfflineContext';
import { NotificationProvider } from './services/NotificationContext';
import { CameraProvider } from './services/CameraContext';
import { VoiceProvider } from './services/VoiceContext';
import { ServerConfigProvider } from './services/ServerConfigContext';
import { RealtimeSyncProvider } from './services/RealtimeSyncContext';
import AppNavigator from './navigation/AppNavigator';
import { loadTheme } from './utils/storage';

const CombinedDefaultTheme = {
  ...NavigationDefaultTheme,
  ...PaperDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    ...PaperDefaultTheme.colors,
  },
};

const CombinedDarkTheme = {
  ...NavigationDarkTheme,
  ...PaperDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    ...PaperDarkTheme.colors,
  },
};

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const savedTheme = await loadTheme();
        setIsDarkTheme(savedTheme === 'dark');
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsThemeLoaded(true);
      }
    };

    initializeTheme();
  }, []);

  const theme = isDarkTheme ? CombinedDarkTheme : CombinedDefaultTheme;

  if (!isThemeLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={theme}>
        <StatusBar
          barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <ServerConfigProvider>
          <RealtimeSyncProvider>
            <AuthProvider>
              <NotificationProvider>
                <CameraProvider>
                  <VoiceProvider>
                    <OfflineProvider>
                      <AppNavigator />
                    </OfflineProvider>
                  </VoiceProvider>
                </CameraProvider>
              </NotificationProvider>
            </AuthProvider>
          </RealtimeSyncProvider>
        </ServerConfigProvider>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;
