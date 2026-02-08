import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const STORAGE_KEYS = {
  AUTH_TOKEN: '@trackeep_auth_token',
  USER_DATA: '@trackeep_user_data',
  THEME: '@trackeep_theme',
  BOOKMARKS: '@trackeep_bookmarks',
  TASKS: '@trackeep_tasks',
  NOTES: '@trackeep_notes',
  TIME_ENTRIES: '@trackeep_time_entries',
  OFFLINE_CHANGES: '@trackeep_offline_changes',
  SEARCH_HISTORY: '@trackeep_search_history',
  SAVED_SEARCHES: '@trackeep_saved_searches',
} as const;

export interface StoredAuthData {
  token: string;
  user: User;
}

export const storeAuthData = async (data: StoredAuthData): Promise<void> => {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.AUTH_TOKEN, data.token],
      [STORAGE_KEYS.USER_DATA, JSON.stringify(data.user)],
    ]);
  } catch (error) {
    console.error('Error storing auth data:', error);
    throw error;
  }
};

export const getStoredAuthData = async (): Promise<StoredAuthData | null> => {
  try {
    const [token, userData] = await AsyncStorage.multiGet([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);

    if (token[1] && userData[1]) {
      return {
        token: token[1],
        user: JSON.parse(userData[1]),
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting stored auth data:', error);
    return null;
  }
};

export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

export const loadTheme = async (): Promise<'light' | 'dark'> => {
  try {
    const theme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
    return theme === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.error('Error loading theme:', error);
    return 'light';
  }
};

export const saveTheme = async (theme: 'light' | 'dark'): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.error('Error saving theme:', error);
    throw error;
  }
};

export const storeOfflineData = async <T>(key: keyof typeof STORAGE_KEYS, data: T[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch (error) {
    console.error(`Error storing offline data for ${key}:`, error);
    throw error;
  }
};

export const getOfflineData = async <T>(key: keyof typeof STORAGE_KEYS): Promise<T[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS[key]);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error getting offline data for ${key}:`, error);
    return [];
  }
};

export const addOfflineChange = async (change: any): Promise<void> => {
  try {
    const existingChanges = await getOfflineData('OFFLINE_CHANGES');
    existingChanges.push({
      ...change,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    });
    await storeOfflineData('OFFLINE_CHANGES', existingChanges);
  } catch (error) {
    console.error('Error adding offline change:', error);
    throw error;
  }
};

export const clearOfflineChanges = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_CHANGES);
  } catch (error) {
    console.error('Error clearing offline changes:', error);
    throw error;
  }
};

export const getPendingChangesCount = async (): Promise<number> => {
  try {
    const changes = await getOfflineData('OFFLINE_CHANGES');
    return changes.length;
  } catch (error) {
    console.error('Error getting pending changes count:', error);
    return 0;
  }
};

export const storeSearchHistory = async (query: string): Promise<void> => {
  try {
    const history = await getOfflineData('SEARCH_HISTORY');
    const filteredHistory = (history as string[]).filter((item: string) => item !== query);
    filteredHistory.unshift(query);
    const limitedHistory = filteredHistory.slice(0, 50);
    await storeOfflineData('SEARCH_HISTORY', limitedHistory);
  } catch (error) {
    console.error('Error storing search history:', error);
    throw error;
  }
};

export const getSearchHistory = async (): Promise<string[]> => {
  try {
    return await getOfflineData('SEARCH_HISTORY');
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
};
