import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  FAB,
  IconButton,
  Avatar,
  Chip,
  Divider,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRealtimeUpdates } from '../services/RealtimeSyncContext';
import { useServerConfig } from '../services/ServerConfigContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'recommendation' | 'analysis';
}

const AIAssistantScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { config } = useServerConfig();
  
  const [suggestions] = useState([
    'Help me organize my tasks',
    'Suggest bookmarks for learning React',
    'Analyze my productivity patterns',
    'Create a study plan',
  ]);

  useEffect(() => {
    // Initialize with welcome message
    setMessages([
      {
        id: '1',
        text: "Hello! I'm your AI assistant. I can help you organize tasks, suggest bookmarks, analyze your productivity, and much more. How can I assist you today?",
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
      },
    ]);
  }, []);

  // Listen for real-time AI updates
  useRealtimeUpdates((data) => {
    if (data.type === 'ai_response') {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: data.response,
        sender: 'ai',
        timestamp: new Date(),
        type: data.responseType,
      };
      setMessages(prev => [...prev, newMessage]);
      setIsLoading(false);
    }
  });

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Call LongCat AI API
      const response = await fetch(`${config?.baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          message: inputText,
          context: 'trackeep_assistant',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'ai',
          timestamp: new Date(),
          type: data.type || 'text',
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Fallback to mock response
        const mockResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: generateMockResponse(inputText),
          sender: 'ai',
          timestamp: new Date(),
          type: 'text',
        };
        setMessages(prev => [...prev, mockResponse]);
      }
    } catch (error) {
      console.error('Error calling AI API:', error);
      // Fallback to mock response
      const mockResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateMockResponse(inputText),
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages(prev => [...prev, mockResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const authData = await AsyncStorage.getItem('trackeep_auth_token');
      return authData;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const generateMockResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('task') || input.includes('organize')) {
      return "I can help you organize your tasks! Based on your current tasks, I suggest prioritizing the high-priority items first. Would you like me to create a schedule for you?";
    } else if (input.includes('bookmark') || input.includes('learn')) {
      return "Great! I can suggest relevant bookmarks for your learning goals. I see you're interested in React - here are some top resources I recommend...";
    } else if (input.includes('productivity') || input.includes('analyze')) {
      return "Looking at your activity patterns, you're most productive in the morning. I suggest scheduling important tasks between 9-11 AM for better results.";
    } else if (input.includes('study') || input.includes('plan')) {
      return "I can create a personalized study plan for you! Based on your current notes and bookmarks, here's a structured learning path...";
    } else {
      return "I understand you need help with that. Let me analyze your current data and provide you with personalized recommendations.";
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => (
    <View key={message.id} style={[
      styles.messageContainer,
      message.sender === 'user' ? styles.userMessage : styles.aiMessage,
    ]}>
      {message.sender === 'ai' && (
        <Avatar.Text
          size={32}
          label="AI"
          style={styles.avatar}
        />
      )}
      <View style={[
        styles.messageBubble,
        message.sender === 'user' ? styles.userBubble : styles.aiBubble,
      ]}>
        <Text style={[
          styles.messageText,
          message.sender === 'user' ? styles.userText : styles.aiText,
        ]}>
          {message.text}
        </Text>
        <Text style={styles.timestamp}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
      {message.sender === 'user' && (
        <Avatar.Text
          size={32}
          label="U"
          style={styles.avatar}
        />
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Title style={styles.title}>AI Assistant</Title>
        <Paragraph style={styles.subtitle}>
          Your personal productivity companion
        </Paragraph>
      </View>

      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map(renderMessage)}
        
        {isLoading && (
          <View style={[styles.messageContainer, styles.aiMessage]}>
            <Avatar.Text
              size={32}
              label="AI"
              style={styles.avatar}
            />
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <Text style={styles.aiText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggestions */}
      {messages.length === 1 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Try asking:</Text>
          <View style={styles.suggestionsList}>
            {suggestions.map((suggestion, index) => (
              <Chip
                key={index}
                onPress={() => handleSuggestionPress(suggestion)}
                style={styles.suggestionChip}
                textStyle={styles.suggestionText}
              >
                {suggestion}
              </Chip>
            ))}
          </View>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything..."
          multiline
          maxLength={500}
          style={styles.textInput}
          right={
            <TextInput.Icon
              icon="send"
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            />
          }
        />
        <Button
          mode="contained"
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isLoading}
          loading={isLoading}
          style={styles.sendButton}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginHorizontal: 8,
    backgroundColor: '#6200ee',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
    minHeight: 40,
  },
  userBubble: {
    backgroundColor: '#6200ee',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  suggestionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 12,
    color: '#333',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    backgroundColor: '#6200ee',
  },
});

export default AIAssistantScreen;
