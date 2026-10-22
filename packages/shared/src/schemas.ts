/**
 * Shared Zod schemas for validation
 * Used across mobile, web, and API
 */

import { z } from 'zod';

// Base schemas
export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy_m: z.number().positive().optional(),
  speed_kmh: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime(),
});

export const ParsedAddressSchema = z.object({
  unit: z.string().optional(),
  number: z.string().min(1),
  street: z.string().min(1),
  suburb: z.string().min(1),
  city: z.string().optional(),
  region: z.string().optional(),
  postcode: z.string().optional(),
  complete: z.boolean(),
  confidence: z.number().min(0).max(1),
  linz_address_id: z.string().optional(),
  raw: z.string().min(1),
});

export const StopSchema = z.object({
  id: z.string().uuid(),
  location_id: z.string().uuid(),
  address: ParsedAddressSchema,
  status: z.enum(['pending', 'active', 'delivered', 'failed', 'skipped']),
  sequence: z.number().int().nonnegative(),
  geocode_point: LocationSchema.optional(),
  park_point: LocationSchema.optional(),
  entry_point: LocationSchema.optional(),
  notes: z.string().optional(),
  delivered_at: z.string().datetime().optional(),
  safe_place: z.string().optional(),
  photo_url: z.string().url().optional(),
});

export const TemplateSegmentSchema = z.object({
  street_key: z.string().min(1),
  direction: z.enum(['asc', 'desc', 'odd_first', 'even_first', 'zigzag']),
});

export const RunSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  driver_id: z.string().uuid(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  template: z.array(TemplateSegmentSchema),
  stops: z.array(StopSchema),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const VoiceCommandSchema = z.object({
  type: z.literal('transcript'),
  text: z.string().min(1),
  final: z.boolean(),
  gps: LocationSchema.optional(),
});

export const VoiceResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('say'),
    text: z.string().min(1),
    priority: z.enum(['now', 'queue']).default('now'),
  }),
  z.object({
    type: z.literal('state'),
    stop: StopSchema,
  }),
  z.object({
    type: z.literal('navigate'),
    location: LocationSchema,
  }),
  z.object({
    type: z.literal('error'),
    error: z.string().min(1),
  }),
]);

export const IntentSchema = z.object({
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
  speech: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const DeliveryEventSchema = z.object({
  id: z.string().uuid(),
  stop_id: z.string().uuid(),
  kind: z.enum([
    'delivered',
    'left_at',
    'failed_access',
    'failed_dog',
    'failed_other',
    'skipped',
    'note_added',
    'nav_started',
    'nav_arrived',
  ]),
  utterance: z.string().optional(),
  safe_place: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  accuracy_m: z.number().positive().optional(),
  occurred_at: z.string().datetime(),
});

export const SyncPayloadSchema = z.object({
  events: z.array(DeliveryEventSchema),
  cursor: z.string().optional(),
});

export const IntakeTextSchema = z.object({
  source: z.string().default('voice'),
  text: z.string().min(1),
});

export const TemplateUpdateSchema = z.object({
  template_id: z.string().min(1).max(64),
  segments: z.array(TemplateSegmentSchema).default([]),
  stop_order: z.array(z.string().uuid()),
});

export const RouteStopSchema = z.object({
  stop_id: z.string().uuid(),
  sequence: z.number().int().positive(),
  lat: z.number(),
  lon: z.number(),
  arrival_at: z.string().datetime(),
  departure_at: z.string().datetime(),
  distance_m: z.number().nonnegative(),
  cumulative_distance_m: z.number().nonnegative(),
  late: z.boolean(),
});

export const RouteSchema = z.object({
  shift_id: z.string().uuid(),
  run_id: z.string().uuid(),
  engine: z.string().min(1),
  locked: z.boolean(),
  template_id: z.string().nullable(),
  total_distance_m: z.number().nonnegative(),
  total_duration_s: z.number().nonnegative(),
  parcels: z.number().int().nonnegative(),
  capacity_parcels: z.number().int().nonnegative().nullable(),
  over_capacity: z.boolean(),
  window_violations: z.number().int().nonnegative(),
  unroutable_stop_ids: z.array(z.string().uuid()),
  stops: z.array(RouteStopSchema),
});

export const ApiErrorSchema = z.object({
  error: z.string().min(1),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    has_more: z.boolean(),
  });

// Type exports
export type Location = z.infer<typeof LocationSchema>;
export type ParsedAddress = z.infer<typeof ParsedAddressSchema>;
export type Stop = z.infer<typeof StopSchema>;
export type TemplateSegment = z.infer<typeof TemplateSegmentSchema>;
export type Run = z.infer<typeof RunSchema>;
export type VoiceCommand = z.infer<typeof VoiceCommandSchema>;
export type VoiceResponse = z.infer<typeof VoiceResponseSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type DeliveryEvent = z.infer<typeof DeliveryEventSchema>;
export type SyncPayload = z.infer<typeof SyncPayloadSchema>;
export type IntakeText = z.infer<typeof IntakeTextSchema>;
export type TemplateUpdate = z.infer<typeof TemplateUpdateSchema>;
export type RouteStop = z.infer<typeof RouteStopSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;