/**
 * The voice control of the map camera.
 *
 * The ideas here are adapted from **God's Eye View**
 * (https://github.com/bilawalsidhu/gods-eye-view, read 2026-10-22), which
 * shows that a map camera can be driven by the voice: "tilt the map",
 * "follow me", "look back", "zoom to the next stop". The upstream project is
 * a browser globe built on CesiumJS and Google Photorealistic 3D Tiles; we
 * take the **idea** of the spoken camera verbs and build them on MapLibre
 * and the courier's own stops.
 *
 * Its licence is the MIT licence, and the notice is kept here as the licence
 * requires:
 *
 * ```
 * MIT License
 *
 * Copyright (c) 2026 Bilawal Sidhu
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * ```
 *
 * The imagery providers the upstream project uses are **not** adopted: Google
 * Photorealistic 3D Tiles and Cesium ion need a commercial licence, and
 * MASTER_EXECUTION §11 does not allow them without one.
 */

import type { ResolvedMapViewMode } from './viewModes';

/** The camera verbs a courier can use. */
export type CameraCommand =
  /** Move the camera to the next stop of the run. */
  | { type: 'zoom_to_next_stop' }
  /** Tilt the map over, or lay it flat again. */
  | { type: 'tilt_map'; on: boolean }
  /** Follow the courier, or stop following them. */
  | { type: 'follow_me'; on: boolean }
  /** Turn the map around so the courier can see behind the van. */
  | { type: 'look_back' }
  /** Put the camera back where it started. */
  | { type: 'reset_camera' };

/** The tilt of the 3D map, in degrees. */
export const TILTED_PITCH = 55;

/** The bearing of the "look back" camera, in degrees. */
export const LOOK_BACK_BEARING = 180;

/** The camera of one map mode. */
export interface MapCamera {
  /** How far the map is tilted over. */
  pitch: number;
  /** Which way the map is turned. */
  bearing: number;
}

/**
 * The camera of each mode.
 *
 * The satellite imagery is flat, so the satellite mode is a flat map: there
 * is nothing to tilt.
 */
export function cameraForMode(mode: ResolvedMapViewMode): MapCamera {
  if (mode === '3d') {
    return { pitch: TILTED_PITCH, bearing: 0 };
  }
  return { pitch: 0, bearing: 0 };
}

/**
 * The spoken camera verbs.
 *
 * The wording is plain NZ English and short, because the courier says it
 * while driving. Every verb is one sentence and one action.
 */
const CAMERA_PATTERNS: readonly { pattern: RegExp; command: CameraCommand }[] = [
  {
    pattern:
      /^(?:zoom|go|take me|jump|fly)\s+(?:in\s+|to\s+|on\s+|over\s+)*(?:the\s+)?next\s+(?:stop|drop|delivery|address)\b/,
    command: { type: 'zoom_to_next_stop' },
  },
  {
    pattern: /^(?:tilt|angle|tip)\s+(?:the\s+|it\s+)?(?:map|view|it)\b/,
    command: { type: 'tilt_map', on: true },
  },
  {
    pattern: /^(?:flat|flatten|level|lay)\s+(?:the\s+)?(?:map|view)\b/,
    command: { type: 'tilt_map', on: false },
  },
  {
    pattern: /^follow\s+me\b/,
    command: { type: 'follow_me', on: true },
  },
  {
    pattern: /^stop\s+following\b/,
    command: { type: 'follow_me', on: false },
  },
  {
    pattern: /^look\s+back\b/,
    command: { type: 'look_back' },
  },
  {
    pattern: /^(?:reset|start)\s+(?:the\s+)?(?:map|view|camera)\b/,
    command: { type: 'reset_camera' },
  },
];

/**
 * Reads a camera verb out of what the courier said.
 *
 * It returns null when the sentence is not a camera verb, so the caller can
 * carry on with the rest of the catalogue.
 */
export function parseCameraCommand(transcript: string): CameraCommand | null {
  const said = transcript
    .trim()
    .toLowerCase()
    .replace(/[.!?,]+$/, '');
  if (said.length === 0) {
    return null;
  }

  for (const entry of CAMERA_PATTERNS) {
    if (entry.pattern.test(said)) {
      return entry.command;
    }
  }

  return null;
}
