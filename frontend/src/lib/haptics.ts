import { createSignal, onMount } from 'solid-js';

// Haptic feedback patterns for different interactions
export type HapticPattern = 
  | "success"      // Successful action completion
  | "error"        // Error or failure
  | "warning"      // Warning or caution
  | "notification" // New message or notification
  | "selection"    // Item selection
  | "navigation"   // Page navigation
  | "impact"       // Light impact for button clicks
  | "completion"   // Task or form completion
  | "delete"       // Delete or destructive action
  | "longPress"    // Long press gesture;

// Check if haptics/vibration is supported
const isSupported = () => {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator;
};

// Vibration patterns for different haptic types
const vibrationPatterns: Record<HapticPattern, number[]> = {
  success: [10, 50, 10],
  error: [100, 50, 100],
  warning: [50, 30, 50],
  notification: [20, 100, 20],
  selection: [10],
  navigation: [15],
  impact: [5],
  completion: [10, 30, 10, 30, 10],
  delete: [100],
  longPress: [50],
};

// Haptic feedback utility hook for SolidJS
export const useHaptics = () => {
  const [isSupported, setIsSupported] = createSignal(false);

  onMount(() => {
    setIsSupported(isSupported());
  });

  // Trigger haptic feedback with fallback for non-supported devices
  const triggerHaptic = (pattern: HapticPattern) => {
    if (isSupported() && navigator.vibrate) {
      try {
        navigator.vibrate(vibrationPatterns[pattern] || [10]);
      } catch (error) {
        console.debug("Haptics failed:", error);
      }
    }
  };

  // Specific haptic methods for common actions
  const haptics = {
    // Success feedback for completed actions
    success: () => triggerHaptic("success"),
    
    // Error feedback for failed actions
    error: () => triggerHaptic("error"),
    
    // Warning feedback for caution states
    warning: () => triggerHaptic("warning"),
    
    // New notification or message
    notification: () => triggerHaptic("notification"),
    
    // Item selection (checkboxes, radio buttons, etc.)
    selection: () => triggerHaptic("selection"),
    
    // Navigation between pages or sections
    navigation: () => triggerHaptic("navigation"),
    
    // Light impact for button clicks
    impact: () => triggerHaptic("impact"),
    
    // Task or form completion
    completion: () => triggerHaptic("completion"),
    
    // Delete or destructive actions
    delete: () => triggerHaptic("delete"),
    
    // Long press gestures
    longPress: () => triggerHaptic("longPress"),
  };

  return haptics;
};

// Utility function for direct haptic triggering (outside of components)
export const triggerHaptic = (pattern: HapticPattern) => {
  if (isSupported() && navigator.vibrate) {
    try {
      navigator.vibrate(vibrationPatterns[pattern] || [10]);
    } catch (error) {
      console.debug("Haptics failed:", error);
    }
  }
};
