import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { ScanlineDriving } from '@/design2/lab-04-06/scanline/Driving';

/** The Driving screen of the direction. */
export default function Driving() {
  const { state } = useLabScope();
  return <ScanlineDriving state={state} />;
}
