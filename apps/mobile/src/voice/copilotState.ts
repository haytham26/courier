/**
 * The voice state, as the Copilot button spells it (D34).
 *
 * The button's states are the founder's list in `docs/design/chosen/README.md`
 * (component 2): idle, listening, thinking, speaking, muted, offline. More than
 * one root route carries the button (the tabs dock, and a screen that carries it
 * on its own), so the mapping lives here rather than in each screen: one
 * mapping, one place to fix. The semantics are the dock's own, moved verbatim
 * from `app/(tabs)/_layout.tsx` when the summary screen needed the same
 * mapping: the engine's error and an engine that is not ready both read as
 * offline, and no change to the dock's behaviour was wanted.
 */
import type { VoiceState } from './VoiceService';
// The type comes from the leaf, never the barrel: the barrel pulls in the
// components (the Skia sphere, the glass), and a screen that imports both the
// barrel and this mapping then hit a cycle whose exports read as unresolved.
import type { CopilotState } from '@/components/chosen/types';

/** The engine's state and readiness, as the button's state. */
export function copilotStateOf(state: VoiceState, ready: boolean): CopilotState {
  if (!ready || state === 'error') {
    return 'offline';
  }
  switch (state) {
    case 'listening':
      return 'listening';
    case 'processing':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    default:
      return 'idle';
  }
}
