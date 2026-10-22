import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { XrayParcelCopilot } from '@/design2/lab-04-06/xray-parcel/Copilot';

/** The Copilot screen of the direction. */
export default function Copilot() {
  const { state } = useLabScope();
  return <XrayParcelCopilot condition={state === 'ready' ? 'listening' : 'idle'} />;
}
