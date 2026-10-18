/**
 * Shared constants for Courier Copilot
 */
// App metadata
export const APP_NAME = 'Courier Copilot';
export const APP_VERSION = '0.1.0';
export const APP_SLUG = 'courier-copilot';
// NZ Specific
export const NZ_COUNTRY_CODE = 'NZ';
export const NZ_CURRENCY = 'NZD';
export const NZ_GST_RATE = 0.15;
export const NZ_TIMEZONE = 'Pacific/Auckland';
// Canterbury region bounds (approximate)
export const CANTERBURY_BOUNDS = {
    north: -42.8,
    south: -44.5,
    east: 173.5,
    west: 170.5,
};
// Voice AI Constants
export const VOICE = {
    // Offline command latency target (ms)
    OFFLINE_COMMAND_TARGET_MS: 300,
    // Geofence distances for whispers (meters)
    WHISPER_APPROACH_M: 150,
    WHISPER_IMMINENT_M: 30,
    // Earbud button mappings
    EARBUD: {
        SINGLE_CLICK: 'delivered',
        DOUBLE_CLICK: 'skip',
        TRIPLE_CLICK: 'fail',
        LONG_PRESS: 'talk',
    },
    // Supported languages (Tier A = full support, B = phrase packs, C = English fallback)
    LANGUAGES: {
        TIER_A: ['en-NZ', 'en-AU', 'mi', 'ar'],
        TIER_B: ['sm', 'to', 'tl', 'hi', 'pa', 'zh', 'ko', 'ja'],
        TIER_C: ['*'], // All others fallback to English
    },
    // Cost targets
    MAX_COST_PER_SHIFT_USD: 1.00,
    TARGET_ON_DEVICE_RATIO: 0.85,
};
// Map Constants
export const MAP = {
    // Default zoom levels
    ZOOM: {
        OVERVIEW: 11,
        ROUTE: 14,
        STOP: 17,
        DOOR: 19,
    },
    // Offline map update interval (days)
    OFFLINE_MAP_UPDATE_DAYS: 7,
    // PMTiles settings
    PMTILES: {
        MAX_ZOOM: 14,
        MIN_ZOOM: 0,
        BUFFER: 64,
    },
    // Door memory EWMA alpha
    DOOR_MEMORY_ALPHA: 0.3,
    // Maximum stops per route for routing engine
    MAX_STOPS_PER_ROUTE: 200,
};
// Routing Constants
export const ROUTING = {
    // Valhalla costing models
    COSTING: {
        AUTO: 'auto',
        BICYCLE: 'bicycle',
        PEDESTRIAN: 'pedestrian',
    },
    // VROOM settings
    VROOM: {
        MAX_DURATION_SECONDS: 3600 * 12, // 12 hours
        TIME_WINDOW_FACTOR: 1.2,
    },
    // OR-Tools settings
    OR_TOOLS: {
        TIME_LIMIT_MS: 5000,
        FIRST_SOLUTION_STRATEGY: 'PATH_CHEAPEST_ARC',
    },
};
// Database Constants
export const DB = {
    // Connection pool
    POOL_SIZE: 20,
    POOL_TIMEOUT_MS: 30000,
    // EWMA learning
    EWMA_ALPHA: 0.3,
    MIN_ACCURACY_M: 15,
    // Sync
    SYNC_BATCH_SIZE: 100,
    SYNC_INTERVAL_MS: 30000,
};
// Pricing Tiers
export const PRICING = {
    TRIAL: {
        name: 'Trial',
        price_nzd: 0,
        duration_days: 14,
        max_drivers: 1,
        features: ['voice_commands', 'offline_maps', 'door_memory', 'basic_routing'],
    },
    SOLO: {
        name: 'Solo',
        price_nzd_monthly: 35,
        price_nzd_yearly: 350,
        max_drivers: 1,
        features: ['voice_commands', 'offline_maps', 'door_memory', 'routing', 'dictation', 'history', 'ird_logbook'],
    },
    TEAM: {
        name: 'Team',
        price_nzd_per_driver_monthly: 30,
        price_nzd_per_driver_yearly: 300,
        min_drivers: 2,
        features: ['all_solo', 'dispatcher', 'team_analytics', 'sms_notifications', 'masked_calls', 'franchise_billing'],
    },
};
// API Endpoints
export const API_ENDPOINTS = {
    HEALTH: '/health',
    INTAKE_TEXT: '/shifts/{shift_id}/intake',
    INTAKE_MANIFEST: '/shifts/{shift_id}/intake/manifest',
    STOPS: '/shifts/{shift_id}/stops',
    EVENTS_BATCH: '/shifts/{shift_id}/events:batch',
    TEMPLATE: '/runs/{run_id}/template',
    VOICE_WS: '/shifts/{shift_id}/voice',
};
// Error Codes
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    VOICE_TIMEOUT: 'VOICE_TIMEOUT',
    MAP_OFFLINE: 'MAP_OFFLINE',
    ROUTING_FAILED: 'ROUTING_FAILED',
};
// Feature Flags
export const FEATURE_FLAGS = {
    VOICE_AGENT_ENABLED: true,
    OCR_SCANNING_ENABLED: false, // Phase F
    SMS_NOTIFICATIONS_ENABLED: false, // Phase F, Team only
    MASKED_CALLS_ENABLED: false, // Phase F, Team only
    FERROSTAR_NAVIGATION: false, // Phase F, behind flag
    AERIAL_IMAGERY: false, // Phase G
    DISPATCHER_TEAM: false, // Phase G
};
//# sourceMappingURL=constants.js.map