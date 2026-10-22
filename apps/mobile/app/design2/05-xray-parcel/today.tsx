import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { XrayParcelToday } from '@/design2/lab-04-06/xray-parcel/Today';

/** The Today screen of the direction. */
export default function Today() {
  const { state } = useLabScope();
  return <XrayParcelToday state={state} />;
}
