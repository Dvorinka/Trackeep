import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Switch, Text, Card, Title, Button } from 'react-native-paper';
import { useAuth } from '../services/AuthContext';
import { useOffline } from '../services/OfflineContext';
import { useNotifications } from '../services/NotificationContext';
import { useCamera } from '../services/CameraContext';
import { useVoice } from '../services/VoiceContext';

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { isOnline, syncNow } = useOffline();
  const { hasPermission: hasNotificationPermission, requestPermission: requestNotificationPermission } = useNotifications();
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission, scanDocument } = useCamera();
  const { hasPermission: hasVoicePermission, requestPermission: requestVoicePermission, isRecording, startRecording, stopRecording } = useVoice();
  
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [autoSync, setAutoSync] = React.useState(true);

  const handleLogout = async () => {
    await logout();
  };

  const handleNotificationPermission = async () => {
    if (!hasNotificationPermission) {
      const granted = await requestNotificationPermission();
      if (granted) {
        Alert.alert('Success', 'Notification permission granted!');
      } else {
        Alert.alert('Permission Denied', 'Notification permission is required for reminders');
      }
    }
  };

  const handleCameraPermission = async () => {
    if (!hasCameraPermission) {
      const granted = await requestCameraPermission();
      if (granted) {
        Alert.alert('Success', 'Camera permission granted!');
      } else {
        Alert.alert('Permission Denied', 'Camera permission is required for document scanning');
      }
    }
  };

  const handleVoicePermission = async () => {
    if (!hasVoicePermission) {
      const granted = await requestVoicePermission();
      if (granted) {
        Alert.alert('Success', 'Microphone permission granted!');
      } else {
        Alert.alert('Permission Denied', 'Microphone permission is required for voice recording');
      }
    }
  };

  const handleTestNotification = () => {
    // This would use the notification service to show a test notification
    Alert.alert('Test Notification', 'This is a test notification!');
  };

  const handleTestCamera = async () => {
    try {
      const result = await scanDocument();
      if (result) {
        Alert.alert('Success', 'Document scanned successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan document');
    }
  };

  const handleTestVoice = async () => {
    if (isRecording) {
      const recording = await stopRecording();
      if (recording) {
        Alert.alert('Success', `Voice recorded! Duration: ${recording.duration}s`);
      }
    } else {
      startRecording();
      Alert.alert('Recording', 'Voice recording started...');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Account</Title>
            <Text style={styles.userInfo}>
              {user?.name} ({user?.email})
            </Text>
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Preferences</Title>
            
            <List.Item
              title="Push Notifications"
              description="Receive notifications for tasks and reminders"
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                />
              )}
            />

            <List.Item
              title="Dark Mode"
              description="Use dark theme"
              right={() => (
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                />
              )}
            />

            <List.Item
              title="Auto Sync"
              description="Automatically sync when online"
              right={() => (
                <Switch
                  value={autoSync}
                  onValueChange={setAutoSync}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>📱 Mobile Features</Title>
            
            <List.Item
              title="Push Notifications"
              description={hasNotificationPermission ? "Permission granted" : "Permission required"}
              left={() => <Text style={styles.featureIcon}>🔔</Text>}
              right={() => (
                <View style={styles.featureActions}>
                  {!hasNotificationPermission && (
                    <Button
                      mode="outlined"
                      onPress={handleNotificationPermission}
                      compact
                    >
                      Enable
                    </Button>
                  )}
                  {hasNotificationPermission && (
                    <Button
                      mode="text"
                      onPress={handleTestNotification}
                      compact
                    >
                      Test
                    </Button>
                  )}
                </View>
              )}
            />

            <List.Item
              title="Camera & Document Scanning"
              description={hasCameraPermission ? "Permission granted" : "Permission required"}
              left={() => <Text style={styles.featureIcon}>📸</Text>}
              right={() => (
                <View style={styles.featureActions}>
                  {!hasCameraPermission && (
                    <Button
                      mode="outlined"
                      onPress={handleCameraPermission}
                      compact
                    >
                      Enable
                    </Button>
                  )}
                  {hasCameraPermission && (
                    <Button
                      mode="text"
                      onPress={handleTestCamera}
                      compact
                    >
                      Test
                    </Button>
                  )}
                </View>
              )}
            />

            <List.Item
              title="Voice Recording"
              description={hasVoicePermission ? "Permission granted" : "Permission required"}
              left={() => <Text style={styles.featureIcon}>🎤</Text>}
              right={() => (
                <View style={styles.featureActions}>
                  {!hasVoicePermission && (
                    <Button
                      mode="outlined"
                      onPress={handleVoicePermission}
                      compact
                    >
                      Enable
                    </Button>
                  )}
                  {hasVoicePermission && (
                    <Button
                      mode={isRecording ? "contained" : "text"}
                      onPress={handleTestVoice}
                      compact
                    >
                      {isRecording ? "Stop" : "Test"}
                    </Button>
                  )}
                </View>
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Sync Status</Title>
            
            <List.Item
              title="Connection"
              description={isOnline ? 'Connected' : 'Offline'}
              left={() => (
                <Text style={styles.statusIcon}>
                  {isOnline ? '🟢' : '🔴'}
                </Text>
              )}
            />

            <Button
              mode="outlined"
              onPress={syncNow}
              disabled={!isOnline}
              style={styles.syncButton}
            >
              Sync Now
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>About</Title>
            
            <List.Item
              title="Version"
              description="1.0.0"
            />

            <List.Item
              title="Build"
              description="React Native Mobile App"
            />

            <List.Item
              title="GitHub"
              description="View source code"
              onPress={() => console.log('Open GitHub')}
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 16,
    color: '#666',
  },
  logoutButton: {
    marginTop: 8,
  },
  statusIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  syncButton: {
    marginTop: 8,
  },
  featureIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  featureActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SettingsScreen;
