import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { VoiceRibbonScanner } from '@/design2/lab-04-06/voice-ribbon/Scanner';

/** Direction 04 - Voice Ribbon. Scanner. */
export default function Scanner() {
  const { state } = useLabScope();
  return <VoiceRibbonScanner state={state} />;
}
