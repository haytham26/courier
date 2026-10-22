/**
 * The stop markers of the map.
 *
 * The number on a marker is painted on a disc of the status colour, so the
 * pair has to clear the contrast bar of the contract in every theme. The
 * numbers are measured here, not assumed.
 */
import { contrastRatio } from '@courier/design-tokens/contrast';
import { themes } from '@courier/design-tokens/themes';

import { markerLabelColor, statusColor, type StopStatus } from '../stops';

const STATUSES: StopStatus[] = ['pending', 'active', 'delivered', 'failed', 'skipped'];

describe('the number on a stop marker', () => {
  for (const theme of Object.values(themes)) {
    it(`reads on every status colour of the ${theme.name} theme`, () => {
      for (const status of STATUSES) {
        const disc = statusColor(status, theme);
        const label = markerLabelColor(status, theme);
        const ratio = contrastRatio(label, disc);

        if (ratio < 4.5) {
          throw new Error(
            `the ${theme.name} label ${label} on the ${status} disc ${disc} is ${ratio.toFixed(2)}:1`,
          );
        }
      }
    });
  }
});
