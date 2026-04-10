import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { trackeepApi } from '../lib/api';
import { normalizeInstanceUrl } from '../lib/url';
import { User } from '../types';

const INSTANCE_URL_KEY = 'trackeep_mobile_instance_url';
const USER_KEY = 'trackeep_mobile_user';
const TOKEN_KEY = 'trackeep_mobile_token';

interface RegisterPayload {
  email: string;
  username: string;
  fullName: string;
  password: string;
}

interface AppContextValue {
  ready: boolean;
  busy: boolean;
  instanceUrl: string | null;
  token: string | null;
  user: User | null;
  setInstanceUrl: (url: string) => Promise<void>;
  clearInstance: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function loadToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [instanceUrl, setInstanceUrlState] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [[, storedInstance], [, storedUser]] = await AsyncStorage.multiGet([INSTANCE_URL_KEY, USER_KEY]);
        const storedToken = await loadToken();

        let parsedUser: User | null = null;
        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser) as User;
          } catch {
            parsedUser = null;
          }
        }

        let normalizedInstance: string | null = null;
        if (storedInstance) {
          try {
            normalizedInstance = normalizeInstanceUrl(storedInstance);
          } catch {
            normalizedInstance = null;
            await AsyncStorage.removeItem(INSTANCE_URL_KEY);
          }
        }

        if (normalizedInstance && storedToken) {
          try {
            const freshUser = await trackeepApi.auth.me(normalizedInstance, storedToken);
            setInstanceUrlState(normalizedInstance);
            setToken(storedToken);
            setUser(freshUser);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          } catch {
            setInstanceUrlState(normalizedInstance);
            setToken(null);
            setUser(null);
            await clearToken();
            await AsyncStorage.removeItem(USER_KEY);
          }
        } else {
          setInstanceUrlState(normalizedInstance);
          setToken(null);
          setUser(null);
        }
      } finally {
        setReady(true);
      }
    };

    void bootstrap();
  }, []);

  const clearSession = async () => {
    setToken(null);
    setUser(null);
    await clearToken();
    await AsyncStorage.removeItem(USER_KEY);
  };

  const setInstanceUrl = async (url: string) => {
    const normalized = normalizeInstanceUrl(url);
    const hasChanged = normalized !== instanceUrl;

    setInstanceUrlState(normalized);
    await AsyncStorage.setItem(INSTANCE_URL_KEY, normalized);

    if (hasChanged) {
      await clearSession();
    }
  };

  const clearInstance = async () => {
    await clearSession();
    setInstanceUrlState(null);
    await AsyncStorage.removeItem(INSTANCE_URL_KEY);
  };

  const login = async (email: string, password: string) => {
    if (!instanceUrl) {
      throw new Error('Set your Trackeep instance URL first.');
    }

    setBusy(true);
    try {
      const response = await trackeepApi.auth.login(instanceUrl, email, password);
      setToken(response.token);
      setUser(response.user);
      await saveToken(response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    } finally {
      setBusy(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    if (!instanceUrl) {
      throw new Error('Set your Trackeep instance URL first.');
    }

    setBusy(true);
    try {
      const response = await trackeepApi.auth.register(instanceUrl, payload);
      setToken(response.token);
      setUser(response.user);
      await saveToken(response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    const currentToken = token;
    const currentInstance = instanceUrl;

    setBusy(true);
    try {
      if (currentToken && currentInstance) {
        try {
          await trackeepApi.auth.logout(currentInstance, currentToken);
        } catch {
          // Ignore logout API failures so local session can always be cleared.
        }
      }
      await clearSession();
    } finally {
      setBusy(false);
    }
  };

  const refreshUser = async () => {
    if (!instanceUrl || !token) {
      return;
    }

    setBusy(true);
    try {
      const freshUser = await trackeepApi.auth.me(instanceUrl, token);
      setUser(freshUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      busy,
      instanceUrl,
      token,
      user,
      setInstanceUrl,
      clearInstance,
      login,
      register,
      logout,
      refreshUser,
    }),
    [ready, busy, instanceUrl, token, user],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider.');
  }
  return context;
}
