import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { XrayParcelScanner } from '@/design2/lab-04-06/xray-parcel/Scanner';

/** The Scanner screen of the direction. */
export default function Scanner() {
  const { state } = useLabScope();
  return <XrayParcelScanner state={state} />;
}
