/**
 * The map's boot: the tile source and the glyphs, read once.
 *
 * The offline pack (D26) and the glyph bundle are read when a map screen
 * opens; neither needs the network, and neither may take the screen down
 * (`docs/design/SYSTEM.md` §6). Every screen that draws a map begins here,
 * so the fallback story - the online tiles when the pack is missing, and
 * the grey style when no tiles exist at all - is one hook, not one per
 * screen.
 */
import { useEffect, useMemo, useState } from 'react';

import { getConfiguredGlyphsUrl, getConfiguredTileUrl } from '@/maps/config';
import { describe, resolveTileSource, type TileSource } from '@/maps/offlinePack';
import { loadOfflinePack, localGlyphsUrl, type OfflinePackRuntime } from '@/maps/packFiles';

export function useMapBoot(): {
  tileSource: TileSource;
  glyphsUrl: string | null;
  pack: OfflinePackRuntime | null;
} {
  const [pack, setPack] = useState<OfflinePackRuntime | null>(null);
  const [glyphsUrl, setGlyphsUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await loadOfflinePack();
        if (!cancelled) {
          setPack(result);
        }
      } catch (error) {
        console.warn(`maps: the offline pack could not be loaded: ${describe(error)}`);
      }
      try {
        const local = localGlyphsUrl();
        if (!cancelled) {
          setGlyphsUrl(local ?? getConfiguredGlyphsUrl());
        }
      } catch (error) {
        console.warn(`maps: the glyph bundle could not be read: ${describe(error)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const tileSource = useMemo(() => {
    const onlineTiles = getConfiguredTileUrl();
    if (!pack) {
      return onlineTiles ? { kind: 'online' as const, url: onlineTiles } : { kind: 'none' as const };
    }
    return resolveTileSource(pack.state, pack.locations, onlineTiles);
  }, [pack]);

  return { tileSource, glyphsUrl, pack };
}
