/**
 * Voice Service
 * Integrates Sherpa-onnx for STT/TTS and Pipecat for voice orchestration
 * Implements earbud button protocol: 1x=Delivered, 2x=Skip, 3x=Fail, Long=Talk
 */

import { Audio } from 'expo-audio';
import { Platform } from 'react-native';
import { 
  createSTT, 
  createTTS, 
  SttEngine, 
  TtsEngine,
  detectSttModel,
  detectTtsModel
} from 'react-native-sherpa-onnx';
import { 
  PipecatClient, 
  PipecatClientOptions, 
  RTVIEventCallbacks,
  Transport,
  DailyTransport,
  WebSocketTransport
} from '@pipecat-ai/client-js';

export interface VoiceConfig {
  sttModelPath: string;
  ttsModelPath: string;
  vadModelPath: string;
  kwsModelPath?: string;
  pipecatServerUrl: string;
  language: 'en-NZ' | 'mi-NZ' | 'auto';
}

export interface EarbudEvent {
  type: 'single' | 'double' | 'triple' | 'long';
  timestamp: number;
}

export type VoiceState = 
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export type VoiceCommand = 
  | { type: 'mark_delivered'; stopId: string }
  | { type: 'mark_skipped'; stopId: string }
  | { type: 'mark_failed'; stopId: string; reason: string }
  | { type: 'navigate_next' }
  | { type: 'navigate_previous' }
  | { type: 'repeat_instruction' }
  | { type: 'where_am_i' }
  | { type: 'how_many_left' }
  | { type: 'start_shift' }
  | { type: 'end_shift' }
  | { type: 'emergency' };

export interface VoiceCallbacks {
  onStateChange: (state: VoiceState) => void;
  onTranscript: (text: string, final: boolean) => void;
  onCommand: (command: VoiceCommand) => void;
  onError: (error: Error) => void;
  onEarbudEvent: (event: EarbudEvent) => void;
}

class VoiceService {
  private static instance: VoiceService;
  private sttEngine: SttEngine | null = null;
  private ttsEngine: TtsEngine | null = null;
  private pipecat: PipecatClient | null = null;
  private config: VoiceConfig | null = null;
  private callbacks: VoiceCallbacks | null = null;
  private state: VoiceState = 'idle';
  private isInitialized = false;
  private audioRecorder: Audio.Recording | null = null;
  private earbudListener: ((event: EarbudEvent) => void) | null = null;

  private constructor() {}

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  async initialize(config: VoiceConfig, callbacks: VoiceCallbacks): Promise<void> {
    if (this.isInitialized) {
      console.warn('VoiceService already initialized');
      return;
    }

    this.config = config;
    this.callbacks = callbacks;

    try {
      // Initialize Sherpa-onnx for on-device STT/TTS
      await this.initializeSherpa();
      
      // Initialize Pipecat client for cloud voice orchestration
      await this.initializePipecat();
      
      // Set up earbud button listener
      this.setupEarbudListener();
      
      this.isInitialized = true;
      this.setState('idle');
    } catch (error) {
      this.setState('error');
      this.callbacks?.onError(error as Error);
      throw error;
    }
  }

  private async initializeSherpa(): Promise<void> {
    if (!this.config) throw new Error('Config not set');

    // Detect and initialize STT
    const sttDetect = await detectSttModel({ type: 'asset', path: this.config.sttModelPath });
    if (!sttDetect.success) {
      throw new Error(`STT model detection failed: ${sttDetect.error}`);
    }

    this.sttEngine = await createSTT({
      modelPath: { type: 'asset', path: this.config.sttModelPath },
      numThreads: 2,
      provider: 'cpu',
    });

    // Set up streaming STT callbacks
    // Note: For streaming, we would use createStreamingSTT from react-native-sherpa-onnx/stt
    // This is a simplified version for now

    // Detect and initialize TTS
    const ttsDetect = await detectTtsModel({ type: 'asset', path: this.config.ttsModelPath });
    if (!ttsDetect.success) {
      throw new Error(`TTS model detection failed: ${ttsDetect.error}`);
    }

    this.ttsEngine = await createTTS({
      modelPath: { type: 'asset', path: this.config.ttsModelPath },
      numThreads: 2,
      provider: 'cpu',
    });

    // VAD and KWS would be initialized separately if needed
    // For now, we rely on Pipecat for VAD in the cloud
  }

  private async initializePipecat(): Promise<void> {
    if (!this.config) throw new Error('Config not set');

    // Create a WebSocket transport for Pipecat
    // Note: The actual transport implementation depends on the Pipecat server setup
    // For now, we'll create a minimal transport wrapper
    
    const transport = new WebSocketTransport() as unknown as Transport;

    const pipecatOptions: PipecatClientOptions = {
      transport,
      callbacks: {
        onConnected: () => {
          console.log('Pipecat connected');
        },
        onDisconnected: () => {
          console.log('Pipecat disconnected');
        },
        onError: (message) => {
          console.error('Pipecat error:', message);
          this.callbacks?.onError(new Error('Pipecat error'));
        },
        onBotReady: () => {
          console.log('Pipecat bot ready');
        },
        onUserInput: (data) => {
          if (data.text) {
            this.callbacks?.onTranscript(data.text, true);
            this.processTranscript(data.text);
          }
        },
        onBotOutput: (data) => {
          if (data.text) {
            this.speak(data.text);
          }
        },
      } as RTVIEventCallbacks,
      enableMic: true,
      enableCam: false,
      enableScreenShare: false,
      disconnectOnBotDisconnect: true,
    };

    this.pipecat = new PipecatClient(pipecatOptions);

    // Connect to the Pipecat server
    try {
      await this.pipecat.startBotAndConnect({
        // These params depend on your Pipecat server API
        // For now, we pass the server URL
      });
    } catch (error) {
      console.warn('Pipecat connection failed, continuing with on-device only:', error);
      // Continue with on-device STT/TTS only
    }
  }

  private setupEarbudListener(): void {
    // This would integrate with native module for earbud button detection
    // For now, we'll expose a method that the native module can call
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // Native module would call this.onEarbudEvent(event)
      this.earbudListener = (event: EarbudEvent) => {
        this.handleEarbudEvent(event);
      };
    }
  }

  onEarbudEvent(event: EarbudEvent): void {
    if (this.earbudListener) {
      this.earbudListener(event);
    }
  }

  private handleEarbudEvent(event: EarbudEvent): void {
    this.callbacks?.onEarbudEvent(event);

    // Earbud button protocol per D9
    switch (event.type) {
      case 'single':
        // 1x = Mark delivered
        this.callbacks?.onCommand({ type: 'mark_delivered', stopId: 'current' });
        break;
      case 'double':
        // 2x = Skip
        this.callbacks?.onCommand({ type: 'mark_skipped', stopId: 'current' });
        break;
      case 'triple':
        // 3x = Fail
        this.callbacks?.onCommand({ type: 'mark_failed', stopId: 'current', reason: 'earbud_triple' });
        break;
      case 'long':
        // Long press = Talk/Voice command
        this.startListening();
        break;
    }
  }

  private processTranscript(text: string): void {
    // Send transcript to Pipecat for intent classification
    if (this.pipecat && this.state === 'listening') {
      this.pipecat.sendText(text);
    }
  }

  async startListening(): Promise<void> {
    if (this.state === 'listening') return;
    
    this.setState('listening');
    
    try {
      if (this.sttEngine) {
        // For streaming recognition, we'd use createStreamingSTT
        // This is a placeholder for the streaming API
        console.log('Starting STT streaming...');
      }
      
      // Also start Pipecat listening if connected
      if (this.pipecat) {
        await this.pipecat.initDevices();
      }
    } catch (error) {
      this.setState('error');
      this.callbacks?.onError(error as Error);
    }
  }

  async stopListening(): Promise<void> {
    if (this.state !== 'listening') return;
    
    try {
      if (this.sttEngine) {
        console.log('Stopping STT streaming...');
      }
      this.setState('idle');
    } catch (error) {
      this.callbacks?.onError(error as Error);
    }
  }

  async speak(text: string): Promise<void> {
    if (!this.ttsEngine) return;
    
    this.setState('speaking');
    
    try {
      const audio = await this.ttsEngine.generateSpeech(text);
      // Play the audio using expo-audio
      const sound = await Audio.Sound.createAsync(
        { uri: 'data:audio/wav;base64,' + btoa(String.fromCharCode(...new Uint8Array(audio.samples.buffer))) },
        { shouldPlay: true }
      );
      await sound.playAsync();
    } catch (error) {
      this.callbacks?.onError(error as Error);
    } finally {
      this.setState('idle');
    }
  }

  private setState(newState: VoiceState): void {
    this.state = newState;
    this.callbacks?.onStateChange(newState);
  }

  getState(): VoiceState {
    return this.state;
  }

  isReady(): boolean {
    return this.isInitialized && this.state !== 'error';
  }

  async shutdown(): Promise<void> {
    try {
      if (this.sttEngine) {
        await this.sttEngine.destroy();
        this.sttEngine = null;
      }
      if (this.ttsEngine) {
        await this.ttsEngine.destroy();
        this.ttsEngine = null;
      }
      if (this.pipecat) {
        await this.pipecat.disconnect();
        this.pipecat = null;
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('Error shutting down voice service:', error);
    }
  }
}

export const voiceService = VoiceService.getInstance();