/**
 * The navigation hand-off (queue 4.1: the free Google Maps deep link).
 *
 * The hand-off is the drive's way out to a nav app: the destination is the
 * run's own stop, the link is Google's key-free direction URL, and a stop with
 * no coordinates is not handed anywhere.
 */
jest.mock('expo-linking', () => ({ openURL: jest.fn(() => Promise.resolve()) }));

const linking = jest.requireMock<{ openURL: jest.Mock }>('expo-linking');

import { handOffToNavApp, navDeepLink } from '../navHandoff';

const DESTINATION = {
  lat: -43.532,
  lng: 172.599,
  label: '12 Riccarton Road, Riccarton',
};

describe('the navigation hand-off', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hands the run\u2019s own stop to the nav app with the key-free deep link', async () => {
    await handOffToNavApp(DESTINATION);

    expect(linking.openURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=-43.532,172.599&query=12%20Riccarton%20Road%2C%20Riccarton',
    );
  });

  it('answers handed when the nav app took the link', async () => {
    await expect(handOffToNavApp(DESTINATION)).resolves.toEqual({ status: 'handed' });
  });

  it('answers nowhere when the stop has no coordinates', async () => {
    await expect(handOffToNavApp(null)).resolves.toEqual({ status: 'nowhere' });
    await expect(
      handOffToNavApp({ lat: Number.NaN, lng: 172.6, label: 'x' }),
    ).resolves.toEqual({ status: 'nowhere' });
    expect(linking.openURL).not.toHaveBeenCalled();
  });

  it('answers failed, with the phone\u2019s own words, when nothing takes the link', async () => {
    linking.openURL.mockRejectedValue(new Error('no app answers the link'));

    await expect(handOffToNavApp(DESTINATION)).resolves.toEqual({
      status: 'failed',
      message: 'no app answers the link',
    });
  });

  it('builds the link from the coordinates the run holds', () => {
    expect(navDeepLink({ lat: -43.53, lng: 172.6, label: 'A B' })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-43.53,172.6&query=A%20B',
    );
  });
});
