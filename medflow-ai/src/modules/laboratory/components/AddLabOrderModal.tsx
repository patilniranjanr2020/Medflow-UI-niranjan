import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Select } from '../../../shared/components/Select/Select';
import { Loading } from '../../../shared/components/Loading/Loading';
import { Alert } from '../../../shared/components/Alert/Alert';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { doctorsApi, laboratoryApi, patientsApi } from '../../../core/api/services';
import type { Doctor, LabOrder, Patient } from '../../../core/api/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: LabOrder) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'ROUTINE', label: 'Routine' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'STAT', label: 'STAT (Immediate)' },
];

export function AddLabOrderModal({ isOpen, onClose, onCreated }: Props) {
  const { show } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [testName, setTestName] = useState('');
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setLoadError(null);
    setErrors({});
    setPatientId('');
    setDoctorId('');
    setTestName('');
    setPriority('ROUTINE');

    Promise.all([
      patientsApi.list({ size: 100 }),
      doctorsApi.list({ size: 100 }),
    ])
      .then(([patientsPage, doctorsPage]) => {
        setPatients(patientsPage.content);
        setDoctors(doctorsPage.content);
        if (patientsPage.content.length > 0) {
          setPatientId(String(patientsPage.content[0].id));
        }
        if (doctorsPage.content.length > 0) {
          setDoctorId(String(doctorsPage.content[0].id));
        }
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'Could not load patients or clinicians');
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!patientId) {
      nextErrors.patientId = 'Please select a patient';
    }
    if (!doctorId) {
      nextErrors.doctorId = 'Please select the ordering clinician';
    }
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
      const created = await laboratoryApi.create({
        patientId: Number(patientId),
        doctorId: Number(doctorId),
        testName: testName.trim(),
        priority,
      });
      show({ title: `Order for ${created.testName} created`, tone: 'success' });
      onCreated(created);
      onClose();
    } catch (cause) {
      show({
        title: 'Could not create laboratory order',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const patientOptions = patients.map((p) => ({
    value: String(p.id),
    label: `${p.fullName} (${p.patientCode})`,
  }));

  const doctorOptions = doctors.map((d) => ({
    value: String(d.id),
    label: `${d.fullName} (${d.specialty})`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create laboratory order"
      description="Route a new specimen or test request to the laboratory queue."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="add-lab-order-form" isLoading={submitting}>
            Place order
          </Button>
        </>
      }
    >
      {loading ? (
        <Loading label="Loading patient and clinician directories…" />
      ) : loadError ? (
        <Alert tone="danger" title="Could not load requirements">
          {loadError}
        </Alert>
      ) : (
        <form id="add-lab-order-form" onSubmit={submit} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
          <Select
            label="Patient *"
            value={patientId}
            options={patientOptions}
            error={errors.patientId}
            placeholder="Select a patient"
            onChange={(e) => setPatientId(e.target.value)}
          />

          <Select
            label="Ordering Clinician *"
            value={doctorId}
            options={doctorOptions}
            error={errors.doctorId}
            placeholder="Select ordering clinician"
            onChange={(e) => setDoctorId(e.target.value)}
          />

          <Input
            label="Test name *"
            placeholder="e.g. Complete Blood Count, Lipid Panel, Urinalysis"
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
        </form>
      )}
    </Modal>
  );
}
