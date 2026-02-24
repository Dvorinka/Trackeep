import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Voice from 'react-native-voice';

interface VoiceRecording {
  id: string;
  path: string;
  duration: number;
  transcript?: string;
  createdAt: Date;
}

interface VoiceContextType {
  isRecording: boolean;
  isProcessing: boolean;
  hasPermission: boolean;
  recordings: VoiceRecording[];
  requestPermission: () => Promise<boolean>;
  startRecording: () => void;
  stopRecording: () => Promise<VoiceRecording | null>;
  transcribeRecording: (recordingPath: string) => Promise<string | null>;
  deleteRecording: (id: string) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

interface VoiceProviderProps {
  children: ReactNode;
}

export const VoiceProvider: React.FC<VoiceProviderProps> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);

  useEffect(() => {
    initializeVoice();
    return () => {
      Voice.destroy();
    };
  }, []);

  const initializeVoice = async () => {
    await checkPermission();
    
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
  };

  const checkPermission = async () => {
    const permission = Platform.OS === 'ios' 
      ? PERMISSIONS.IOS.MICROPHONE 
      : PERMISSIONS.ANDROID.RECORD_AUDIO;
    
    const result = await request(permission);
    setHasPermission(result === RESULTS.GRANTED);
  };

  const requestPermission = async (): Promise<boolean> => {
    const permission = Platform.OS === 'ios' 
      ? PERMISSIONS.IOS.MICROPHONE 
      : PERMISSIONS.ANDROID.RECORD_AUDIO;
    
    const result = await request(permission);
    const granted = result === RESULTS.GRANTED;
    setHasPermission(granted);
    return granted;
  };

  const onSpeechStart = () => {
    setIsRecording(true);
    setRecordingStartTime(new Date());
  };

  const onSpeechEnd = () => {
    setIsRecording(false);
    setRecordingStartTime(null);
  };

  const onSpeechResults = (e: any) => {
    // Handle speech recognition results
    console.log('Speech results:', e.value);
  };

  const onSpeechError = (e: any) => {
    console.error('Speech recognition error:', e);
    setIsRecording(false);
    setRecordingStartTime(null);
    Alert.alert('Recording Error', 'Failed to process voice recording');
  };

  const startRecording = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is required for voice recording');
        return;
      }
    }

    try {
      setIsProcessing(true);
      
      // Start speech recognition
      await Voice.start('en-US');
      
      // For actual audio recording, you would integrate with a library like react-native-audio-recorder-player
      // This is a placeholder for the recording functionality
      
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsProcessing(false);
    }
  };

  const stopRecording = async (): Promise<VoiceRecording | null> => {
    if (!isRecording) {
      return null;
    }

    try {
      setIsProcessing(true);
      
      // Stop speech recognition
      await Voice.stop();
      
      // Calculate duration
      const duration = recordingStartTime 
        ? Math.floor((new Date().getTime() - recordingStartTime.getTime()) / 1000)
        : 0;
      
      // Create recording object (placeholder - actual implementation would save audio file)
      const recording: VoiceRecording = {
        id: Date.now().toString(),
        path: `recording-${Date.now()}.m4a`,
        duration,
        createdAt: new Date(),
      };
      
      setRecordings(prev => [...prev, recording]);
      setIsProcessing(false);
      
      return recording;
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsProcessing(false);
      return null;
    }
  };

  const transcribeRecording = async (recordingPath: string): Promise<string | null> => {
    try {
      setIsProcessing(true);
      
      // Start speech recognition for transcription
      await Voice.start('en-US');
      
      // This would integrate with a speech-to-text service
      // For now, return a placeholder
      const transcript = "Transcribed text from audio recording";
      
      await Voice.stop();
      setIsProcessing(false);
      
      return transcript;
    } catch (error) {
      console.error('Error transcribing recording:', error);
      setIsProcessing(false);
      return null;
    }
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(rec => rec.id !== id));
  };

  const value: VoiceContextType = {
    isRecording,
    isProcessing,
    hasPermission,
    recordings,
    requestPermission,
    startRecording,
    stopRecording,
    transcribeRecording,
    deleteRecording,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
