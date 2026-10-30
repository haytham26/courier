/**
 * Voice Service
 * Integrates Sherpa-onnx for STT/TTS and Pipecat for voice orchestration
 * Implements earbud button protocol: 1x=Delivered, 2x=Skip, 3x=Fail, Long=Talk
 */

import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import type { 
  SttEngine} from 'react-native-sherpa-onnx/stt';
import { 
  createSTT,
  detectSttModel
} from 'react-native-sherpa-onnx/stt';
import type { 
  TtsEngine,
  GeneratedAudio
} from 'react-native-sherpa-onnx/tts';
import { 
  createTTS,
  detectTtsModel
} from 'react-native-sherpa-onnx/tts';

import type { MapViewMode } from '@/maps/viewModes';
import { publishVoiceCommand } from './commandChannel';

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

/**
 * The command catalogue.
 *
 * Every command the app understands is in this list. The map commands are the
 * ones MASTER_EXECUTION §11 asks for: the courier can pick the map mode and
 * move the camera by voice, and the map screen listens on the voice channel
 * (`commandChannel.ts`).
 *
 * The catalogue grew with Courier Voice: the service speaks the names of the
 * product's tools, and the app has a command for each of them, so a sentence
 * the service understands does something on the phone.
 */
export type VoiceCommand =
  | {
      type: 'mark_delivered';
      stopId: string;
      /**
       * Where the courier said the parcel was left, in their own words.
       *
       * BUG-073 (the C1 audit): the offline parser used to capture the place
       * and throw it away, and the Courier Voice client dropped it a second
       * time on the way out, so a delivery reached the server with nowhere
       * recorded. A courier's spoken placement is the whole value of saying
       * it aloud - the next person who looks for the parcel has nothing else
       * to go on.
       */
      safePlace?: string;
    }
  | { type: 'mark_skipped'; stopId: string }
  | { type: 'mark_failed'; stopId: string; reason: string }
  | { type: 'add_stop'; rawAddress: string }
  | { type: 'start_break'; minutes: number | null }
  | { type: 'end_break' }
  | { type: 'add_location_note'; kind: string; text: string }
  | { type: 'navigate_next' }
  | { type: 'navigate_previous' }
  | { type: 'repeat_instruction' }
  | { type: 'where_am_i' }
  | { type: 'how_many_left' }
  | { type: 'start_shift' }
  | { type: 'end_shift' }
  | { type: 'emergency' }
  | { type: 'set_map_mode'; mode: MapViewMode }
  | { type: 'zoom_to_next_stop' }
  | { type: 'tilt_map'; on: boolean }
  | { type: 'follow_me'; on: boolean }
  | { type: 'look_back' }
  | { type: 'reset_camera' }
  | { type: 'set_quiet_mode'; on: boolean }
  | { type: 'set_verbosity'; verbosity: string };

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
  private config: VoiceConfig | null = null;
  private callbacks: VoiceCallbacks | null = null;
  private state: VoiceState = 'idle';
  private isInitialized = false;
  private audioPlayer: AudioPlayer | null = null;
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

    // Initialize audio player for TTS playback
    this.audioPlayer = createAudioPlayer();
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

  /**
   * Hands a command to the app.
   *
   * The command goes on the voice channel as well, so a screen that only
   * wants to hear the map commands does not have to hold the voice engine.
   */
  private emitCommand(command: VoiceCommand): void {
    publishVoiceCommand(command);
    this.callbacks?.onCommand(command);
  }

  private handleEarbudEvent(event: EarbudEvent): void {
    this.callbacks?.onEarbudEvent(event);

    switch (event.type) {
      case 'single':
        this.emitCommand({ type: 'mark_delivered', stopId: 'current' });
        break;
      case 'double':
        this.emitCommand({ type: 'mark_skipped', stopId: 'current' });
        break;
      case 'triple':
        this.emitCommand({ type: 'mark_failed', stopId: 'current', reason: 'earbud_triple' });
        break;
      case 'long':
        void this.startListening();
        break;
    }
  }

  startListening(): Promise<void> {
    if (this.state === 'listening') return Promise.resolve();

    this.setState('listening');

    // TODO: Start STT streaming when sherpa-onnx streaming API is available
    return Promise.resolve();
  }

  stopListening(): Promise<void> {
    if (this.state !== 'listening') return Promise.resolve();

    try {
      this.setState('idle');
    } catch (error) {
      this.callbacks?.onError(error as Error);
    }
    return Promise.resolve();
  }

  async speak(text: string): Promise<void> {
    if (!this.ttsEngine || !this.audioPlayer) return;
    
    this.setState('speaking');
    
    try {
      const audio: GeneratedAudio = await this.ttsEngine.generateSpeech(text);
      
      // Convert float samples to WAV format and play
      // For now, we'll use a simple approach - in production, use proper WAV encoding
      const wavData = this.floatArrayToWav(audio.samples, audio.sampleRate);
      const base64Audio = btoa(String.fromCharCode(...wavData));
      const dataUri = `data:audio/wav;base64,${base64Audio}`;
      
      this.audioPlayer.replace(dataUri);
      this.audioPlayer.play();
    } catch (error) {
      this.callbacks?.onError(error as Error);
    } finally {
      // Wait for playback to finish before returning to idle
      // In a real implementation, we'd listen for onPlaybackStatusUpdate
      this.setState('idle');
    }
  }

  /**
   * Convert float32 array to WAV format (Uint8Array)
   */
  private floatArrayToWav(samples: number[], sampleRate: number): Uint8Array {
    // Create WAV header (44 bytes)
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    // RIFF header
    view.setUint32(0, 0x52494646, false); // 'RIFF'
    view.setUint32(4, 36 + samples.length * 2, true); // file size - 8
    view.setUint32(8, 0x57415645, false); // 'WAVE'
    
    // fmt chunk
    view.setUint32(12, 0x666d7420, false); // 'fmt '
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, 1, true); // num channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // data chunk
    view.setUint32(36, 0x64617461, false); // 'data'
    view.setUint32(40, samples.length * 2, true); // data size
    
    // Write samples as 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i])); // clamp to [-1, 1]
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Uint8Array(buffer);
  }

  async transcribeFile(filePath: string): Promise<string> {
    if (!this.sttEngine) throw new Error('STT not initialized');
    
    const result = await this.sttEngine.transcribeFile(filePath);
    return result.text;
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
      if (this.audioPlayer) {
        this.audioPlayer.release();
        this.audioPlayer = null;
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('Error shutting down voice service:', error);
    }
  }
}

export const voiceService = VoiceService.getInstance();