import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Alert } from '../../../shared/components/Alert/Alert';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { pharmacyApi } from '../../../core/api/services';
import type { Medication } from '../../../core/api/types';
import { AlertTriangle } from 'lucide-react';

interface Props {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (medicationId: number) => void;
}

export function DeleteMedicineModal({ medication, isOpen, onClose, onDeleted }: Props) {
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!medication) return null;

  async function handleDelete() {
    if (!medication) return;
    setSubmitting(true);
    setError(null);
    try {
      await pharmacyApi.delete(medication.id);
      show({
        title: `${medication.name} removed from active catalogue`,
        tone: 'success',
      });
      onDeleted(medication.id);
      onClose();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : 'Could not delete medication. Please try again.';
      setError(message);
      show({ title: 'Delete failed', description: message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete medication"
      size="sm"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mf-space-3)' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            isLoading={submitting}
            onClick={handleDelete}
            style={{ backgroundColor: 'var(--mf-coral-600)', borderColor: 'var(--mf-coral-600)' }}
          >
            Delete medication
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
        {error && (
          <Alert tone="danger" title="Error deleting medication">
            {error}
          </Alert>
        )}

        <div style={{ display: 'flex', gap: 'var(--mf-space-3)', alignItems: 'flex-start' }}>
          <div
            style={{
              padding: 'var(--mf-space-2)',
              borderRadius: 'var(--mf-radius-full)',
              backgroundColor: 'var(--mf-coral-50)',
              color: 'var(--mf-coral-600)',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ margin: '0 0 var(--mf-space-2)', fontWeight: 600, fontSize: 'var(--mf-fs-base)' }}>
              Are you sure you want to remove &ldquo;{medication.name}&rdquo;?
            </p>
            <p style={{ margin: 0, fontSize: 'var(--mf-fs-sm)', color: 'var(--mf-ink-600)', lineHeight: 1.5 }}>
              This action will soft-delete the medication from the active catalogue. Prescriptions, past dispensing records, and transaction logs will be safely preserved in history.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
