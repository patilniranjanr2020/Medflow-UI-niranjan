import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Alert } from '../../../shared/components/Alert/Alert';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { prescriptionsApi } from '../../../core/api/services';
import type { Prescription } from '../../../core/api/types';

interface Props {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeletePrescriptionModal({ prescription, isOpen, onClose, onDeleted }: Props) {
  const { show } = useToast();
  const [deleting, setDeleting] = useState(false);

  if (!prescription) return null;

  const isLocked = prescription.digitallySigned || prescription.status !== 'ACTIVE';

  async function handleDelete() {
    if (!prescription) return;
    setDeleting(true);
    try {
      await prescriptionsApi.delete(prescription.id);
      show({
        title: 'Prescription deleted',
        description: `Prescription #${prescription.id} has been removed`,
        tone: 'success',
      });
      onDeleted();
      onClose();
    } catch (err) {
      show({
        title: 'Could not delete prescription',
        description: err instanceof ApiError ? err.message : 'Please try again later.',
        tone: 'danger',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete prescription">
      {isLocked ? (
        <div style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
          <Alert tone="danger" title="Prescription cannot be deleted">
            {prescription.digitallySigned
              ? 'This prescription is digitally signed and permanently recorded as a legal medical record. Deletion is strictly prohibited.'
              : `This prescription has status ${prescription.status} and cannot be deleted.`}
          </Alert>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
          <p style={{ color: 'var(--mf-ink-700)', lineHeight: 1.5, margin: 0 }}>
            Are you sure you want to delete draft <strong>Prescription #{prescription.id}</strong> for{' '}
            <strong>{prescription.patientName}</strong>? This action cannot be undone.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mf-space-2)' }}>
            <Button variant="outline" onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Confirm delete prescription"
              style={{ background: 'var(--mf-coral-600, #dc2626)', borderColor: 'var(--mf-coral-600, #dc2626)' }}
            >
              {deleting ? 'Deleting…' : 'Delete prescription'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
