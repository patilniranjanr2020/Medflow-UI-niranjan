import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Select } from '../../../shared/components/Select/Select';
import { Alert } from '../../../shared/components/Alert/Alert';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { doctorsApi, laboratoryApi } from '../../../core/api/services';
import type { Doctor, LabOrder } from '../../../core/api/types';

interface Props {
  order: LabOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (order: LabOrder) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'ROUTINE', label: 'Routine' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'STAT', label: 'STAT (Immediate)' },
];

export function EditLabOrderModal({ order, isOpen, onClose, onUpdated }: Props) {
  const { show } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [testName, setTestName] = useState('');
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [resultSummary, setResultSummary] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !order) return;
    setTestName(order.testName);
    setPriority(order.priority);
    setDoctorId(String(order.doctorId));
    setResultSummary(order.resultSummary ?? '');
    setErrors({});

    doctorsApi.list({ size: 100 })
      .then((res) => setDoctors(res.content))
      .catch(() => {});
  }, [isOpen, order]);

  if (!order) return null;

  const isSignedOff = order.status === 'COMPLETED';

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!testName.trim()) {
      nextErrors.testName = 'Test name is required';
    } else if (testName.trim().length > 150) {
      nextErrors.testName = 'Test name cannot exceed 150 characters';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) {
      show({ title: 'Please complete all required fields', tone: 'danger' });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await laboratoryApi.update(order!.id, {
        testName: testName.trim(),
        priority,
        doctorId: doctorId ? Number(doctorId) : undefined,
        resultSummary: isSignedOff ? undefined : (resultSummary.trim() || undefined),
      });
      show({ title: 'Lab order updated', tone: 'success' });
      onUpdated(updated);
      onClose();
    } catch (cause) {
      show({
        title: 'Could not update laboratory order',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const doctorOptions = doctors.map((d) => ({
    value: String(d.id),
    label: `${d.fullName} (${d.specialty})`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit laboratory order"
      description={`Order #${order.id} for ${order.patientName}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-lab-order-form" isLoading={submitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-lab-order-form" onSubmit={submit} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
        <Input
          label="Test name *"
          value={testName}
          error={errors.testName}
          onChange={(e) => setTestName(e.target.value)}
        />

        <Select
          label="Priority *"
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={(e) => setPriority(e.target.value as 'ROUTINE' | 'URGENT' | 'STAT')}
        />

        {doctorOptions.length > 0 && (
          <Select
            label="Ordering Clinician"
            value={doctorId}
            options={doctorOptions}
            onChange={(e) => setDoctorId(e.target.value)}
          />
        )}

        {isSignedOff ? (
          <Alert tone="info" title="Result signed off (Read-only)">
            Results for completed orders are permanently signed off for audit compliance. To record an amended report, order a follow-up test.
            <div style={{ marginTop: 'var(--mf-space-2)', fontStyle: 'italic' }}>
              Current result: {order.resultSummary ?? 'None recorded'}
            </div>
          </Alert>
        ) : (
          <div className="mf-input-group">
            <label className="mf-label" htmlFor="edit-result-summary">
              Result summary (optional for in-progress tests)
            </label>
            <textarea
              id="edit-result-summary"
              className="mf-input"
              rows={3}
              value={resultSummary}
              placeholder="e.g. Normal values, preliminary findings"
              onChange={(e) => setResultSummary(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
