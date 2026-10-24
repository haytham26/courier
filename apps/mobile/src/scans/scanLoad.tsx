/**
 * The scan load: the parcels the courier has read into the van.
 *
 * The reference's sheet says "Add and Scan Next" - the parcel joins the load
 * and the scanner stays open for the next one - so the load outlives the
 * scan screen: it lives above the routes, the same rule the delivered marks
 * follow (src/maps/runState.tsx). Its lifetime is one signed-in session: the
 * root layout keys the provider to the auth state, so a sign-out remounts it
 * and the van is empty again. A storage-backed load is the parcel store's
 * arrival (P5), not this slice's.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { LabelMatch } from './labelReader';

/** Where a parcel sits in the van. */
export type VanPosition = 'front' | 'middle' | 'back';

/** One parcel in the van. */
export interface ScannedParcel {
  address: string;
  suburb: string;
  vanPosition: VanPosition;
  /** The moment it was added, as the epoch milliseconds the clock read. */
  at: number;
}

export interface ScanLoadState {
  /** The parcels in the van, in the order they were added. */
  parcels: ScannedParcel[];
  /** How many parcels the van holds. */
  count: number;
  /** Puts a parcel in the van, where the courier says it sits. */
  add(match: LabelMatch, vanPosition: VanPosition): void;
}

const ScanLoadContext = createContext<ScanLoadState | undefined>(undefined);

export const ScanLoadProvider = ({ children }: { children: React.ReactNode }) => {
  const [parcels, setParcels] = useState<ScannedParcel[]>([]);

  const add = useCallback((match: LabelMatch, vanPosition: VanPosition) => {
    setParcels((current) => [
      ...current,
      { address: match.address, suburb: match.suburb, vanPosition, at: Date.now() },
    ]);
  }, []);

  const value = useMemo<ScanLoadState>(
    () => ({ parcels, count: parcels.length, add }),
    [parcels, add],
  );

  return <ScanLoadContext.Provider value={value}>{children}</ScanLoadContext.Provider>;
};

/** The load above the screen that asked for it. */
export const useScanLoad = (): ScanLoadState => {
  const ctx = useContext(ScanLoadContext);
  if (!ctx) {
    throw new Error('useScanLoad needs a ScanLoadProvider above it');
  }
  return ctx;
};
