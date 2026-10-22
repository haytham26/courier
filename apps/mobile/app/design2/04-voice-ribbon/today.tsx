import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { VoiceRibbonToday } from '@/design2/lab-04-06/voice-ribbon/Today';

/** Direction 04 - Voice Ribbon. Today. */
export default function Today() {
  const { state } = useLabScope();
  return <VoiceRibbonToday state={state} />;
}
