import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OfflineState } from '../types';
import NetInfo from '@react-native-community/netinfo';
import { syncOfflineData, getPendingChangesCount } from '../utils/offlineSync';

interface OfflineContextType extends OfflineState {
  syncNow: () => Promise<void>;
  forceSync: () => Promise<void>;
  clearPendingChanges: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    syncInProgress: false,
    pendingChanges: 0,
    lastSyncTime: undefined,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: any) => {
      const isOnline = netState.isConnected ?? false;
      setState(prev => ({ 
        ...prev, 
        isOnline 
      }));
      
      if (isOnline && state.pendingChanges > 0) {
        syncOfflineData();
      }
    });

    loadPendingChanges();

    return () => unsubscribe();
  }, []);

  const loadPendingChanges = async () => {
    try {
      const count = await getPendingChangesCount();
      setState(prev => ({ ...prev, pendingChanges: count }));
    } catch (error) {
      console.error('Error loading pending changes:', error);
    }
  };

  const syncNow = async () => {
    if (!state.isOnline || state.syncInProgress) return;
    
    setState(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      await syncOfflineData();
      const count = await getPendingChangesCount();
      setState(prev => ({
        ...prev,
        syncInProgress: false,
        pendingChanges: count,
        lastSyncTime: new Date(),
      }));
    } catch (error) {
      console.error('Sync error:', error);
      setState(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  const forceSync = async () => {
    setState(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      await syncOfflineData();
      const count = await getPendingChangesCount();
      setState(prev => ({
        ...prev,
        syncInProgress: false,
        pendingChanges: count,
        lastSyncTime: new Date(),
      }));
    } catch (error) {
      console.error('Force sync error:', error);
      setState(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  const clearPendingChanges = async () => {
    try {
      setState(prev => ({ ...prev, pendingChanges: 0 }));
    } catch (error) {
      console.error('Error clearing pending changes:', error);
    }
  };

  const value: OfflineContextType = {
    ...state,
    syncNow,
    forceSync,
    clearPendingChanges,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
