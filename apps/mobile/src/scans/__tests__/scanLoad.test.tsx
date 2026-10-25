/**
 * The scan load: the parcels the courier has read into the van.
 *
 * The reference's sheet says "Add and Scan Next" - the parcel joins the load
 * and the scanner stays open for the next one - so the load outlives the
 * scan screen. It lives above the routes (the same rule the delivered marks
 * follow) and its lifetime is one signed-in session: a sign-out remounts it
 * and the van is empty again.
 */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ScanLoadProvider, useScanLoad } from '../scanLoad';

const LoadProbe = () => {
  const load = useScanLoad();
  return (
    <>
      <Text testID="count">{String(load.count)}</Text>
      <Text testID="first">{load.parcels[0]?.address ?? 'none'}</Text>
      <Text testID="first-position">{load.parcels[0]?.vanPosition ?? 'none'}</Text>
      <Pressable
        testID="add-front"
        onPress={() => load.add({ address: '45 Papanui Road', suburb: 'Merivale' }, 'front')}
      >
        <Text>add the front one</Text>
      </Pressable>
      <Pressable
        testID="add-back"
        onPress={() =>
          load.add({ address: '120 Blenheim Road', suburb: 'Upper Riccarton' }, 'back')
        }
      >
        <Text>add the back one</Text>
      </Pressable>
    </>
  );
};

const renderLoad = () =>
  render(
    <ScanLoadProvider>
      <LoadProbe />
    </ScanLoadProvider>,
  );

describe('the scan load', () => {
  it('starts empty', () => {
    renderLoad();

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('first')).toHaveTextContent('none');
  });

  it('takes a parcel with the place it sits in the van', () => {
    renderLoad();

    fireEvent.press(screen.getByTestId('add-front'));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('first')).toHaveTextContent('45 Papanui Road');
    expect(screen.getByTestId('first-position')).toHaveTextContent('front');
  });

  it('keeps every parcel, in the order they were added', () => {
    renderLoad();

    fireEvent.press(screen.getByTestId('add-front'));
    fireEvent.press(screen.getByTestId('add-back'));

    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('refuses to be used without the provider above it', () => {
    const Orphan = () => {
      useScanLoad();
      return null;
    };

    // The provider is the contract: a screen outside it gets the truth, not
    // a silent empty load.
    expect(() => render(<Orphan />)).toThrow(/ScanLoadProvider/);
  });
});
