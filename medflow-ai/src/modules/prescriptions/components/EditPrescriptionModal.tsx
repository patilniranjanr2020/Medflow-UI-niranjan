import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Select } from '../../../shared/components/Select/Select';
import { Loading } from '../../../shared/components/Loading/Loading';
import { Alert } from '../../../shared/components/Alert/Alert';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { doctorsApi, patientsApi, prescriptionsApi } from '../../../core/api/services';
import type { Doctor, Patient, Prescription, PrescriptionItem } from '../../../core/api/types';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (prescription: Prescription) => void;
}

interface MedicineFormLine {
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  instructions: string;
}

export function EditPrescriptionModal({ prescription, isOpen, onClose, onUpdated }: Props) {
  const { show } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [digitallySigned, setDigitallySigned] = useState(false);
  const [medicines, setMedicines] = useState<MedicineFormLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !prescription) return;
    setLoading(true);
    setLoadError(null);
    setErrors({});
    setPatientId(String(prescription.patientId));
    setDoctorId(String(prescription.doctorId));
    setDiagnosis(prescription.diagnosis ?? '');
    setDigitallySigned(prescription.digitallySigned);

    const initialMedicines = prescription.medicines.map((m) => ({
      medicationName: m.medicationName,
      dosage: m.dosage,
      frequency: m.frequency,
      durationDays: m.durationDays ? String(m.durationDays) : '',
      instructions: m.instructions ?? '',
    }));
    setMedicines(initialMedicines.length > 0 ? initialMedicines : [{
      medicationName: '',
      dosage: '',
      frequency: '',
      durationDays: '',
      instructions: '',
    }]);

    Promise.all([
      patientsApi.list({ size: 100 }),
      doctorsApi.list({ size: 100 }),
    ])
      .then(([patientsPage, doctorsPage]) => {
        setPatients(patientsPage.content);
        setDoctors(doctorsPage.content);
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'Could not load registered patients or clinicians');
      })
      .finally(() => setLoading(false));
  }, [isOpen, prescription]);

  if (!prescription) return null;

  const isLocked = prescription.digitallySigned || prescription.status !== 'ACTIVE';

  function handleAddMedicine() {
    setMedicines((prev) => [
      ...prev,
      { medicationName: '', dosage: '', frequency: '', durationDays: '', instructions: '' },
    ]);
  }

  function handleRemoveMedicine(index: number) {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`med_${index}_`)) {
          delete next[key];
        }
      });
      return next;
    });
  }

  function handleMedicineChange(index: number, field: keyof MedicineFormLine, value: string) {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (errors[`med_${index}_${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`med_${index}_${field}`];
        return next;
      });
    }
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!patientId) {
      nextErrors.patientId = 'Please select a registered patient';
    }
    if (!doctorId) {
      nextErrors.doctorId = 'Please select a registered doctor';
    }
    if (diagnosis.length > 2000) {
      nextErrors.diagnosis = 'Diagnosis cannot exceed 2000 characters';
    }

    if (medicines.length === 0) {
      nextErrors.medicines = 'At least one medication line is required';
    } else {
      medicines.forEach((med, idx) => {
        if (!med.medicationName.trim()) {
          nextErrors[`med_${idx}_medicationName`] = 'Medication name is required';
        }
        if (!med.dosage.trim()) {
          nextErrors[`med_${idx}_dosage`] = 'Dosage is required';
        }
        if (!med.frequency.trim()) {
          nextErrors[`med_${idx}_frequency`] = 'Frequency is required';
        }
        if (med.durationDays && (isNaN(Number(med.durationDays)) || Number(med.durationDays) <= 0)) {
          nextErrors[`med_${idx}_durationDays`] = 'Duration must be a positive number';
        }
      });
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isLocked) {
      show({
        title: 'Prescription is locked',
        description: 'Digitally signed or non-active prescriptions cannot be modified.',
        tone: 'danger',
      });
      return;
    }

    if (!validate()) {
      show({ title: 'Please complete all required fields', tone: 'danger' });
      return;
    }

    setSubmitting(true);
    try {
      const payloadMedicines: PrescriptionItem[] = medicines.map((m) => ({
        medicationName: m.medicationName.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        durationDays: m.durationDays ? Number(m.durationDays) : undefined,
        instructions: m.instructions.trim() || undefined,
      }));

      const updated = await prescriptionsApi.update(prescription.id, {
        patientId: Number(patientId),
        doctorId: Number(doctorId),
        diagnosis: diagnosis.trim() || undefined,
        digitallySigned,
        medicines: payloadMedicines,
      });

      show({
        title: 'Prescription updated successfully',
        description: `Prescription #${updated.id}`,
        tone: 'success',
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      show({
        title: 'Could not update prescription',
        description: err instanceof ApiError ? err.message : 'Please check your inputs and try again.',
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const patientOptions = patients.map((p) => ({
    value: String(p.id),
    label: `${p.fullName || `${p.firstName} ${p.lastName}`} (${p.mrn})`,
  }));

  const doctorOptions = doctors.map((d) => ({
    value: String(d.id),
    label: `Dr. ${d.fullName} — ${d.specialty} (${d.doctorCode})`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit prescription #${prescription.id}`}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--mf-space-8)' }}>
          <Loading />
        </div>
      ) : isLocked ? (
        <div style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
          <Alert tone="neutral" title="Prescription is locked">
            {prescription.digitallySigned
              ? 'This prescription is digitally signed and permanently sealed. Modifications are strictly disallowed to maintain legal clinical integrity.'
              : `This prescription has status ${prescription.status} and cannot be modified.`}
          </Alert>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
          {loadError && (
            <Alert tone="danger" title="Failed to load reference records">
              {loadError}
            </Alert>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--mf-space-4)' }}>
            <Select
              id="edit-prescription-patient-select"
              label="Patient *"
              options={patientOptions}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              error={errors.patientId}
              placeholder="Select patient"
            />

            <Select
              id="edit-prescription-doctor-select"
              label="Doctor (Registered Clinicians) *"
              options={doctorOptions}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              error={errors.doctorId}
              placeholder="Select doctor"
            />
          </div>

          <div className="mf-field">
            <label className="mf-field__label" htmlFor="edit-prescription-diagnosis">
              Diagnosis / Clinical Notes
            </label>
            <textarea
              id="edit-prescription-diagnosis"
              className="mf-field__input"
              rows={2}
              placeholder="e.g. Acute upper respiratory infection, fever..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            {errors.diagnosis && (
              <p className="mf-field__message mf-field__message--error">{errors.diagnosis}</p>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--mf-border)', paddingTop: 'var(--mf-space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--mf-space-2)' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--mf-fs-sm)', color: 'var(--mf-ink-700)' }}>
                Medication Lines *
              </span>
              <Button type="button" size="sm" variant="outline" onClick={handleAddMedicine}>
                <Plus size={14} style={{ marginRight: 'var(--mf-space-1)' }} />
                Add medication
              </Button>
            </div>
            {errors.medicines && (
              <p style={{ color: 'var(--mf-coral-600)', fontSize: 'var(--mf-fs-xs)', margin: '0 0 var(--mf-space-2)' }}>
                {errors.medicines}
              </p>
            )}

            <div style={{ display: 'grid', gap: 'var(--mf-space-3)' }}>
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--mf-space-3)',
                    background: 'var(--mf-bg-subtle)',
                    borderRadius: 'var(--mf-radius-md)',
                    border: '1px solid var(--mf-border)',
                    display: 'grid',
                    gap: 'var(--mf-space-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--mf-fs-xs)', fontWeight: 600, color: 'var(--mf-ink-500)' }}>
                      Medicine #{idx + 1}
                    </span>
                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        aria-label={`Remove medicine ${idx + 1}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--mf-coral-600)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: 'var(--mf-fs-xs)',
                        }}
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--mf-space-2)' }}>
                    <Input
                      id={`edit-med-name-${idx}`}
                      label="Medication Name *"
                      placeholder="e.g. Paracetamol 500mg"
                      value={med.medicationName}
                      onChange={(e) => handleMedicineChange(idx, 'medicationName', e.target.value)}
                      error={errors[`med_${idx}_medicationName`]}
                    />
                    <Input
                      id={`edit-med-dosage-${idx}`}
                      label="Dosage *"
                      placeholder="e.g. 1 tablet"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                      error={errors[`med_${idx}_dosage`]}
                    />
                    <Input
                      id={`edit-med-freq-${idx}`}
                      label="Frequency *"
                      placeholder="e.g. TDS, Twice daily"
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                      error={errors[`med_${idx}_frequency`]}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--mf-space-2)' }}>
                    <Input
                      id={`edit-med-duration-${idx}`}
                      label="Duration (days)"
                      type="number"
                      placeholder="e.g. 5"
                      value={med.durationDays}
                      onChange={(e) => handleMedicineChange(idx, 'durationDays', e.target.value)}
                      error={errors[`med_${idx}_durationDays`]}
                    />
                    <Input
                      id={`edit-med-instructions-${idx}`}
                      label="Special Instructions"
                      placeholder="e.g. Take after meals"
                      value={med.instructions}
                      onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--mf-space-3)',
              background: digitallySigned ? 'var(--mf-green-50, #f0fdf4)' : 'var(--mf-bg-subtle)',
              border: `1px solid ${digitallySigned ? 'var(--mf-green-200, #bbf7d0)' : 'var(--mf-border)'}`,
              borderRadius: 'var(--mf-radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--mf-space-2)',
            }}
          >
            <input
              id="edit-prescription-digitally-signed"
              type="checkbox"
              checked={digitallySigned}
              onChange={(e) => setDigitallySigned(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <label htmlFor="edit-prescription-digitally-signed" style={{ cursor: 'pointer', fontSize: 'var(--mf-fs-sm)' }}>
              <strong>Digitally sign & seal prescription</strong>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)', marginTop: '2px' }}>
                Signing certifiably stamps this record with clinical authority. Once signed, further edits and deletions are locked.
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mf-space-2)', marginTop: 'var(--mf-space-2)' }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || loading}>
              {submitting ? 'Saving…' : digitallySigned ? 'Sign & Issue prescription' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
