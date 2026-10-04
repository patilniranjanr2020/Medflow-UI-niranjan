import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataPage } from '../../../shared/components/DataPage';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Avatar } from '../../../shared/components/Avatar/Avatar';
import { useToast } from '../../../shared/components/Toast/Toast';
import { usersApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import { formatDateTime, humanize, statusTone } from '../../../core/utils/format';
import type { UserAccount } from '../../../core/api/types';
import { UserFormModal } from '../components/UserFormModal';
import { UserDetailModal } from '../components/UserDetailModal';
import { DeactivateUserModal } from '../components/DeactivateUserModal';

export default function UsersPage() {
  const { show } = useToast();
  const { can, user: currentUser } = useAuth();
  const [version, setVersion] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [userToEdit, setUserToEdit] = useState<UserAccount | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<UserAccount | null>(null);

  const canManage = can('users:write');

  async function toggleStatus(row: UserAccount) {
    const next = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await usersApi.changeStatus(row.id, next);
      show({ title: `${row.fullName} is now ${next.toLowerCase()}`, tone: 'success' });
      setVersion((v) => v + 1);
    } catch (cause) {
      show({
        title: 'Could not change the account status',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    }
  }

  return (
    <>
    <DataPage<UserAccount>
      title="User Management"
      description="Staff accounts, their role and access to the workspace."
      actions={canManage ? <Button leftIcon={<Plus size={16} />} onClick={() => setIsAddOpen(true)}>Add user</Button> : undefined}
      searchPlaceholder="Search by name or email…"
      rowKey={(row) => row.id}
      deps={[version]}
      load={({ page, size, query }) => usersApi.list({ page, size, query })}
      emptyMessage="No accounts match this search."
      onRowClick={(row) => setSelectedUserId(row.id)}
      columns={[
        {
          key: 'name',
          header: 'User',
          render: (row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-3)' }}>
              <Avatar name={row.fullName} size="sm" />
              <div>
                <div>{row.fullName}</div>
                <small style={{ color: 'var(--mf-text-muted)' }}>{row.email}</small>
              </div>
            </div>
          ),
        },
        { key: 'role', header: 'Role', render: (row) => row.roleName ?? humanize(row.roleCode) },
        { key: 'phone', header: 'Phone', render: (row) => row.phone ?? '—' },
        { key: 'lastLogin', header: 'Last sign-in', render: (row) => formatDateTime(row.lastLoginAt) },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <Badge tone={statusTone(row.status)} dot>
              {humanize(row.status)}
            </Badge>
          ),
        },
        {
          key: 'action',
          header: '',
          align: 'right',
          render: (row) =>
            canManage && row.id !== currentUser?.id ? (
              <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); void toggleStatus(row); }}>
                {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            ) : null,
        },
      ]}
    />
    <UserFormModal
      isOpen={isAddOpen || Boolean(userToEdit)}
      user={userToEdit}
      onClose={() => { setIsAddOpen(false); setUserToEdit(null); }}
      onSaved={() => { setIsAddOpen(false); setUserToEdit(null); setVersion((current) => current + 1); }}
    />
    <UserDetailModal
      userId={selectedUserId}
      canManage={canManage}
      isCurrentUser={(id) => id === currentUser?.id}
      onClose={() => setSelectedUserId(undefined)}
      onEdit={(user) => { setSelectedUserId(undefined); setUserToEdit(user); }}
      onDelete={(user) => { setSelectedUserId(undefined); setUserToDeactivate(user); }}
    />
    <DeactivateUserModal
      user={userToDeactivate}
      isOpen={Boolean(userToDeactivate)}
      onClose={() => setUserToDeactivate(null)}
      onDeactivated={() => { setUserToDeactivate(null); setVersion((current) => current + 1); }}
    />
    </>
  );
}
