/**
 * The glass surface: the one surface of the design.
 *
 * Everything that floats above the map is the same liquid glass (the token
 * blur 28, the light recipe saturated 1.8) with the surface's fill alpha from
 * `glass.fillsBySurface` composited on top. What the D33 test asserts is the
 * composite, so every branch of this component puts the TOKEN FILL over
 * whatever the platform draws:
 *
 * - the Liquid Glass API available (iOS 26+): the native `GlassView` of
 *   `expo-glass-effect` (which falls back to a plain `View` itself),
 *   tinted with the card colour, plus the fill layer;
 * - Android (SDK 31+) and iOS before 26: `BlurView` of `expo-blur`, with the
 *   blurred content wrapped in a `BlurTargetView` that the screen passes as a
 *   ref (`dimezisBlurViewSdk31Plus` keeps older Android versions graceful),
 *   plus the fill layer;
 * - reduce transparency (the accessibility setting, any platform): no blur,
 *   no translucency: the solid card colour. The content pairs were asserted
 *   on the card at the top of the table, so this branch is the safe one.
 *
 * The platform branches are prop-injected (`runtime`) so tests and screens
 * can pin them.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';

import { useChosen } from './context';
import type { GlassKind } from './types';

type ContainerStyle = React.ComponentProps<typeof View>['style'];

export interface GlassRuntime {
  /** The Liquid Glass availability; the default is the real runtime check. */
  liquidGlass?: boolean;
  /** The reduce-transparency setting; the default is the real accessibility check. */
  reduceTransparency?: boolean;
  /** The ref of the `BlurTargetView` the screen wrapped the map in (Android). */
  blurTarget?: React.RefObject<React.ComponentRef<typeof View> | null>;
}

export interface GlassSurfaceProps {
  kind?: GlassKind;
  runtime?: GlassRuntime;
  children?: React.ReactNode;
  style?: ContainerStyle;
  testID?: string;
}

export const GlassSurface = ({ kind = 'control', runtime, style, children, testID }: GlassSurfaceProps) => {
  const { t, mode } = useChosen();
  const [reduceTransparency, setReduceTransparency] = useState(runtime?.reduceTransparency ?? false);

  useEffect(() => {
    if (runtime?.reduceTransparency !== undefined) {
      setReduceTransparency(runtime.reduceTransparency);
      return;
    }
    let live = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (live) {
        setReduceTransparency(value);
      }
    });
    return () => {
      live = false;
    };
  }, [runtime?.reduceTransparency]);

  const liquidGlass = useMemo(
    () => runtime?.liquidGlass ?? (Platform.OS === 'ios' && isGlassEffectAPIAvailable()),
    [runtime?.liquidGlass],
  );

  const radius = kind === 'sheet' ? t.radii.sheet : t.radii.card;
  // The envelope keys are `sheet` and `controls`; the component-facing kind
  // maps onto them with direct property access, so the envelope pair is
  // always typed and never an undefined lookup.
  const envelope = kind === 'sheet' ? t.glass.fillsBySurface.sheet : t.glass.fillsBySurface.controls;
  const fill = envelope[mode];
  // The envelope midpoint: the fill sits inside the asserted range, and the
  // worst case stays covered by the D33 test's envelope sweep.
  const fillAlpha = (fill.min + fill.max) / 2;

  const container: React.ComponentProps<typeof View>['style'] = [
    {
      borderRadius: radius,
      overflow: 'hidden',
      backgroundColor: reduceTransparency ? t.colors.card : undefined,
    },
    style,
  ];

  const fillLayer = reduceTransparency ? null : (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: rgbaCard(t.colors.card, fillAlpha) }]}
    />
  );

  const content = <>{children}</>;

  if (reduceTransparency) {
    return (
      <View testID={testID} style={container}>
        {content}
      </View>
    );
  }
  if (liquidGlass) {
    return (
      <View testID={testID} style={container}>
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="regular"
          tintColor={t.colors.card}
          colorScheme={mode === 'light' ? 'light' : 'dark'}
        />
        {fillLayer}
        {content}
      </View>
    );
  }
  return (
    <View testID={testID} style={container}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurTarget={runtime?.blurTarget}
        intensity={40}
        tint={mode === 'light' ? 'light' : 'dark'}
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
      />
      {fillLayer}
      {content}
    </View>
  );
};

const rgbaCard = (card: string, alpha: number) => {
  const body = card.replace('#', '');
  const r = parseInt(body.slice(0, 2), 16);
  const g = parseInt(body.slice(2, 4), 16);
  const b = parseInt(body.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};
