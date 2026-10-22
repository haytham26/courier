import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { ScanlineCopilot } from '@/design2/lab-04-06/scanline/Copilot';

/** The Copilot screen of the direction. */
export default function Copilot() {
  const { state } = useLabScope();
  return <ScanlineCopilot condition={state === 'ready' ? 'listening' : 'idle'} />;
}
