/**
 * Whisper Geofence Service
 * Automatically triggers audio whispers at 150m and 30m from stops
 * Implements the "Whisper" approach from the requirements
 */

import { Location, haversineDistance } from '@courier/shared/utils';

export interface GeofenceConfig {
  outerRadius: number; // 150m - first whisper
  innerRadius: number; // 30m - second whisper
  enabled: boolean;
}

export interface StopWithLocation {
  id: string;
  location_id: string;
  address: {
    street: string;
    suburb: string;
    number: string;
  };
  geocode_point?: Location;
  park_point?: Location;
  entry_point?: Location;
  sequence: number;
}

export interface WhisperMessage {
  stopId: string;
  stopSequence: number;
  distance: number;
  message: string;
  type: 'outer' | 'inner';
}

type WhisperCallback = (message: WhisperMessage) => void;

class WhisperGeofenceService {
  private static instance: WhisperGeofenceService;
  private config: GeofenceConfig = {
    outerRadius: 150,
    innerRadius: 30,
    enabled: true,
  };
  private stops: StopWithLocation[] = [];
  private currentStopIndex = 0;
  private callbacks: WhisperCallback[] = [];
  private lastTriggered: Map<string, { outer: boolean; inner: boolean }> = new Map();
  private isRunning = false;
  private watchId: number | null = null;

  private constructor() {}

  static getInstance(): WhisperGeofenceService {
    if (!WhisperGeofenceService.instance) {
      WhisperGeofenceService.instance = new WhisperGeofenceService();
    }
    return WhisperGeofenceService.instance;
  }

  configure(config: Partial<GeofenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setStops(stops: StopWithLocation[]): void {
    this.stops = stops.sort((a, b) => a.sequence - b.sequence);
    this.currentStopIndex = 0;
    this.lastTriggered.clear();
  }

  addCallback(callback: WhisperCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index >= 0) this.callbacks.splice(index, 1);
    };
  }

  async startWatching(location: Location): Promise<void> {
    if (this.isRunning || !this.config.enabled) return;
    
    this.isRunning = true;
    await this.checkGeofences(location);
  }

  async updateLocation(location: Location): Promise<void> {
    if (!this.isRunning || !this.config.enabled) return;
    await this.checkGeofences(location);
  }

  stopWatching(): void {
    this.isRunning = false;
    if (this.watchId !== null) {
      // Clear any native watch if applicable
      this.watchId = null;
    }
  }

  private async checkGeofences(currentLocation: Location): Promise<void> {
    if (this.currentStopIndex >= this.stops.length) return;

    const currentStop = this.stops[this.currentStopIndex];
    const stopLocation = this.getBestStopLocation(currentStop);
    
    if (!stopLocation) return;

    const distance = haversineDistance(
      currentLocation.lat,
      currentLocation.lon,
      stopLocation.lat,
      stopLocation.lon
    );

    const stopKey = currentStop.id;
    const triggered = this.lastTriggered.get(stopKey) || { outer: false, inner: false };

    // Check outer radius (150m) - "Approaching [street name]"
    if (!triggered.outer && distance <= this.config.outerRadius && distance > this.config.innerRadius) {
      triggered.outer = true;
      this.lastTriggered.set(stopKey, triggered);
      
      const message = this.generateOuterWhisper(currentStop, distance);
      this.triggerWhisper({
        stopId: currentStop.id,
        stopSequence: currentStop.sequence,
        distance,
        message,
        type: 'outer',
      });
    }

    // Check inner radius (30m) - "Next stop: [address], [instruction]"
    if (!triggered.inner && distance <= this.config.innerRadius) {
      triggered.inner = true;
      this.lastTriggered.set(stopKey, triggered);
      
      const message = this.generateInnerWhisper(currentStop, distance);
      this.triggerWhisper({
        stopId: currentStop.id,
        stopSequence: currentStop.sequence,
        distance,
        message,
        type: 'inner',
      });
    }

    // Advance to next stop when we're past the inner radius and moving away
    if (triggered.inner && distance > this.config.innerRadius * 1.5) {
      this.currentStopIndex++;
      this.checkGeofences(currentLocation); // Check next stop immediately
    }
  }

  private getBestStopLocation(stop: StopWithLocation): Location | null {
    // Priority: entry_point > park_point > geocode_point
    return stop.entry_point || stop.park_point || stop.geocode_point || null;
  }

  private generateOuterWhisper(stop: StopWithLocation, distance: number): string {
    const distStr = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
    return `Approaching ${stop.address.street} in ${distStr}`;
  }

  private generateInnerWhisper(stop: StopWithLocation, distance: number): string {
    const distStr = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
    const address = `${stop.address.number} ${stop.address.street}, ${stop.address.suburb}`;
    
    // Add parking/entry guidance if available
    let guidance = '';
    if (stop.park_point && stop.entry_point) {
      guidance = '. Park near the gate, walk to the door.';
    } else if (stop.park_point) {
      guidance = '. Park nearby.';
    } else if (stop.entry_point) {
      guidance = '. Walk to the entrance.';
    }
    
    return `Next stop: ${address}. ${distStr} away.${guidance}`;
  }

  private triggerWhisper(message: WhisperMessage): void {
    this.callbacks.forEach(cb => cb(message));
  }

  // Called when stop is completed (delivered/skipped/failed)
  onStopCompleted(stopId: string): void {
    this.lastTriggered.delete(stopId);
    // Advance if this was the current stop
    if (this.currentStopIndex < this.stops.length && 
        this.stops[this.currentStopIndex].id === stopId) {
      this.currentStopIndex++;
    }
  }

  reset(): void {
    this.stops = [];
    this.currentStopIndex = 0;
    this.lastTriggered.clear();
    this.isRunning = false;
  }

  getCurrentStop(): StopWithLocation | null {
    if (this.currentStopIndex < this.stops.length) {
      return this.stops[this.currentStopIndex];
    }
    return null;
  }

  getProgress(): { current: number; total: number } {
    return {
      current: this.currentStopIndex + 1,
      total: this.stops.length,
    };
  }
}

export const whisperGeofence = WhisperGeofenceService.getInstance();