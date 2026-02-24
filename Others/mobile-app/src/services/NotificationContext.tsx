import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import PushNotification from 'react-native-push-notification';
import { Platform, Alert } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

interface Notification {
  id: string;
  title: string;
  message: string;
  date?: Date;
  userInfo?: any;
}

interface NotificationContextType {
  isInitialized: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  scheduleNotification: (notification: Notification) => void;
  cancelNotification: (id: string) => void;
  cancelAllNotifications: () => void;
  showLocalNotification: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = () => {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('Push notification token:', token);
        // TODO: Send token to backend for server-side notifications
      },

      onNotification: (notification) => {
        console.log('Notification received:', notification);
        
        if (notification.userInteraction) {
          // User tapped on notification
          handleNotificationPress(notification);
        }
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    PushNotification.createChannel(
      'trackeep-tasks',
      'Task Reminders',
      4,
      (created: any) => console.log('Task channel created:', created)
    );

    PushNotification.createChannel(
      'trackeep-general',
      'General Notifications',
      3,
      (created: any) => console.log('General channel created:', created)
    );

    checkPermission();
    setIsInitialized(true);
  };

  const checkPermission = async () => {
    if (Platform.OS === 'ios') {
      PushNotification.checkPermissions((permissions) => {
        setHasPermission(Boolean(permissions.alert || permissions.badge || permissions.sound));
      });
    } else {
      const permission = PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
      const result = await request(permission);
      setHasPermission(result === RESULTS.GRANTED);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS === 'ios') {
        PushNotification.requestPermissions((permissions: any) => {
          const granted = permissions.alert || permissions.badge || permissions.sound;
          setHasPermission(granted);
          resolve(granted);
        });
      } else {
        request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS).then((result) => {
          const granted = result === RESULTS.GRANTED;
          setHasPermission(granted);
          resolve(granted);
        });
      }
    });
  };

  const scheduleNotification = (notification: Notification) => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please enable notifications to receive reminders.');
      return;
    }

    PushNotification.localNotificationSchedule({
      channelId: 'trackeep-tasks',
      id: parseInt(notification.id),
      title: notification.title,
      message: notification.message,
      date: notification.date || new Date(),
      allowWhileIdle: true,
      userInfo: notification.userInfo,
      actions: ['View', 'Dismiss'],
    });
  };

  const cancelNotification = (id: string) => {
    PushNotification.cancelLocalNotifications({ id: id.toString() });
  };

  const cancelAllNotifications = () => {
    PushNotification.cancelAllLocalNotifications();
  };

  const showLocalNotification = (title: string, message: string) => {
    PushNotification.localNotification({
      channelId: 'trackeep-general',
      title,
      message,
      actions: ['View', 'Dismiss'],
    });
  };

  const handleNotificationPress = (notification: any) => {
    // TODO: Navigate to relevant screen based on notification data
    console.log('Notification pressed:', notification);
  };

  const value: NotificationContextType = {
    isInitialized,
    hasPermission,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    showLocalNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
