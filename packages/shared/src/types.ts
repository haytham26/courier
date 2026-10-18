/**
 * Shared TypeScript types for Courier Copilot
 * Used across mobile, web, and API
 */

export interface Location {
  lat: number;
  lon: number;
  accuracy_m?: number;
  speed_kmh?: number;
  heading?: number;
  timestamp: string;
}

export interface Stop {
  id: string;
  location_id: string;
  address: ParsedAddress;
  status: StopStatus;
  sequence: number;
  geocode_point?: Location;
  park_point?: Location;
  entry_point?: Location;
  notes?: string;
  delivered_at?: string;
  safe_place?: string;
  photo_url?: string;
}

export type StopStatus = 'pending' | 'active' | 'delivered' | 'failed' | 'skipped';

export interface ParsedAddress {
  unit?: string;
  number: string;
  street: string;
  suburb: string;
  city?: string;
  region?: string;
  postcode?: string;
  complete: boolean;
  confidence: number;
  linz_address_id?: string;
  raw: string;
}

export interface Run {
  id: string;
  name: string;
  driver_id: string;
  status: RunStatus;
  template: TemplateSegment[];
  stops: Stop[];
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type RunStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface TemplateSegment {
  street_key: string;
  direction: 'asc' | 'desc' | 'odd_first' | 'even_first';
}

export interface VoiceCommand {
  type: 'transcript';
  text: string;
  final: boolean;
  gps?: Location;
}

export interface VoiceResponse {
  type: 'say' | 'state' | 'navigate' | 'error';
  text?: string;
  priority?: 'now' | 'queue';
  stop?: Stop;
  location?: Location;
  error?: string;
}

export interface Intent {
  tool: string;
  args: Record<string, unknown>;
  speech?: string;
  confidence: number;
}

export interface DeliveryEvent {
  id: string;
  stop_id: string;
  kind: DeliveryEventKind;
  utterance?: string;
  safe_place?: string;
  lat?: number;
  lon?: number;
  accuracy_m?: number;
  occurred_at: string;
}

export type DeliveryEventKind = 
  | 'delivered' 
  | 'left_at' 
  | 'failed_access' 
  | 'failed_dog' 
  | 'failed_other' 
  | 'skipped' 
  | 'note_added' 
  | 'nav_started' 
  | 'nav_arrived';

export interface SyncPayload {
  events: DeliveryEvent[];
  cursor?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}