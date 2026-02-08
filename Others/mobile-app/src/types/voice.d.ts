declare module 'react-native-voice' {
  export interface VoiceResults {
    value?: string[];
    error?: boolean;
    isFinal?: boolean;
  }

  export default class Voice {
    static isAvailable(): Promise<boolean>;
    static start(locale?: string): Promise<void>;
    static stop(): Promise<void>;
    static destroy(): Promise<void>;
    static onSpeechStart?: (e: any) => void;
    static onSpeechEnd?: (e: any) => void;
    static onSpeechResults?: (e: VoiceResults) => void;
    static onSpeechError?: (e: any) => void;
  }
}
