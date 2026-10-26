/**
 * The typed API client, generated from packages/contracts/openapi.yaml.
 *
 * DO NOT EDIT: change the contract and regenerate (`services/api/scripts/
 * generate_api_client.py`). CI fails on a stale file (check_api_client.py), so
 * the server, the contract and this client cannot drift apart.
 */

export interface AuthMe {
  user_id: string;
  session_id?: string;
  organization_id?: string;
  team_id?: string;
}

export interface AuthVerify {
  valid: boolean;
  user_id?: string;
}

export interface BriefingResponse {
  briefing?: string;
  stops_count?: number;
  set_aside_count?: number;
}

export interface CreateLocationNoteRequest {
  kind: 'entry' | 'gate_code' | 'hazard' | 'safe_place' | 'access';
  body: string;
  confidence?: number;
}

export interface CreateRunRequest {
  name: string;
  shift_id: string;
  depot: {
    lat: number;
    lon: number;
  };
  start_at: string;
  capacity_parcels?: number;
  speed_kmh?: number;
}

export interface DeliveryEvent {
  id: string;
  stop_id: string;
  kind: 'delivered' | 'left_at' | 'skipped' | 'failed';
  utterance?: string;
  safe_place?: string;
  lat?: number;
  lon?: number;
  accuracy_m?: number;
  occurred_at: string;
}

export interface DemoRun {
  run_id: string;
  shift_id: string;
  stops: DemoStop[];
}

export interface DemoSeedRequest {
  reason?: 'e2e' | 'demo' | 'dev';
}

export interface DemoStop {
  id: string;
  address: string;
  lat: number;
  lon: number;
  priority?: boolean;
  parcels?: number;
}

export interface Entitlement {
  active: boolean;
  plan?: 'trial' | 'solo' | 'team' | null;
  features: string[];
}

export interface ErrorResponse {
  error?: string;
  message?: string;
}

export interface HealthResponse {
  status: 'ok';
  version: string;
  engines: string[];
}

export interface IntakeText {
  source?: 'voice' | 'ocr' | 'scan' | 'manual';
  text: string;
}

export interface InterruptQuestion {
  speak?: string;
  index?: number;
}

export interface LocationNote {
  id: string;
  kind: 'entry' | 'gate_code' | 'hazard' | 'safe_place' | 'access';
  body: string;
  confidence: number;
  last_confirmed: string;
}

export interface PodResponse {
  event_id: string;
  stop_id: string;
  sha256: string;
  bytes: number;
  stored_at: string;
  already_stored: boolean;
}

export interface PodUrlResponse {
  event_id: string;
  url: string;
  expires_at: string;
}

export interface ReoptResponse {
  run_id: string;
  engine: string;
  finish_delta_s: number;
  stops: Record<string, unknown>[];
}

export interface RouteResponse {
  shift_id: string;
  run_id: string;
  engine: string;
  locked: boolean;
  template_id?: string;
  total_distance_m: number;
  total_duration_s: number;
  parcels: number;
  capacity_parcels: number;
  over_capacity: boolean;
  window_violations: number;
  unroutable_stop_ids: string[];
  stops: {
    stop_id: string;
    sequence: number;
    lat: number;
    lon: number;
    arrival_at: string;
    departure_at: string;
    distance_m: number;
    cumulative_distance_m: number;
    late: boolean;
  }[];
}

export interface RunResponse {
  id: string;
  shift_id: string;
  name: string;
  depot: {
    lat: number;
    lon: number;
  };
  capacity_parcels?: number;
  speed_kmh: number;
  start_at: string;
}

export interface StopResponse {
  id: string;
  location_id: string;
  address?: string;
  seq: number;
  status: 'pending' | 'delivered' | 'skipped' | 'deferred' | 'failed';
  lat?: number;
  lon?: number;
  priority?: boolean;
  parcels?: number;
  service_time_s?: number;
  window_start?: string;
  window_end?: string;
}

export interface SyncResponse {
  cursor?: number;
  accepted?: number;
  conflicts?: string[];
}

export interface TemplateResponse {
  run_id?: string;
  segments?: number;
}

export interface TemplateSegment {
  street_key: string;
  direction?: 'odd_first' | 'even_first' | 'zigzag' | 'asc' | 'desc';
}

/** Every served route, keyed by path, with its request and answers. */
export interface ApiPaths {
  '/runs/{run_id}/template': {
    put: {
      body: TemplateSegment[];
      responses: {
        200: TemplateResponse;
      };
    };
  };
  '/shifts/{shift_id}/intake': {
    post: {
      body: IntakeText;
      responses: {
        200: BriefingResponse | InterruptQuestion;
      };
    };
  };
  '/shifts/{shift_id}/intake/manifest': {
    post: {
      body: null;
      responses: {
        200: BriefingResponse | InterruptQuestion;
      };
    };
  };
  '/billing/webhooks/{source}': {
    post: {
      body: null;
      responses: {
        200: {
          accepted: boolean;
        };
      };
    };
  };
  '/account/entitlements': {
    get: {
      body: null;
      responses: {
        200: Entitlement;
      };
    };
  };
  '/shifts/{shift_id}/stops': {
    get: {
      body: null;
      responses: {
        200: StopResponse[];
      };
    };
  };
  '/shifts/{shift_id}/events:batch': {
    post: {
      body: DeliveryEvent[];
      responses: {
        200: SyncResponse;
      };
    };
  };
  '/shifts/{shift_id}/voice': {
    get: {
      body: null;
    };
  };
  '/demo/runs': {
    post: {
      body: DemoSeedRequest;
      responses: {
        200: DemoRun;
      };
    };
  };
  '/runs': {
    post: {
      body: CreateRunRequest;
      responses: {
        201: RunResponse;
      };
    };
    get: {
      body: null;
      responses: {
        200: RunResponse[];
      };
    };
  };
  '/runs/{run_id}': {
    get: {
      body: null;
      responses: {
        200: RunResponse;
      };
    };
  };
  '/locations/{location_id}/notes': {
    get: {
      body: null;
      responses: {
        200: LocationNote[];
      };
    };
    post: {
      body: CreateLocationNoteRequest;
      responses: {
        200: LocationNote;
        201: LocationNote;
      };
    };
  };
  '/healthz': {
    get: {
      body: null;
      responses: {
        200: HealthResponse;
      };
    };
  };
  '/auth/me': {
    get: {
      body: null;
      responses: {
        200: AuthMe;
      };
    };
  };
  '/auth/verify': {
    get: {
      body: null;
      responses: {
        200: AuthVerify;
      };
    };
  };
  '/shifts/{shift_id}/route': {
    get: {
      body: null;
      responses: {
        200: RouteResponse;
      };
    };
  };
  '/runs/{run_id}/stops/{stop_id}/pod': {
    post: {
      body: null;
      responses: {
        200: PodResponse;
        201: PodResponse;
      };
    };
  };
  '/runs/{run_id}/stops/{stop_id}/pod/{event_id}/url': {
    get: {
      body: null;
      responses: {
        200: PodUrlResponse;
      };
    };
  };
  '/runs/{run_id}/pod/{event_id}/bytes': {
    get: {
      body: null;
      responses: {
        200: unknown;
      };
    };
  };
  '/runs/{run_id}/route:reopt': {
    post: {
      body: {
        affected_stop_ids: string[];
      };
      responses: {
        200: ReoptResponse;
      };
    };
  };
}

/** The app's base URL comes from the build config; the paths are typed here. */
export type ApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
