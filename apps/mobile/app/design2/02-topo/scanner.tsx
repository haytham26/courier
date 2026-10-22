/**
 * 02 Topo - **Scanner**.
 *
 * A real screen of the app in the palette of the direction. The state of the
 * screen comes from the query of the route, so every state of the spec can be
 * opened on the device: `?state=empty`, `?state=error`,
 * `?state=offline`, `?state=partial` and `?state=loading`.
 */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TopoScanner } from '@/design2a/topo/TopoScanner';
import { labState } from '@/design2a/content';

export default function TopoScannerRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ state?: string }>();

  return <TopoScanner state={labState(params.state)} />;
}
