/**
 * The map of a direction.
 *
 * The map is the real map module: the style is built by
 * `apps/mobile/src/maps/styles.ts` from the palette of the direction, so the
 * roads, the labels and the buildings are drawn in the colours of that
 * direction and not in a stock style with the accent pasted on it
 * (`docs/design/REVIEW.md` REVIEW-F5 and F6).
 *
 * The camera is the camera of the direction: the pitch, the bearing and the
 * zoom come from the direction data, and the camera never turns while the
 * driver is reading the address.
 */
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type LineLayerProps,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { mapPalettes2a } from '@courier/design-tokens/themes2a';
import type { Direction2a } from '@courier/design-tokens/directions2a';
import { getCourierStyle } from '@/maps/styles';
import { run } from './content';

/** The centre of the run, in Christchurch. */
const MAP_CENTRE: [number, number] = [172.612, -43.536];

/** The line the courier has already driven and the line still to drive. */
const ROUTE_COORDINATES: [number, number][] = [
  [172.605, -43.528],
  [172.612, -43.524],
  [172.619, -43.521],
  [172.625, -43.518],
];

const ROUTE_SHAPE = {
  type: 'Feature' as const,
  properties: {},
  geometry: {
    type: 'LineString' as const,
    coordinates: ROUTE_COORDINATES,
  },
};

interface DirectionMapProps {
  direction: Direction2a;
  /** Whether the map is drawn in the night palette of the direction. */
  night: boolean;
  /** The children are drawn over the map: the plates of the screen. */
  children?: React.ReactNode;
}

/**
 * The map of a direction, with the route drawn on it.
 *
 * The tiles come from the offline pack when the device has one and from the
 * server when it does not; the lab draws the courier overlay either way, so
 * the screen never shows a blank grid (REVIEW-F7).
 */
export function DirectionMap({ direction, night, children }: DirectionMapProps): React.JSX.Element {
  const palette = mapPalettes2a[night ? direction.nightThemeName : direction.themeName];

  const style: StyleSpecification = useMemo(
    () =>
      getCourierStyle(night ? direction.nightThemeName : direction.themeName, null, null, {
        palette,
        buildings: true,
        buildings3d: true,
      }),
    [direction.nightThemeName, direction.themeName, night, palette],
  );

  // The route of the run, drawn in the route colour of the direction.
  const routeLayer: LineLayerProps = {
    id: 'courier-route-line',
    type: 'line',
    style: {
      lineColor: palette.routeLine,
      lineWidth: 5,
      lineCap: 'round',
      lineJoin: 'round',
    },
  };

  return (
    <Map testID="courier-map" mapStyle={style} style={styles.map}>
      <Camera
        initialViewState={{ center: MAP_CENTRE, zoom: direction.camera.followZoom }}
        minZoom={4}
        maxZoom={19}
        pitch={direction.camera.pitch3d}
        bearing={direction.camera.bearing === 'heading' ? 24 : 0}
      />
      <GeoJSONSource id="courier-route" data={ROUTE_SHAPE}>
        <Layer {...routeLayer} />
      </GeoJSONSource>
      {children}
    </Map>
  );
}

/** The stop the courier is going to, on the map. */
export const NEXT_STOP_COORDINATES: [number, number] = [
  run.nextStop.coordinates.lng,
  run.nextStop.coordinates.lat,
];

const styles = StyleSheet.create({
  map: { flex: 1 },
});
