/**
 * The lab of the second round of the studio (MASTER_EXECUTION §13.6).
 *
 * The route holds the directions of the round, one folder each. The layout
 * registers every route of the folder automatically, so a direction added by
 * another team is navigable without touching this file.
 */
import React from 'react';
import { Stack } from 'expo-router';

export default function Design2Layout(): React.JSX.Element {
  return <Stack id="design2" screenOptions={{ headerShown: false, gestureEnabled: true }} />;
}
