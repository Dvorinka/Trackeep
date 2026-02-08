import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ServerConfig {
  baseUrl: string;
  username: string;
  password: string;
}

interface ServerConfigContextType {
  config: ServerConfig | null;
  isConfigured: boolean;
  setConfig: (config: ServerConfig) => Promise<void>;
  clearConfig: () => Promise<void>;
  isLoading: boolean;
}

const ServerConfigContext = createContext<ServerConfigContextType | undefined>(undefined);

const SERVER_CONFIG_KEY = 'trackeep_server_config';

interface ServerConfigProviderProps {
  children: ReactNode;
}

export const ServerConfigProvider: React.FC<ServerConfigProviderProps> = ({ children }) => {
  const [config, setConfigState] = useState<ServerConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const storedConfig = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        setConfigState(parsedConfig);
      }
    } catch (error) {
      console.error('Error loading server config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setConfig = async (newConfig: ServerConfig) => {
    try {
      await AsyncStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(newConfig));
      setConfigState(newConfig);
    } catch (error) {
      console.error('Error saving server config:', error);
      throw error;
    }
  };

  const clearConfig = async () => {
    try {
      await AsyncStorage.removeItem(SERVER_CONFIG_KEY);
      setConfigState(null);
    } catch (error) {
      console.error('Error clearing server config:', error);
      throw error;
    }
  };

  const value: ServerConfigContextType = {
    config,
    isConfigured: !!config,
    setConfig,
    clearConfig,
    isLoading,
  };

  return (
    <ServerConfigContext.Provider value={value}>
      {children}
    </ServerConfigContext.Provider>
  );
};

export const useServerConfig = (): ServerConfigContextType => {
  const context = useContext(ServerConfigContext);
  if (context === undefined) {
    throw new Error('useServerConfig must be used within a ServerConfigProvider');
  }
  return context;
};
