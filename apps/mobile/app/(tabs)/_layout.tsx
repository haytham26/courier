/**
 * The tabs' layout with the floating bar of D34.
 *
 * The navigator keeps the four routes (Today, Route, Map, Account); its
 * native bar is replaced by the chosen `TabBar`, whose centre is the raised
 * Copilot sphere on glass. The slot testIDs are the contract the Maestro
 * flows tap (`tab-stops`, `tab-map`), so the Route slot keeps the stops
 * route's testID and the Account slot keeps the settings route's one - the
 * words move with the design, the testIDs do not.
 *
 * The sphere is the voice: a tap toggles the microphone (a haptic per D34),
 * a long press says the morning brief again, and the caption under the bar
 * is the last thing the phone heard. The chosen tokens wrap everything, so
 * the bar and every screen on it resolve light or dark from the system.
 */
import React, { useCallback } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ChosenProvider, TabBar } from '@/components/chosen';
import type { CopilotState, TabSlot } from '@/components/chosen';
import { hapticFor } from '@/motion/haptics';
import { useOptionalAuth } from '@/providers/AuthProvider';
import type { VoiceCommand, VoiceState } from '@/voice/VoiceService';
import { useCourierVoice } from '@/voice/useCourierVoice';
import { useVoice } from '@/voice/useVoice';

import { BriefContext } from './briefContext';

/** The words of the command types: what the caption of the bar reads. */
const commandWords: Record<VoiceCommand['type'], string> = {
  mark_delivered: 'Marked delivered',
  mark_skipped: 'Marked skipped',
  mark_failed: 'Marked failed',
  add_stop: 'New stop added',
  start_break: 'On a break',
  end_break: 'Back on the run',
  add_location_note: 'Note added',
  navigate_next: 'Next stop',
  navigate_previous: 'Back a stop',
  repeat_instruction: 'Say it again',
  where_am_i: 'Where am I',
  how_many_left: 'How many left',
  start_shift: 'Shift started',
  end_shift: 'Shift ended',
  emergency: 'Emergency',
  set_map_mode: 'Map mode',
  zoom_to_next_stop: 'Next stop',
  tilt_map: 'Tilt',
  follow_me: 'Follow me',
  look_back: 'Look back',
  reset_camera: 'Camera reset',
  set_quiet_mode: 'Quiet mode',
  set_verbosity: 'Detail level',
};

/** The words for each state of the voice engine, as the sphere announces them. */
const copilotStateOf = (state: VoiceState, ready: boolean): CopilotState => {
  if (!ready || state === 'error') {
    return 'offline';
  }
  switch (state) {
    case 'listening':
      return 'listening';
    case 'processing':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    default:
      return 'idle';
  }
};

type TabRoute = 'index' | 'stops' | 'map' | 'settings';

/** The active key of a route, as the bar's slots spell it. */
const slotKey = (route: TabRoute): 'today' | 'stops' | 'map' | 'settings' =>
  route === 'index' ? 'today' : route;

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabsLayout() {
  const router = useRouter();
  const scheme = useColorScheme();
  const auth = useOptionalAuth();
  const voice = useVoice();
  const courierVoice = useCourierVoice({ driverId: auth?.user?.id ?? null });

  const toggleVoice = useCallback(() => {
    hapticFor('voice');
    if (voice.state === 'listening') {
      void voice.stopListening();
    } else {
      void voice.startListening();
    }
  }, [voice]);

  const sayBrief = useCallback(() => {
    const line = courierVoice.brief?.text;
    if (line && line.length > 0) {
      hapticFor('voice');
      void voice.speak(line);
    }
  }, [courierVoice.brief, voice]);

  const slots = useCallback((active: 'today' | 'stops' | 'map' | 'settings') => {
    const onClick = (route: string) => () => router.navigate(route);
    const today: TabSlot = {
      key: 'today',
      label: 'Today',
      name: 'calendar' as const,
      active: active === 'today',
      onPress: onClick('/'),
    };
    const stops: TabSlot = {
      key: 'stops',
      label: 'Route',
      name: 'list' as const,
      active: active === 'stops',
      onPress: onClick('/stops'),
    };
    const map: TabSlot = {
      key: 'map',
      label: 'Map',
      name: 'map' as const,
      active: active === 'map',
      onPress: onClick('/map'),
    };
    const settings: TabSlot = {
      key: 'settings',
      label: 'Account',
      name: 'person' as const,
      active: active === 'settings',
      onPress: onClick('/settings'),
    };
    return { today, stops, map, settings } as const;
  }, [router]);

  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <BriefContext.Provider value={courierVoice}>
        <Tabs
          id="tabs"
          screenOptions={({ route }) => {
            const tab = slots(slotKey(route.name as TabRoute));
            return {
              headerShown: false,
              // The native bar is replaced: the D34 bar floats on the glass
              // dock and the screens keep their edges to the screen.
              tabBar: () => (
                <TabBar
                  left={[tab.today, tab.stops]}
                  right={[tab.map, tab.settings]}
                  copilot={{
                    state: copilotStateOf(voice.state, voice.isReady),
                    onPress: toggleVoice,
                    onLongPress: sayBrief,
                  }}
                  caption={voice.lastCommand ? commandWords[voice.lastCommand.type] : undefined}
                />
              ),
              tabBarStyle: {
                position: 'absolute',
                height: 150,
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                elevation: 0,
              },
            };
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Today' }} />
          <Tabs.Screen name="stops" options={{ title: 'Route' }} />
          <Tabs.Screen name="map" options={{ title: 'Map' }} />
          <Tabs.Screen name="settings" options={{ title: 'Account' }} />
        </Tabs>
      </BriefContext.Provider>
    </ChosenProvider>
  );
}
