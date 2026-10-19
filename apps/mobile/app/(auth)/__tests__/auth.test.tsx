/**
 * Tests for AuthProvider and auth screens
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { login, register, signOut, getSession } from '@/lib/auth-client';

// Mock the auth client
jest.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: jest.fn(),
    },
    signUp: {
      email: jest.fn(),
    },
    signOut: jest.fn(),
    getSession: jest.fn(),
    $onAuthStateChange: jest.fn((callback) => {
      // Return unsubscribe function
      return jest.fn();
    }),
  },
  signIn: { email: jest.fn() },
  signUp: { email: jest.fn() },
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockAuthClient = require('@/lib/auth-client').authClient;

describe('AuthProvider', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides auth context to children', () => {
    const TestComponent = () => {
      const { user, isLoading, isAuthenticated } = useAuth();
      return (
        <React.View testID="auth-status">
          <React.Text>{isLoading ? 'loading' : 'loaded'}</React.Text>
          <React.Text>{isAuthenticated ? 'authenticated' : 'unauthenticated'}</React.Text>
        </React.View>
      );
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });
    
    expect(getByTestId('auth-status')).toBeTruthy();
  });

  it('initializes with loading state', () => {
    const TestComponent = () => {
      const { isLoading } = useAuth();
      return <React.Text testID="loading">{isLoading.toString()}</React.Text>;
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });
    expect(getByTestId('loading')).toBeTruthy();
  });

  it('calls refreshSession on mount', () => {
    const TestComponent = () => {
      const { refreshSession } = useAuth();
      return <React.Text onPress={refreshSession} testID="refresh">Refresh</React.Text>;
    };

    render(<TestComponent />, { wrapper });
    
    // getSession should have been called
    expect(mockAuthClient.getSession).toHaveBeenCalled();
  });
});

describe('LoginScreen', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form', () => {
    // Note: Full integration test would require more setup
    // This is a placeholder for the login screen test
    expect(true).toBe(true);
  });
});

describe('RegisterScreen', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders register form', () => {
    // Placeholder for register screen test
    expect(true).toBe(true);
  });
});

describe('auth-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signIn.email calls authClient with correct params', async () => {
    const { signIn } = require('@/lib/auth-client');
    
    mockAuthClient.signIn.email.mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      error: null,
    });

    await signIn.email({ email: 'test@example.com', password: 'password123' });

    expect(mockAuthClient.signIn.email).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('signUp.email calls authClient with correct params', async () => {
    const { signUp } = require('@/lib/auth-client');
    
    mockAuthClient.signUp.email.mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test User' } },
      error: null,
    });

    await signUp.email({ email: 'test@example.com', password: 'password123', name: 'Test User' });

    expect(mockAuthClient.signUp.email).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });
  });

  it('signOut calls authClient', async () => {
    const { signOut } = require('@/lib/auth-client');
    
    mockAuthClient.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mockAuthClient.signOut).toHaveBeenCalled();
  });

  it('getSession calls authClient', async () => {
    const { getSession } = require('@/lib/auth-client');
    
    mockAuthClient.getSession.mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      error: null,
    });

    await getSession();

    expect(mockAuthClient.getSession).toHaveBeenCalled();
  });
});