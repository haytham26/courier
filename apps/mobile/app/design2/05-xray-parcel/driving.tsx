import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { XrayParcelDriving } from '@/design2/lab-04-06/xray-parcel/Driving';

/** The Driving screen of the direction. */
export default function Driving() {
  const { state } = useLabScope();
  return <XrayParcelDriving state={state} />;
}
