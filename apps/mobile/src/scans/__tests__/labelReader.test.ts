/**
 * The label reader: the seam between the camera and the run.
 *
 * The reading is the part the platforms disagree on: react-native-vision-camera
 * 5.2.3 ships its object scanner (useObjectOutput) on iOS only, and Android
 * needs an ML Kit text-recognition plugin - a native dependency and its own
 * slice. So the reader is a seam with two honest implementations: the mock
 * reader the E2E build drives, and the camera reader that says it cannot
 * read a label yet instead of pretending it did.
 */
import { createCameraLabelReader, createMockLabelReader } from '../labelReader';

describe('the mock label reader', () => {
  it('reads the labels it was given, one after the other', async () => {
    const reader = createMockLabelReader(
      [
        { address: '45 Papanui Road', suburb: 'Merivale' },
        { address: '120 Blenheim Road', suburb: 'Upper Riccarton' },
      ],
      0,
    );

    await expect(reader.read()).resolves.toEqual({
      kind: 'found',
      match: { address: '45 Papanui Road', suburb: 'Merivale' },
    });
    await expect(reader.read()).resolves.toEqual({
      kind: 'found',
      match: { address: '120 Blenheim Road', suburb: 'Upper Riccarton' },
    });
  });

  it('comes back to the first label when the run of them is over', async () => {
    const reader = createMockLabelReader([{ address: '45 Papanui Road', suburb: 'Merivale' }], 0);

    await reader.read();
    await expect(reader.read()).resolves.toEqual({
      kind: 'found',
      match: { address: '45 Papanui Road', suburb: 'Merivale' },
    });
  });

  it('waits for the beat before it answers', async () => {
    jest.useFakeTimers();
    try {
      const reader = createMockLabelReader([{ address: '45 Papanui Road', suburb: 'Merivale' }], 900);

      const reading = reader.read();
      jest.advanceTimersByTime(900);

      await expect(reading).resolves.toEqual({
        kind: 'found',
        match: { address: '45 Papanui Road', suburb: 'Merivale' },
      });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('the camera label reader', () => {
  it('says it cannot read a label, and says why', async () => {
    const reading = await createCameraLabelReader().read();

    expect(reading.kind).toBe('unavailable');
    if (reading.kind === 'unavailable') {
      expect(reading.reason).toMatch(/Android/i);
    }
  });
});
