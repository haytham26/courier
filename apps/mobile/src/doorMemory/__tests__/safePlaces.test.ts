/**
 * The safe places: the choices the courier has when they say where a parcel
 * can be left.
 */
import { SAFE_PLACES, isSafePlace, safePlaceLabel } from '../safePlaces';

describe('the safe places', () => {
  it('has the ten places a courier uses', () => {
    expect(SAFE_PLACES).toHaveLength(10);
    expect(SAFE_PLACES).toContain('porch');
    expect(SAFE_PLACES).toContain('letterbox');
    expect(SAFE_PLACES).toContain('under the mat');
    expect(SAFE_PLACES).toContain('on the porch');
    expect(SAFE_PLACES).toContain('side gate');
    expect(SAFE_PLACES).toContain('back door');
    expect(SAFE_PLACES).toContain('reception');
    expect(SAFE_PLACES).toContain('neighbour');
    expect(SAFE_PLACES).toContain('shed');
    expect(SAFE_PLACES).toContain('safe place');
  });

  it('knows the places it has and turns down the ones it does not', () => {
    expect(isSafePlace('side gate')).toBe(true);
    expect(isSafePlace('roof')).toBe(false);
    expect(isSafePlace(null)).toBe(false);
  });

  it('reads the place the way a courier says it', () => {
    expect(safePlaceLabel('under the mat')).toBe('Under the mat');
    expect(safePlaceLabel('SAFE PLACE')).toBe('Safe place');
    expect(safePlaceLabel('side gate')).toBe('Side gate');
  });

  it('has no name for nothing', () => {
    expect(safePlaceLabel(null)).toBeNull();
    expect(safePlaceLabel('   ')).toBeNull();
  });
});
