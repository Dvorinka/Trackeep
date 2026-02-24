import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useServerConfig } from './ServerConfigContext';
import { DeviceEventEmitter } from 'react-native';

interface SyncEvent {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'bookmark' | 'task' | 'note' | 'timeEntry';
  entityId: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

interface RealtimeSyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingEvents: SyncEvent[];
  lastSyncTime: number | null;
  syncNow: () => Promise<void>;
  addSyncEvent: (event: Omit<SyncEvent, 'id' | 'timestamp' | 'synced'>) => Promise<void>;
  clearPendingEvents: () => Promise<void>;
}

const RealtimeSyncContext = createContext<RealtimeSyncContextType | undefined>(undefined);

const SYNC_EVENTS_KEY = 'trackeep_sync_events';
const LAST_SYNC_KEY = 'trackeep_last_sync';

interface RealtimeSyncProviderProps {
  children: ReactNode;
}

export const RealtimeSyncProvider: React.FC<RealtimeSyncProviderProps> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<SyncEvent[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  
  const netInfo = useNetInfo();
  const { config } = useServerConfig();

  const isOnline = netInfo.isConnected === true;

  useEffect(() => {
    loadSyncData();
  }, []);

  useEffect(() => {
    if (isOnline && config && pendingEvents.length > 0) {
      syncPendingEvents();
    }
  }, [isOnline, config, pendingEvents.length]);

  useEffect(() => {
    if (isOnline && config) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isOnline, config]);

  const loadSyncData = async () => {
    try {
      const storedEvents = await AsyncStorage.getItem(SYNC_EVENTS_KEY);
      const storedLastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      
      if (storedEvents) {
        const events = JSON.parse(storedEvents);
        setPendingEvents(events);
      }
      
      if (storedLastSync) {
        setLastSyncTime(JSON.parse(storedLastSync));
      }
    } catch (error) {
      console.error('Error loading sync data:', error);
    }
  };

  const connectWebSocket = () => {
    if (!config) return;

    try {
      const wsUrl = config.baseUrl.replace('http', 'ws') + '/ws';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWebsocket(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeUpdate(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWebsocket(null);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (isOnline && config) {
            connectWebSocket();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
    }
  };

  const disconnectWebSocket = () => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }
  };

  const handleRealtimeUpdate = (data: any) => {
    // This will be handled by individual components through event listeners
    console.log('Received realtime update:', data);
    
    // Emit a custom event that components can listen to
    DeviceEventEmitter.emit('trackeep:sync', data);
  };

  const addSyncEvent = async (event: Omit<SyncEvent, 'id' | 'timestamp' | 'synced'>) => {
    const syncEvent: SyncEvent = {
      ...event,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      synced: false,
    };

    const updatedEvents = [...pendingEvents, syncEvent];
    setPendingEvents(updatedEvents);
    
    try {
      await AsyncStorage.setItem(SYNC_EVENTS_KEY, JSON.stringify(updatedEvents));
      
      // Try to sync immediately if online
      if (isOnline && config) {
        await syncPendingEvents();
      }
    } catch (error) {
      console.error('Error saving sync event:', error);
    }
  };

  const syncPendingEvents = async () => {
    if (!config || isSyncing || pendingEvents.length === 0) return;

    setIsSyncing(true);
    
    try {
      const unsyncedEvents = pendingEvents.filter(event => !event.synced);
      const results = await Promise.allSettled(
        unsyncedEvents.map(event => syncSingleEvent(event))
      );

      const successfulEvents: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successfulEvents.push(unsyncedEvents[index].id);
        }
      });

      // Update pending events to mark successful ones as synced
      const updatedEvents = pendingEvents.map(event => ({
        ...event,
        synced: successfulEvents.includes(event.id),
      }));

      // Remove synced events after a delay
      const finalEvents = updatedEvents.filter(event => !event.synced);
      setPendingEvents(finalEvents);
      
      await AsyncStorage.setItem(SYNC_EVENTS_KEY, JSON.stringify(finalEvents));
      
      // Update last sync time
      const now = Date.now();
      setLastSyncTime(now);
      await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(now));

    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSingleEvent = async (event: SyncEvent): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('trackeep_auth_token');
      if (!token || !config) return false;

      const response = await fetch(`${config.baseUrl}/api/sync/${event.entityType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: event.type,
          id: event.entityId,
          data: event.data,
          timestamp: event.timestamp,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error syncing single event:', error);
      return false;
    }
  };

  const syncNow = async () => {
    await syncPendingEvents();
  };

  const clearPendingEvents = async () => {
    setPendingEvents([]);
    try {
      await AsyncStorage.removeItem(SYNC_EVENTS_KEY);
    } catch (error) {
      console.error('Error clearing pending events:', error);
    }
  };

  const value: RealtimeSyncContextType = {
    isOnline,
    isSyncing,
    pendingEvents,
    lastSyncTime,
    syncNow,
    addSyncEvent,
    clearPendingEvents,
  };

  return (
    <RealtimeSyncContext.Provider value={value}>
      {children}
    </RealtimeSyncContext.Provider>
  );
};

export const useRealtimeSync = (): RealtimeSyncContextType => {
  const context = useContext(RealtimeSyncContext);
  if (context === undefined) {
    throw new Error('useRealtimeSync must be used within a RealtimeSyncProvider');
  }
  return context;
};

// Hook for components to listen to realtime updates
export const useRealtimeUpdates = (callback: (data: any) => void) => {
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('trackeep:sync', callback);
    
    return () => {
      subscription.remove();
    };
  }, [callback]);
};
