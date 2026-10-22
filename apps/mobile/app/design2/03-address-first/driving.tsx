/**
 * 03 Address First - **Driving**.
 *
 * A real screen of the app in the palette of the direction. The state of the
 * screen comes from the query of the route, so every state of the spec can be
 * opened on the device: `?state=empty`, `?state=error`,
 * `?state=offline`, `?state=partial` and `?state=loading`.
 */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AddressFirstDriving } from '@/design2a/address-first/AddressFirstDriving';
import { labState } from '@/design2a/content';

export default function AddressFirstDrivingRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ state?: string }>();

  return <AddressFirstDriving state={labState(params.state)} />;
}
