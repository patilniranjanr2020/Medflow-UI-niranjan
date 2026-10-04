import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import UsersPage from './UsersPage';
import { accessApi, usersApi } from '../../../core/api/services';
import { ToastProvider } from '../../../shared/components/Toast/Toast';
import type { Role, UserAccount } from '../../../core/api/types';

vi.mock('../../../core/auth/AuthContext', () => ({ useAuth: () => ({ can: () => true, user: { id: 1 } }) }));
vi.mock('../../../core/api/services', () => ({
  accessApi: { roles: vi.fn() },
  usersApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), changeStatus: vi.fn(), changeRole: vi.fn() },
}));

const role: Role = { id: 3, roleCode: 'RECEPTIONIST', roleName: 'Receptionist', permissions: [] };
const user: UserAccount = {
  id: 2,
  hospitalId: 1,
  userUid: 'USR-0002',
  firstName: 'Nikita',
  lastName: 'Sharma',
  fullName: 'Nikita Sharma',
  email: 'nikita@example.com',
  phone: '+91 9876543210',
  gender: 'FEMALE',
  dateOfBirth: '1995-03-21',
  roleId: role.id,
  roleCode: role.roleCode,
  roleName: role.roleName,
  status: 'ACTIVE',
  lastLoginAt: '2026-10-02T10:14:00Z',
  createdAt: '2026-01-01T00:00:00Z',
};
const page = { content: [user], page: 0, size: 10, totalElements: 1, totalPages: 1 };

function renderPage() {
  return render(<ToastProvider><UsersPage /></ToastProvider>);
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.list).mockResolvedValue(page);
    vi.mocked(usersApi.get).mockResolvedValue(user);
    vi.mocked(accessApi.roles).mockResolvedValue([role]);
  });

  it('creates a user with a role from the backend role list', async () => {
    vi.mocked(usersApi.create).mockResolvedValue(user);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /add user/i }));
    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'Nikita' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'nikita@example.com' } });
    fireEvent.change(screen.getByLabelText('Temporary password *'), { target: { value: 'securepass123' } });
    await screen.findByRole('option', { name: 'Receptionist' });
    fireEvent.change(screen.getByLabelText('Role *'), { target: { value: 'RECEPTIONIST' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add user' }));

    await waitFor(() => expect(usersApi.create).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Nikita', email: 'nikita@example.com', rawPassword: 'securepass123', roleCode: 'RECEPTIONIST',
    })));
  });

  it('opens a row detail and edits only profile fields', async () => {
    vi.mocked(usersApi.update).mockResolvedValue({ ...user, firstName: 'Nita' });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Nikita Sharma/ }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Nikita Sharma' })).toBeDefined();
    expect(within(screen.getByRole('dialog')).getByText('nikita@example.com')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'Nita' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(usersApi.update).toHaveBeenCalledWith(2, expect.objectContaining({ firstName: 'Nita' })));
    expect(usersApi.update).toHaveBeenCalledWith(2, expect.not.objectContaining({ email: expect.anything(), roleCode: expect.anything() }));
  });

  it('confirms deactivation instead of deleting the account', async () => {
    vi.mocked(usersApi.changeStatus).mockResolvedValue({ ...user, status: 'INACTIVE' });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Nikita Sharma/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete user' }));
    expect(screen.getByText(/account and its audit history will be retained/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate user' }));

    await waitFor(() => expect(usersApi.changeStatus).toHaveBeenCalledWith(2, 'INACTIVE'));
    expect(usersApi).not.toHaveProperty('delete');
  });

  it('keeps the inline status action from opening the detail window', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(usersApi.changeStatus).toHaveBeenCalledWith(2, 'INACTIVE'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});