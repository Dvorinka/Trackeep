import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  ActivityIndicator,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useServerConfig } from '../services/ServerConfigContext';
import { updateAPIBaseURL } from '../services/api';
import { useNavigation } from '@react-navigation/native';

interface ServerConfig {
  baseUrl: string;
  username: string;
  password: string;
}

const ServerSetupScreen: React.FC = () => {
  const [config, setConfig] = useState<ServerConfig>({
    baseUrl: '',
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ServerConfig>>({});
  
  const { setConfig: saveConfig } = useServerConfig();
  const navigation = useNavigation();

  const validateConfig = (): boolean => {
    const newErrors: Partial<ServerConfig> = {};

    if (!config.baseUrl.trim()) {
      newErrors.baseUrl = 'Server URL is required';
    } else if (!isValidUrl(config.baseUrl)) {
      newErrors.baseUrl = 'Please enter a valid URL (e.g., https://your-server.com)';
    }

    if (!config.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!config.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const testConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${config.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  const handleTestConnection = async () => {
    if (!config.baseUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL first');
      return;
    }

    setIsLoading(true);
    try {
      const isConnected = await testConnection();
      if (isConnected) {
        Alert.alert('Success', 'Connection to server successful!');
      } else {
        Alert.alert(
          'Connection Failed',
          'Could not connect to the server. Please check the URL and ensure the server is running.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test connection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    if (!validateConfig()) {
      return;
    }

    setIsLoading(true);
    try {
      const isConnected = await testConnection();
      if (!isConnected) {
        Alert.alert(
          'Connection Failed',
          'Could not connect to the server. Please check the URL and try again.'
        );
        return;
      }

      // Test authentication
      const authResponse = await fetch(`${config.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: config.username,
          password: config.password,
        }),
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.token) {
          await saveConfig(config);
          updateAPIBaseURL(`${config.baseUrl}/api`);
          Alert.alert('Success', 'Server configuration completed successfully!');
          // Navigation will be handled automatically by the AppNavigator
        } else {
          Alert.alert('Authentication Failed', 'Invalid username or password.');
        }
      } else {
        Alert.alert('Authentication Failed', 'Invalid username or password.');
      }
    } catch (error) {
      Alert.alert('Setup Failed', 'An error occurred during setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Welcome to Trackeep</Title>
              <Paragraph style={styles.subtitle}>
                Connect to your Trackeep server to get started
              </Paragraph>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Server Configuration</Title>
              
              <TextInput
                label="Server URL"
                value={config.baseUrl}
                onChangeText={(text) => setConfig({ ...config, baseUrl: text })}
                placeholder="https://your-server.com"
                autoCapitalize="none"
                keyboardType="url"
                style={styles.input}
                error={!!errors.baseUrl}
              />
              <HelperText type="error" visible={!!errors.baseUrl}>
                {errors.baseUrl}
              </HelperText>

              <TextInput
                label="Username"
                value={config.username}
                onChangeText={(text) => setConfig({ ...config, username: text })}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                error={!!errors.username}
              />
              <HelperText type="error" visible={!!errors.username}>
                {errors.username}
              </HelperText>

              <TextInput
                label="Password"
                value={config.password}
                onChangeText={(text) => setConfig({ ...config, password: text })}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                error={!!errors.password}
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>

              <Button
                mode="outlined"
                onPress={handleTestConnection}
                disabled={isLoading || !config.baseUrl.trim()}
                style={styles.testButton}
                loading={isLoading}
              >
                Test Connection
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.infoCard}>
            <Card.Content>
              <Title style={styles.cardTitle}>Need Help?</Title>
              <Paragraph style={styles.infoText}>
                • Enter the full URL of your Trackeep server
              </Paragraph>
              <Paragraph style={styles.infoText}>
                • Use your existing Trackeep account credentials
              </Paragraph>
              <Paragraph style={styles.infoText}>
                • Make sure your server is accessible from this device
              </Paragraph>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleSetup}
            disabled={isLoading}
            loading={isLoading}
            style={styles.setupButton}
            contentStyle={styles.setupButtonContent}
          >
            Complete Setup
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  infoCard: {
    marginBottom: 24,
    backgroundColor: '#e3f2fd',
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 16,
    color: '#333',
  },
  input: {
    marginBottom: 8,
  },
  testButton: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  setupButton: {
    backgroundColor: '#6200ee',
  },
  setupButtonContent: {
    paddingVertical: 8,
  },
});

export default ServerSetupScreen;
