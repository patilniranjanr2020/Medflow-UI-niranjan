import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Badge } from '../../../shared/components/Badge/Badge';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { laboratoryApi } from '../../../core/api/services';
import { humanize, statusTone } from '../../../core/utils/format';
import type { LabOrder } from '../../../core/api/types';

interface Props {
  order: LabOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (order: LabOrder) => void;
}

export function EditResultModal({ order, isOpen, onClose, onSaved }: Props) {
  const { show } = useToast();
  const [resultSummary, setResultSummary] = useState('');
  const [signOff, setSignOff] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !order) return;
    setResultSummary(order.resultSummary ?? '');
    setSignOff(true);
    setError(null);
  }, [isOpen, order]);

  if (!order) return null;

  const isSignedOff = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!resultSummary.trim()) {
      setError('Please enter a result summary');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let updated: LabOrder;
      if (signOff) {
        // Complete the lab order with formal sign-off
        updated = await laboratoryApi.complete(order!.id, resultSummary.trim());
        show({ title: 'Result signed off and completed', tone: 'success' });
      } else {
        // Save in-progress preliminary result
        updated = await laboratoryApi.update(order!.id, {
          testName: order!.testName,
          priority: order!.priority,
          resultSummary: resultSummary.trim(),
        });
        show({ title: 'Result updated', tone: 'success' });
      }
      onSaved(updated);
      onClose();
    } catch (cause) {
      const msg = cause instanceof ApiError ? cause.message : 'Could not record test result';
      setError(msg);
      show({ title: 'Result update failed', description: msg, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSignedOff ? 'Signed-off result' : 'Record laboratory result'}
      description={`${order.testName} for ${order.patientName}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {isSignedOff || isCancelled ? 'Close' : 'Cancel'}
          </Button>
          {!isSignedOff && !isCancelled && (
            <Button type="submit" form="edit-result-form" isLoading={submitting}>
              {signOff ? 'Sign off result' : 'Save as preliminary'}
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)' }}>
          <span style={{ fontSize: 'var(--mf-fs-sm)', color: 'var(--mf-ink-500)' }}>Status:</span>
          <Badge tone={statusTone(order.status)} dot>
            {humanize(order.status)}
          </Badge>
          <span style={{ fontSize: 'var(--mf-fs-sm)', color: 'var(--mf-ink-500)', marginLeft: 'auto' }}>
            Ordered by {order.doctorName}
          </span>
        </div>

        {isSignedOff ? (
          <Alert tone="info" title="Permanent clinical record">
            This laboratory result has been signed off and closed. In accordance with clinical audit policies, signed-off results are read-only.
            <div
              style={{
                marginTop: 'var(--mf-space-3)',
                padding: 'var(--mf-space-3)',
                background: 'var(--mf-bg-subtle)',
                borderRadius: 'var(--mf-radius-md)',
                fontWeight: 500,
              }}
            >
              {order.resultSummary || 'No summary recorded'}
            </div>
          </Alert>
        ) : isCancelled ? (
          <Alert tone="danger" title="Order cancelled">
            This laboratory order was cancelled and cannot accept new results.
          </Alert>
        ) : (
          <form id="edit-result-form" onSubmit={submit} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
            {error && (
              <Alert tone="danger" title="Error">
                {error}
              </Alert>
            )}

            <div className="mf-input-group">
              <label className="mf-label" htmlFor="result-summary-text">
                Result Summary *
              </label>
              <textarea
                id="result-summary-text"
                className="mf-input"
                rows={4}
                value={resultSummary}
                placeholder="Enter clinical findings, values, and reference interpretations…"
                onChange={(e) => {
                  setResultSummary(e.target.value);
                  if (error) setError(null);
                }}
                style={{ width: '100%', resize: 'vertical' }}
                autoFocus
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={signOff}
                onChange={(e) => setSignOff(e.target.checked)}
              />
              <span style={{ fontSize: 'var(--mf-fs-sm)', color: 'var(--mf-ink-700)' }}>
                Sign off and finalize this result (marks order as COMPLETED)
              </span>
            </label>
          </form>
        )}
      </div>
    </Modal>
  );
}
