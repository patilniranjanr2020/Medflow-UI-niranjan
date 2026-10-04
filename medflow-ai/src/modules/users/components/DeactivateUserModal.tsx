import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Button } from '../../../shared/components/Button/Button';
import { Modal } from '../../../shared/components/Modal/Modal';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { usersApi } from '../../../core/api/services';
import type { UserAccount } from '../../../core/api/types';

interface Props {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onDeactivated: () => void;
}

export function DeactivateUserModal({ user, isOpen, onClose, onDeactivated }: Props) {
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function confirm() {
    if (!user || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await usersApi.changeStatus(user.id, 'INACTIVE');
      show({ title: 'User deactivated', description: 'The account and audit history have been retained.', tone: 'success' });
      onDeactivated();
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : 'Could not deactivate user. Please try again.';
      setError(message);
      show({ title: 'Could not deactivate user', description: message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!submitting) onClose(); }}
      title="Delete user"
      description="Confirm this account status change."
      size="sm"
      footer={<><Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button><Button variant="danger" leftIcon={<Trash2 size={15} />} isLoading={submitting} onClick={confirm}>Deactivate user</Button></>}
    >
      <div style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
        {error && <Alert tone="danger" title="Deactivation failed">{error}</Alert>}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--mf-space-3)' }}>
          <AlertTriangle size={22} color="var(--mf-coral-600)" aria-hidden="true" />
          <p style={{ margin: 0 }}><strong>{user.fullName}</strong> will be unable to sign in. The account and its audit history will be retained; this does not permanently erase the user.</p>
        </div>
      </div>
    </Modal>
  );
}