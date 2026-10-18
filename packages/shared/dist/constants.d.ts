/**
 * Shared constants for Courier Copilot
 */
export declare const APP_NAME = "Courier Copilot";
export declare const APP_VERSION = "0.1.0";
export declare const APP_SLUG = "courier-copilot";
export declare const NZ_COUNTRY_CODE = "NZ";
export declare const NZ_CURRENCY = "NZD";
export declare const NZ_GST_RATE = 0.15;
export declare const NZ_TIMEZONE = "Pacific/Auckland";
export declare const CANTERBURY_BOUNDS: {
    readonly north: -42.8;
    readonly south: -44.5;
    readonly east: 173.5;
    readonly west: 170.5;
};
export declare const VOICE: {
    readonly OFFLINE_COMMAND_TARGET_MS: 300;
    readonly WHISPER_APPROACH_M: 150;
    readonly WHISPER_IMMINENT_M: 30;
    readonly EARBUD: {
        readonly SINGLE_CLICK: "delivered";
        readonly DOUBLE_CLICK: "skip";
        readonly TRIPLE_CLICK: "fail";
        readonly LONG_PRESS: "talk";
    };
    readonly LANGUAGES: {
        readonly TIER_A: readonly ["en-NZ", "en-AU", "mi", "ar"];
        readonly TIER_B: readonly ["sm", "to", "tl", "hi", "pa", "zh", "ko", "ja"];
        readonly TIER_C: readonly ["*"];
    };
    readonly MAX_COST_PER_SHIFT_USD: 1;
    readonly TARGET_ON_DEVICE_RATIO: 0.85;
};
export declare const MAP: {
    readonly ZOOM: {
        readonly OVERVIEW: 11;
        readonly ROUTE: 14;
        readonly STOP: 17;
        readonly DOOR: 19;
    };
    readonly OFFLINE_MAP_UPDATE_DAYS: 7;
    readonly PMTILES: {
        readonly MAX_ZOOM: 14;
        readonly MIN_ZOOM: 0;
        readonly BUFFER: 64;
    };
    readonly DOOR_MEMORY_ALPHA: 0.3;
    readonly MAX_STOPS_PER_ROUTE: 200;
};
export declare const ROUTING: {
    readonly COSTING: {
        readonly AUTO: "auto";
        readonly BICYCLE: "bicycle";
        readonly PEDESTRIAN: "pedestrian";
    };
    readonly VROOM: {
        readonly MAX_DURATION_SECONDS: number;
        readonly TIME_WINDOW_FACTOR: 1.2;
    };
    readonly OR_TOOLS: {
        readonly TIME_LIMIT_MS: 5000;
        readonly FIRST_SOLUTION_STRATEGY: "PATH_CHEAPEST_ARC";
    };
};
export declare const DB: {
    readonly POOL_SIZE: 20;
    readonly POOL_TIMEOUT_MS: 30000;
    readonly EWMA_ALPHA: 0.3;
    readonly MIN_ACCURACY_M: 15;
    readonly SYNC_BATCH_SIZE: 100;
    readonly SYNC_INTERVAL_MS: 30000;
};
export declare const PRICING: {
    readonly TRIAL: {
        readonly name: "Trial";
        readonly price_nzd: 0;
        readonly duration_days: 14;
        readonly max_drivers: 1;
        readonly features: readonly ["voice_commands", "offline_maps", "door_memory", "basic_routing"];
    };
    readonly SOLO: {
        readonly name: "Solo";
        readonly price_nzd_monthly: 35;
        readonly price_nzd_yearly: 350;
        readonly max_drivers: 1;
        readonly features: readonly ["voice_commands", "offline_maps", "door_memory", "routing", "dictation", "history", "ird_logbook"];
    };
    readonly TEAM: {
        readonly name: "Team";
        readonly price_nzd_per_driver_monthly: 30;
        readonly price_nzd_per_driver_yearly: 300;
        readonly min_drivers: 2;
        readonly features: readonly ["all_solo", "dispatcher", "team_analytics", "sms_notifications", "masked_calls", "franchise_billing"];
    };
};
export declare const API_ENDPOINTS: {
    readonly HEALTH: "/health";
    readonly INTAKE_TEXT: "/shifts/{shift_id}/intake";
    readonly INTAKE_MANIFEST: "/shifts/{shift_id}/intake/manifest";
    readonly STOPS: "/shifts/{shift_id}/stops";
    readonly EVENTS_BATCH: "/shifts/{shift_id}/events:batch";
    readonly TEMPLATE: "/runs/{run_id}/template";
    readonly VOICE_WS: "/shifts/{shift_id}/voice";
};
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly VOICE_TIMEOUT: "VOICE_TIMEOUT";
    readonly MAP_OFFLINE: "MAP_OFFLINE";
    readonly ROUTING_FAILED: "ROUTING_FAILED";
};
export declare const FEATURE_FLAGS: {
    readonly VOICE_AGENT_ENABLED: true;
    readonly OCR_SCANNING_ENABLED: false;
    readonly SMS_NOTIFICATIONS_ENABLED: false;
    readonly MASKED_CALLS_ENABLED: false;
    readonly FERROSTAR_NAVIGATION: false;
    readonly AERIAL_IMAGERY: false;
    readonly DISPATCHER_TEAM: false;
};
//# sourceMappingURL=constants.d.ts.map