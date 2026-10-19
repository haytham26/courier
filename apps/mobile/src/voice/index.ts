/**
 * Voice Module Index
 * Exports all voice-related functionality
 */

export * from './VoiceService';
export * from './EarbudButtonModule';
export * from './useVoice';
export * from './WhisperGeofence';
export * from './VoiceButton';

// Re-export EarbudEvent from VoiceService to avoid duplicate export
export type { EarbudEvent } from './VoiceService';