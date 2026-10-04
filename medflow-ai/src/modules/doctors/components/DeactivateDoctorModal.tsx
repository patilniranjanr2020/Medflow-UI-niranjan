import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Button } from '../../../shared/components/Button/Button';
import { Modal } from '../../../shared/components/Modal/Modal';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { doctorsApi } from '../../../core/api/services';
import type { Doctor } from '../../../core/api/types';

interface Props {
  doctor: Doctor | null;
  isOpen: boolean;
  onClose: () => void;
  onDeactivated: () => void;
}

export function DeactivateDoctorModal({ doctor, isOpen, onClose, onDeactivated }: Props) {
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function confirm() {
    if (!doctor || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await doctorsApi.changeStatus(doctor.id, 'INACTIVE');
      show({ title: 'Doctor deactivated', description: 'The profile and linked clinical history have been preserved.', tone: 'success' });
      onDeactivated();
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : 'Could not deactivate doctor. Please try again.';
      setError(message);
      show({ title: 'Could not deactivate doctor', description: message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!doctor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!submitting) onClose(); }}
      title="Delete doctor"
      description="Confirm this account status change."
      size="sm"
      footer={<><Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button><Button variant="danger" leftIcon={<Trash2 size={15} />} isLoading={submitting} onClick={confirm}>Deactivate doctor</Button></>}
    >
      <div style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
        {error && <Alert tone="danger" title="Deactivation failed">{error}</Alert>}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--mf-space-3)' }}>
          <AlertTriangle size={22} color="var(--mf-coral-600)" aria-hidden="true" />
          <p style={{ margin: 0 }}><strong>{doctor.fullName}</strong> will be deactivated and will no longer be able to sign in or receive appointments. The doctor profile, appointments, prescriptions, and audit history will be retained.</p>
        </div>
      </div>
    </Modal>
  );
}