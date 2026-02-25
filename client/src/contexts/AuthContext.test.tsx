import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const mockGetCurrentUser = jest.fn();

jest.mock('../services/api', () => ({
  AUTH_UNAUTHORIZED_EVENT: 'asuopt:auth-unauthorized',
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  },
}));

const Probe = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="auth">{String(isAuthenticated)}</div>
      <div data-testid="user">{user?.username ?? 'none'}</div>
    </div>
  );
};

describe('AuthContext unauthorized flow', () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetCurrentUser.mockReset();
  });

  it('clears auth state on unauthorized event without hard redirect', async () => {
    const originalHref = window.location.href;

    localStorage.setItem('token', 'token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: 'tester',
        email: 'tester@example.com',
        role: 'user',
      })
    );

    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      username: 'tester',
      email: 'tester@example.com',
      role: 'user',
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('tester');
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('asuopt:auth-unauthorized'));
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(window.location.href).toBe(originalHref);
  });
});

