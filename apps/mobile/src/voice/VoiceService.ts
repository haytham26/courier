/**
 * Voice Service
 * Integrates Sherpa-onnx for STT/TTS and Pipecat for voice orchestration
 * Implements earbud button protocol: 1x=Delivered, 2x=Skip, 3x=Fail, Long=Talk
 */

import AudioModule, { AudioRecorder, AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { 
  createSTT, 
  createTTS, 
  SttEngine, 
  TtsEngine,
  detectSttModel,
  detectTtsModel
} from 'react-native-sherpa-onnx/stt';
import { 
  PipecatClient, 
  PipecatClientOptions, 
  RTVIEventCallbacks,
  Transport,
} from '@pipecat-ai/client-js';

// Minimal WebSocket transport implementation for Pipecat
class WebSocketTransport extends Transport {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: ((ev: any) => void) | null = null;

  constructor(options: { url: string }) {
    super();
    this.url = options.url;
  }

  initialize(options: PipecatClientOptions, messageHandler: (ev: any) => void): void {
    this.onMessageCallback = messageHandler;
  }

  async initDevices(): Promise<void> {
    // No-op for WebSocket transport
  }

  async connect(connectParams?: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.ws.onopen = () => {
          this._state = 'connected';
          resolve();
        };
        this.ws.onmessage = (event) => {
          if (this.onMessageCallback) {
            this.onMessageCallback(JSON.parse(event.data));
          }
        };
        this.ws.onerror = (error) => {
          this._state = 'error';
          reject(error);
        };
        this.ws.onclose = () => {
          this._state = 'disconnected';
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._state = 'disconnected';
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }
}

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
  private audioRecorder: AudioRecorder | null = null;
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
  }

  private async initializePipecat(): Promise<void> {
    if (!this.config) throw new Error('Config not set');

    // Create a WebSocket transport for Pipecat
    const transport = new WebSocketTransport({ url: this.config.pipecatServerUrl });

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
      await this.pipecat.connect();
    } catch (error) {
      console.warn('Pipecat connection failed, continuing with on-device only:', error);
    }
  }

  private setupEarbudListener(): void {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
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

    switch (event.type) {
      case 'single':
        this.callbacks?.onCommand({ type: 'mark_delivered', stopId: 'current' });
        break;
      case 'double':
        this.callbacks?.onCommand({ type: 'mark_skipped', stopId: 'current' });
        break;
      case 'triple':
        this.callbacks?.onCommand({ type: 'mark_failed', stopId: 'current', reason: 'earbud_triple' });
        break;
      case 'long':
        this.startListening();
        break;
    }
  }

  private processTranscript(text: string): void {
    if (this.pipecat && this.state === 'listening') {
      this.pipecat.sendText(text);
    }
  }

  async startListening(): Promise<void> {
    if (this.state === 'listening') return;
    
    this.setState('listening');
    
    try {
      // Start Pipecat listening if connected
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
      const player = new AudioPlayer({
        source: { uri: `data:audio/wav;base64,${btoa(String.fromCharCode(...new Uint8Array(audio.samples.buffer)))}` },
        updateInterval: 100,
      });
      await player.play();
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