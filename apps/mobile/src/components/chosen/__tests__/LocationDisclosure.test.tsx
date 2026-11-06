/**
 * The location disclosure (audit B5, Play's review rule): the prominent
 * in-app disclosure for the background location.
 *
 * The contract the release check and the flows pin: the body is the ONE
 * legal text (`BACKGROUND_LOCATION_DISCLOSURE`), the privacy policy link is
 * on the sheet, the one action carries a button role, a label and the 48 pt
 * floor, and nothing renders when the sheet is not visible.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { touch } from '@courier/design-tokens/chosen';

import { ChosenProvider } from '../context';
import { LocationDisclosure } from '../LocationDisclosure';
import { styleOf } from '../test-support';
import { BACKGROUND_LOCATION_DISCLOSURE, PRIVACY_POLICY_URL } from '@/constants/legal';

const mockOpenURL = jest.fn((_url: string) => Promise.resolve());
jest.mock('expo-linking', () => ({ openURL: (url: string) => mockOpenURL(url) }));

const renderDisclosure = (overrides: Partial<React.ComponentProps<typeof LocationDisclosure>> = {}) => {
  const onContinue = jest.fn();
  render(
    <ChosenProvider mode="light">
      <LocationDisclosure visible onContinue={onContinue} {...overrides} />
    </ChosenProvider>,
  );
  return { onContinue };
};

describe('the location disclosure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the ONE legal text, the privacy link and the one action', () => {
    renderDisclosure();

    expect(screen.getByTestId('location-disclosure')).toBeTruthy();
    expect(screen.getByTestId('location-disclosure-body')).toHaveTextContent(
      BACKGROUND_LOCATION_DISCLOSURE,
    );
    expect(screen.getByTestId('location-disclosure-privacy')).toBeTruthy();
    expect(screen.getByTestId('location-disclosure-continue')).toHaveTextContent('Continue');
  });

  it('renders nothing when it is not visible', () => {
    renderDisclosure({ visible: false });

    expect(screen.queryByTestId('location-disclosure')).toBeNull();
    expect(screen.queryByTestId('location-disclosure-body')).toBeNull();
  });

  it('the action is a labelled button on the 48 pt floor, and it continues', () => {
    const { onContinue } = renderDisclosure();

    const action = screen.getByTestId('location-disclosure-continue');
    expect(action.props.accessibilityRole).toBe('button');
    expect(action.props.accessibilityLabel).toBe('Continue');
    expect(styleOf(action).minHeight).toBe(touch.minimum);

    fireEvent.press(action);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('the settings mode spells the action Done', () => {
    renderDisclosure({ continueLabel: 'Done' });

    expect(screen.getByTestId('location-disclosure-continue')).toHaveTextContent('Done');
    expect(screen.getByTestId('location-disclosure-continue').props.accessibilityLabel).toBe('Done');
  });

  it('the privacy link opens the ONE policy URL, as a link', () => {
    renderDisclosure();

    const link = screen.getByTestId('location-disclosure-privacy');
    expect(link.props.accessibilityRole).toBe('link');
    expect(link.props.accessibilityLabel).toBe('Privacy policy');

    fireEvent.press(link);
    expect(mockOpenURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });
});
