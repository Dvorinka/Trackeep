declare module 'react-native-push-notification' {
  export interface PushNotificationPermissions {
    alert?: boolean;
    badge?: boolean;
    sound?: boolean;
  }

  export interface PushNotification {
    configure(options: {
      onRegister?: (token: any) => void;
      onNotification?: (notification: any) => void;
      permissions?: PushNotificationPermissions;
      popInitialNotification?: boolean;
      requestPermissions?: boolean;
    }): void;

    requestPermissions(callback?: (permissions: PushNotificationPermissions) => void): void;
    checkPermissions(callback?: (permissions: PushNotificationPermissions) => void): void;

    localNotification(details: {
      channelId?: string;
      id?: number;
      title?: string;
      message?: string;
      userInfo?: any;
      actions?: string[];
    }): void;

    localNotificationSchedule(details: {
      channelId?: string;
      id?: number;
      title?: string;
      message?: string;
      date: Date;
      userInfo?: any;
      actions?: string[];
      allowWhileIdle?: boolean;
    }): void;

    cancelLocalNotifications(details: { id: string }): void;
    cancelAllLocalNotifications(): void;

    createChannel(channelId: string, channelName: string, importance: number, callback?: (created: any) => void): void;
    createChannelImportance(channelId: string, channelName: string, importance: number, callback?: (created: any) => void): void;
  }

  const PushNotification: PushNotification;
  export default PushNotification;
}
