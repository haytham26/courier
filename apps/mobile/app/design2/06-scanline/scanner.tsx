import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { ScanlineScanner } from '@/design2/lab-04-06/scanline/Scanner';

/** The Scanner screen of the direction. */
export default function Scanner() {
  const { state } = useLabScope();
  return <ScanlineScanner state={state} />;
}
