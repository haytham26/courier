/**
 * The bottom sheet: the grabber, three heights (peek, half, full), and the
 * map stays live behind it.
 *
 * The sheet sits on the sheet envelope of the glass (`glass.fillsBySurface`)
 * and its floor stays pinned above the tab dock (`bottomInset`): the three
 * heights set the card's height, so the top edge is the thing that moves.
 * The grabber is the 36 x 5 handle in the `grabber` token colour; dragging
 * it (or its accessible actions) changes the height. Reduced motion turns
 * the level change into a plain swap - the heights are discrete states, not
 * a continuous track.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, View } from 'react-native';

import { GlassSurface } from './GlassSurface';
import { useChosen } from './context';

export type SheetHeight = 'peek' | 'half' | 'full';

export interface BottomSheetProps {
  height: SheetHeight;
  onHeightChange?: (height: SheetHeight) => void;
  children?: React.ReactNode;
  /** The ref of the `BlurTargetView` wrapping the map (the Android blur). */
  blurTarget?: React.RefObject<React.ComponentRef<typeof View> | null>;
  reduced?: boolean;
  /** How far the sheet floor sits above the screen bottom (the tab dock). */
  bottomInset?: number;
  testID?: string;
}

/** The heights as fractions of the window, from the reference sheets. */
const FRACTIONS: Record<SheetHeight, number> = {
  peek: 0.3,
  half: 0.55,
  full: 0.88,
};

/** A window of this height or more is the tall phone (BUG-300's 1440x2560 AVD). */
const TALL_WINDOW_DP = 700;

/** The half level's share on a tall window: the content still fits under the grabber. */
const TALL_HALF_FRACTION = 0.65;

/** The grabber's own area at the card's top (its height is the headroom). */
const GRABBER_AREA = 24;

/**
 * The sheet card's three heights at a window height, as pure arithmetic.
 *
 * The full level is capped by the USABLE height, not by the window: the sheet
 * sits above the dock (the bottom inset) and the grabber - the one handle that
 * changes the level - is the sheet's FIRST child, inside its own 24 px area.
 * Run 39963017224's recording caught the cap missing: 0.88 of a 640 dp window
 * plus the 100 dp inset is 663 dp, so the card's top landed 23 dp ABOVE the
 * window and the grabber with it - the a11y tree lost the handle and the
 * three-level walk could not come back down. The reference's full sheet keeps
 * its handle on screen, so the geometry keeps it too: the fraction stands
 * until it would cost the grabber its place, then the usable height decides.
 *
 * BUG-300 (the large AVD, 1440x2560 = 411x731 dp): the sheet's CONTENT is
 * measured in dp and does not grow with the window, so 55 % of a tall window
 * leaves the sheet's first rows below the card's bottom edge - clipped, so a
 * flow's scrollUntilVisible can never bring them to full visibility and its
 * 20 s find fails on rows that ARE on the screen. The mockup's intent ("the
 * sheet takes half the screen, or three quarters when the notes are long") is
 * a share of the screen, not a fixed decimal: a window of 700 dp or more takes
 * the larger share, and the short window keeps 55 % exactly - which is what the
 * committed P4 baselines were captured on, so their pixels do not move.
 *
 * Exported so the screens' own suites can assert the geometry the component
 * WILL use instead of re-deriving a fraction (a hardcoded copy is exactly how
 * the tall-window defect could read as a test defect).
 */
export function sheetHeightsFor(
  window: number,
  bottomInset = 0,
): { peek: number; half: number; full: number; grabberArea: number } {
  const usable = window - bottomInset - GRABBER_AREA;
  return {
    peek: Math.round(window * FRACTIONS.peek),
    half: Math.round(window * (window >= TALL_WINDOW_DP ? TALL_HALF_FRACTION : FRACTIONS.half)),
    full: Math.min(Math.round(window * FRACTIONS.full), usable),
    grabberArea: GRABBER_AREA,
  };
}

export const BottomSheet = ({
  height,
  onHeightChange,
  children,
  blurTarget,
  reduced: reducedProp,
  bottomInset,
  testID,
}: BottomSheetProps) => {
  const { t } = useChosen();

  // Read at render (not only inside the memo) so a window change - a rotation, or a
  // multi-window resize - re-computes the geometry instead of leaving a stale
  // height on screen.
  const window = Dimensions.get('window').height;

  // Levels are discrete states, so reduced motion needs no special path: a
  // level change is a plain swap either way. The prop is the contract the
  // components table pins, and every caller may keep passing it.
  void reducedProp;

  const heights = useMemo(() => sheetHeightsFor(window, bottomInset), [window, bottomInset]);

  const [target, setTarget] = useState<SheetHeight>(height);

  useEffect(() => {
    setTarget(height);
  }, [height]);

  const bump = useCallback(
    (direction: 1 | -1) => {
      const order: [SheetHeight, SheetHeight, SheetHeight] = ['peek', 'half', 'full'];
      const next = order[Math.max(0, Math.min(2, order.indexOf(target) + direction))];
      if (next !== target) {
        setTarget(next);
        onHeightChange?.(next);
      }
    },
    [target, onHeightChange],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 12,
        onPanResponderEnd: (_event, gesture) => {
          if (gesture.dy < -30) bump(1);
          if (gesture.dy > 30) bump(-1);
        },
      }),
    [bump],
  );

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.warp, bottomInset ? { paddingBottom: bottomInset } : null]}
      testID={testID}
    >
      <GlassSurface
        kind="sheet"
        runtime={{ blurTarget }}
        style={{ borderRadius: t.radii.sheet, height: heights[target] }}
      >
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="The stop sheet"
          accessibilityHint="Changes the sheet height: peek, half or full"
          accessibilityActions={[
            { name: 'increment', label: 'Raise the sheet' },
            { name: 'decrement', label: 'Lower the sheet' },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') bump(1);
            if (event.nativeEvent.actionName === 'decrement') bump(-1);
          }}
          testID={testID ? `${testID}-grabber` : 'sheet-grabber'}
          style={styles.grabberArea}
          {...pan.panHandlers}
        >
          <View style={[styles.grabber, { backgroundColor: t.colors.grabber }]} />
        </View>
        <View style={styles.body}>{children}</View>
      </GlassSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  warp: {
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  body: {
    flex: 1,
  },
  grabberArea: {
    height: 24,
    paddingTop: 10,
    alignItems: 'center',
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
});
