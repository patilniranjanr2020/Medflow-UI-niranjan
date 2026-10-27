import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/services';
import type { AuthSession } from '../api/types';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/services', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
  },
}));

const adminSession = {
  accessToken: 'admin-token',
  tokenType: 'Bearer',
  expiresAt: '2027-01-01T00:00:00Z',
  user: {
    id: 1,
    hospitalId: 1,
    userUid: 'admin-user',
    firstName: 'Admin',
    fullName: 'Admin User',
    email: 'admin@example.com',
    roleId: 1,
    roleCode: 'ADMIN',
    roleName: 'Administrator',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  },
  permissions: [],
} as AuthSession;

const staffSession: AuthSession = {
  ...adminSession,
  user: { ...adminSession.user, id: 2, roleCode: 'DOCTOR', roleName: 'Doctor' },
};

function PermissionProbe() {
  const { can, login } = useAuth();

  return (
    <>
      <output>{String(can('users:write'))}</output>
      <button onClick={() => void login('user@example.com', 'password')}>Sign in</button>
    </>
  );
}

describe('AuthContext permissions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('grants UI permissions to administrators even when the cached permission list is empty', async () => {
    vi.mocked(authApi.login).mockResolvedValue(adminSession);
    render(<AuthProvider><PermissionProbe /></AuthProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('true')).toBeDefined();
  });

  it('does not grant unrelated permissions to non-administrators', async () => {
    vi.mocked(authApi.login).mockResolvedValue(staffSession);
    render(<AuthProvider><PermissionProbe /></AuthProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('false')).toBeDefined();
  });
});