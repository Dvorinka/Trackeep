import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Alert, Platform } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

interface CameraContextType {
  hasPermission: boolean;
  devices: any;
  isActive: boolean;
  requestPermission: () => Promise<boolean>;
  startCamera: () => void;
  stopCamera: () => void;
  capturePhoto: () => Promise<string | null>;
  scanDocument: () => Promise<string | null>;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

interface CameraProviderProps {
  children: ReactNode;
}

export const CameraProvider: React.FC<CameraProviderProps> = ({ children }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const permission = Platform.OS === 'ios' 
      ? PERMISSIONS.IOS.CAMERA 
      : PERMISSIONS.ANDROID.CAMERA;
    
    const result = await request(permission);
    setHasPermission(result === RESULTS.GRANTED);
  };

  const requestPermission = async (): Promise<boolean> => {
    const permission = Platform.OS === 'ios' 
      ? PERMISSIONS.IOS.CAMERA 
      : PERMISSIONS.ANDROID.CAMERA;
    
    const result = await request(permission);
    const granted = result === RESULTS.GRANTED;
    setHasPermission(granted);
    return granted;
  };

  const startCamera = () => {
    if (hasPermission && device) {
      setIsActive(true);
    } else {
      Alert.alert('Camera Error', 'Camera permission is required or no camera available');
    }
  };

  const stopCamera = () => {
    setIsActive(false);
  };

  const capturePhoto = async (): Promise<string | null> => {
    if (!device || !isActive) {
      Alert.alert('Camera Error', 'Camera is not active');
      return null;
    }

    try {
      // This would need to be implemented with actual camera capture logic
      // For now, return a placeholder
      const photo = 'captured-photo-path';
      return photo;
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
      return null;
    }
  };

  const scanDocument = async (): Promise<string | null> => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera access is required for document scanning');
        return null;
      }
    }

    try {
      // Start camera for document scanning
      startCamera();
      
      // This would integrate with a document scanning library
      // For now, return a placeholder
      const scannedDocument = 'scanned-document-path';
      
      // Stop camera after scanning
      stopCamera();
      
      return scannedDocument;
    } catch (error) {
      console.error('Error scanning document:', error);
      Alert.alert('Error', 'Failed to scan document');
      stopCamera();
      return null;
    }
  };

  const value: CameraContextType = {
    hasPermission,
    devices,
    isActive,
    requestPermission,
    startCamera,
    stopCamera,
    capturePhoto,
    scanDocument,
  };

  return (
    <CameraContext.Provider value={value}>
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = (): CameraContextType => {
  const context = useContext(CameraContext);
  if (context === undefined) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
};
