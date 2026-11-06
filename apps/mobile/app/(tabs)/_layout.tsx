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
import React, { useCallback, useEffect, useMemo } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ChosenProvider, TabBar } from '@/components/chosen';
import type { TabSlot } from '@/components/chosen';
import { activeOf } from '@/maps/drive';
import { useRun } from '@/maps/runState';
import { hapticFor } from '@/motion/haptics';
import { useOptionalAuth } from '@/providers/AuthProvider';
import type { VoiceCommand } from '@/voice/VoiceService';
import { subscribeToVoiceCommands } from '@/voice/commandChannel';
import { copilotStateOf } from '@/voice/copilotState';
import { useCourierVoice } from '@/voice/useCourierVoice';
import { cannedTurnForThisBuild, voiceClientForThisBuild } from '@/voice/turnForThisBuild';
import { useVoice } from '@/voice/useVoice';
import { voiceConfigFromBuild } from '@/voice/voiceConfig';

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
// copilotStateOf moved to '@/voice/copilotState' when a root-stack screen
// (summary) needed the same mapping: one mapping, one place to fix.

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
  const run = useRun();
  // D1 (BUG-231): the tab layout OWNS the voice service - the one consumer
  // that passes a config initializes it - and every finished transcript goes
  // to the turn flow, so the full conversation (not only the catalog
  // commands) is answered. The client is the build's own seam: the canned one
  // in the E2E build, the real one everywhere else.
  const voiceClient = useMemo(() => voiceClientForThisBuild(), []);
  const courierVoice = useCourierVoice({ driverId: auth?.user?.id ?? null, client: voiceClient });
  const voiceConfig = useMemo(
    () => voiceConfigFromBuild(courierVoice.settings.language),
    [courierVoice.settings.language],
  );
  const voice = useVoice(voiceConfig, {
    onFinalTranscript: (text) => {
      void courierVoice.sendTurn(text);
    },
  });

  // D1 (BUG-231): the voice→run bridge. A spoken stop command moves the run
  // whichever screen the courier is on - the drive included, which before
  // only the copilot and map screens heard. A spoken "delivered" marks the
  // active stop and opens the confirm, exactly as the slide does.
  useEffect(() => {
    return subscribeToVoiceCommands((command) => {
      if (command.type !== 'mark_delivered' && command.type !== 'mark_failed') {
        return;
      }
      const deliveredIds = run.delivered.map((event) => event.stopId);
      const active = activeOf(run.day.stops, deliveredIds);
      if (active === null) {
        return;
      }
      if (command.type === 'mark_delivered') {
        run.markDelivered(active);
        router.push(`/delivered?stop=${active.id}`);
      } else {
        run.markFailed(active, { reason: command.reason, utterance: 'voice' });
      }
    });
  }, [run, router]);

  const toggleVoice = useCallback(() => {
    hapticFor('voice');
    if (voice.state === 'listening') {
      void voice.stopListening();
      return;
    }
    // The E2E build has no microphone model: a tap injects the canned
    // transcript into the same turn flow instead.
    if (!cannedTurnForThisBuild((transcript) => void courierVoice.sendTurn(transcript))) {
      void voice.startListening();
    }
  }, [voice, courierVoice]);

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
          screenOptions={{ headerShown: false }}
          // The dock is the bar here. The custom bar must be a navigator
          // prop: the fork (`expo-router/js-tabs`) strips `screenOptions`
          // for the router (`partitionNavigatorProps`) and nothing reads a
          // custom bar back from the descriptors, so the option rendered
          // the default bar instead - the e2e run showed four invisible
          // default-bar icons and none of the dock's slots.
          tabBar={({ state: barState }) => {
            const tab = slots(slotKey(barState.routes[barState.index].name as TabRoute));
            return (
              <TabBar
                left={[tab.today, tab.stops]}
                right={[tab.map, tab.settings]}
                copilot={{
                  state: copilotStateOf(voice.state, voice.isReady),
                  onPress: toggleVoice,
                  onLongPress: sayBrief,
                }}
                caption={
                  courierVoice.lastAnswer !== null && courierVoice.lastAnswer.speech.length > 0
                    ? courierVoice.lastAnswer.speech
                    : voice.lastCommand
                      ? commandWords[voice.lastCommand.type]
                      : undefined
                }
              />
            );
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
