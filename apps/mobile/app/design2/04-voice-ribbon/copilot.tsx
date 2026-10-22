import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { VoiceRibbonCopilot } from '@/design2/lab-04-06/voice-ribbon/Copilot';

/** Direction 04 - Voice Ribbon. Copilot. */
export default function Copilot() {
  const { state } = useLabScope();
  return <VoiceRibbonCopilot condition={state === 'ready' ? 'listening' : 'idle'} />;
}
