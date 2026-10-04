import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Avatar } from '../../../shared/components/Avatar/Avatar';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Loading } from '../../../shared/components/Loading/Loading';
import { Modal } from '../../../shared/components/Modal/Modal';
import { usersApi } from '../../../core/api/services';
import type { UserAccount } from '../../../core/api/types';
import { formatDateTime, humanize, statusTone } from '../../../core/utils/format';

interface Props {
  userId?: number;
  canManage: boolean;
  isCurrentUser: (id: number) => boolean;
  onClose: () => void;
  onEdit: (user: UserAccount) => void;
  onDelete: (user: UserAccount) => void;
}

export function UserDetailModal({ userId, canManage, isCurrentUser, onClose, onEdit, onDelete }: Props) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (userId === undefined) {
      setUser(null);
      return;
    }
    let current = true;
    setLoading(true);
    setError(undefined);
    usersApi.get(userId)
      .then((record) => { if (current) setUser(record); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : 'Could not load user details.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [userId]);

  const canChange = Boolean(canManage && user && !isCurrentUser(user.id));

  return (
    <Modal isOpen={userId !== undefined} onClose={onClose} title={user?.fullName ?? 'User details'} description="Staff account, role, and access status." size="lg">
      {canChange && user && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mf-space-2)', marginBottom: 'var(--mf-space-4)' }}>
          <Button size="sm" variant="outline" leftIcon={<Pencil size={15} />} onClick={() => onEdit(user)}>Edit</Button>
          <Button size="sm" variant="outline" leftIcon={<Trash2 size={15} />} title="Deactivate user and retain account history" aria-label="Delete user" disabled={user.status !== 'ACTIVE'} onClick={() => onDelete(user)}>Delete</Button>
        </div>
      )}
      {loading ? <Loading label="Loading user details…" /> : error ? <Alert tone="danger" title="Could not load user">{error}</Alert> : user && (
        <div style={{ display: 'grid', gap: 'var(--mf-space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--mf-space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-3)' }}>
              <Avatar name={user.fullName} size="md" />
              <div><h4 style={{ margin: 0 }}>{user.fullName}</h4><small style={{ color: 'var(--mf-text-muted)' }}>{user.userUid}</small></div>
            </div>
            <Badge tone={statusTone(user.status)} dot>{humanize(user.status)}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--mf-space-4)' }}>
            {[
              ['Email', user.email], ['Role', user.roleName ?? humanize(user.roleCode)], ['Phone', user.phone],
              ['Gender', user.gender ? humanize(user.gender) : undefined], ['Date of birth', user.dateOfBirth],
              ['Last sign-in', user.lastLoginAt ? formatDateTime(user.lastLoginAt) : undefined],
              ['Account created', user.createdAt ? formatDateTime(user.createdAt) : undefined],
            ].map(([label, value]) => <div key={label}><small style={{ color: 'var(--mf-text-muted)' }}>{label}</small><div>{value || '—'}</div></div>)}
          </div>
        </div>
      )}
    </Modal>
  );
}