/**
 * 01 Control Room - **Copilot voice**.
 *
 * A real screen of the app in the palette of the direction. The state of the
 * screen comes from the query of the route, so every state of the spec can be
 * opened on the device: `?state=empty`, `?state=error`,
 * `?state=offline`, `?state=partial` and `?state=loading`.
 */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ControlRoomCopilot } from '@/design2a/control-room/ControlRoomCopilot';
import { labState } from '@/design2a/content';

export default function ControlRoomCopilotRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ state?: string }>();

  return <ControlRoomCopilot state={labState(params.state)} />;
}
