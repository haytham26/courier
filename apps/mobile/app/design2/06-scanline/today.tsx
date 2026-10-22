import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { ScanlineToday } from '@/design2/lab-04-06/scanline/Today';

/** The Today screen of the direction. */
export default function Today() {
  const { state } = useLabScope();
  return <ScanlineToday state={state} />;
}
