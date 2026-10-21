/**
 * Tests for the biometric unlock.
 *
 * The unlock is a convenience: the app never refuses to open because the
 * fingerprint did not work. These tests check that promise.
 *
 * The phone is mocked: there is no scanner in a test run.
 */
import { biometricSupport, unlockWithBiometrics } from '@/lib/biometric';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

/** The phone, as the test drives it. */
interface LocalAuthenticationMock {
  hasHardwareAsync: jest.Mock<Promise<boolean>, []>;
  isEnrolledAsync: jest.Mock<Promise<boolean>, []>;
  authenticateAsync: jest.Mock<Promise<{ success: boolean; error?: string }>, []>;
}

const mockLocalAuthentication = jest.requireMock<LocalAuthenticationMock>(
  'expo-local-authentication',
);

describe('the biometric unlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });
  });

  it('offers the unlock when the phone has a scanner and a fingerprint', async () => {
    const support = await biometricSupport();

    expect(support.hardware).toBe(true);
    expect(support.enrolled).toBe(true);
    expect(support.reason).toBe('');
  });

  it('says so when the phone has no scanner', async () => {
    mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(false);

    const support = await biometricSupport();

    expect(support.hardware).toBe(false);
    expect(support.enrolled).toBe(false);
    expect(support.reason).not.toBe('');
  });

  it('says so when no fingerprint is set up', async () => {
    mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(false);

    const support = await biometricSupport();

    expect(support.hardware).toBe(true);
    expect(support.enrolled).toBe(false);
    expect(support.reason).not.toBe('');
  });

  it('never breaks when the scanner is not there', async () => {
    mockLocalAuthentication.hasHardwareAsync.mockRejectedValue(new Error('no scanner'));

    const support = await biometricSupport();

    expect(support.hardware).toBe(false);
    expect(support.reason).not.toBe('');
  });

  it('unlocks when the courier is recognised', async () => {
    const unlocked = await unlockWithBiometrics();

    expect(unlocked).toBe(true);
    expect(mockLocalAuthentication.authenticateAsync).toHaveBeenCalled();
  });

  it('does not unlock when the courier cancels', async () => {
    mockLocalAuthentication.authenticateAsync.mockResolvedValue({
      success: false,
      error: 'user_cancel',
    });

    const unlocked = await unlockWithBiometrics();

    expect(unlocked).toBe(false);
  });

  it('does not unlock when the phone throws', async () => {
    mockLocalAuthentication.authenticateAsync.mockRejectedValue(new Error('no scanner'));

    const unlocked = await unlockWithBiometrics();

    expect(unlocked).toBe(false);
  });
});
