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
  isOpen: boolean;
  onClose: () => void;
  onCreated: (prescription: Prescription) => void;
}

interface MedicineFormLine {
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  instructions: string;
}

const INITIAL_MEDICINE: MedicineFormLine = {
  medicationName: '',
  dosage: '',
  frequency: '',
  durationDays: '',
  instructions: '',
};

export function AddPrescriptionModal({ isOpen, onClose, onCreated }: Props) {
  const { show } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientId, setPatientId] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [activePatientIndex, setActivePatientIndex] = useState(-1);
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [digitallySigned, setDigitallySigned] = useState(true);
  const [medicines, setMedicines] = useState<MedicineFormLine[]>([{ ...INITIAL_MEDICINE }]);
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
    setPatientQuery('');
    setPatientPickerOpen(false);
    setActivePatientIndex(-1);
    setDoctorId('');
    setDiagnosis('');
    setDigitallySigned(true);
    setMedicines([{ ...INITIAL_MEDICINE }]);

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
        setLoadError(err instanceof ApiError ? err.message : 'Could not load registered patients or clinicians');
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  function handleAddMedicine() {
    setMedicines((prev) => [...prev, { ...INITIAL_MEDICINE }]);
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
    if (!patientId || !patients.some((patient) => String(patient.id) === patientId)) {
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
          nextErrors[`med_${idx}_dosage`] = 'Dosage is required (e.g. 500mg, 1 tablet)';
        }
        if (!med.frequency.trim()) {
          nextErrors[`med_${idx}_frequency`] = 'Frequency is required (e.g. Twice daily)';
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

      const created = await prescriptionsApi.create({
        patientId: Number(patientId),
        doctorId: Number(doctorId),
        diagnosis: diagnosis.trim() || undefined,
        digitallySigned,
        medicines: payloadMedicines,
      });

      show({
        title: digitallySigned ? 'Prescription issued and signed' : 'Prescription draft created',
        description: `Prescription #${created.id} for ${created.patientName}`,
        tone: 'success',
      });
      onCreated(created);
      onClose();
    } catch (err) {
      show({
        title: 'Could not create prescription',
        description: err instanceof ApiError ? err.message : 'Please check your inputs and try again.',
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const patientOptions = patients.map((p) => ({
    value: String(p.id),
    label: `${p.fullName || `${p.firstName} ${p.lastName}`} (${p.patientCode})`,
  }));
  const filteredPatientOptions = patientOptions.filter((patient) =>
    patient.label.toLocaleLowerCase().includes(patientQuery.trim().toLocaleLowerCase())
  );
  const selectedPatient = patientOptions.find((patient) => patient.value === patientId);

  function selectPatient(patientIdValue: string) {
    setPatientId(patientIdValue);
    setPatientQuery('');
    setPatientPickerOpen(false);
    setActivePatientIndex(-1);
    if (errors.patientId) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.patientId;
        return next;
      });
    }
  }

  function handlePatientKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setPatientPickerOpen(true);
      setActivePatientIndex((current) => filteredPatientOptions.length
        ? Math.min(current + 1, filteredPatientOptions.length - 1)
        : -1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setPatientPickerOpen(true);
      setActivePatientIndex((current) => filteredPatientOptions.length
        ? Math.max(current - 1, 0)
        : -1);
    } else if (event.key === 'Enter' && patientPickerOpen && activePatientIndex >= 0) {
      event.preventDefault();
      const patient = filteredPatientOptions[activePatientIndex];
      if (patient) selectPatient(patient.value);
    } else if (event.key === 'Escape') {
      setPatientPickerOpen(false);
      setActivePatientIndex(-1);
    }
  }

  const doctorOptions = doctors.map((d) => ({
    value: String(d.id),
    label: `Dr. ${d.fullName} — ${d.specialty} (${d.doctorCode})`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add prescription">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--mf-space-8)' }}>
          <Loading />
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
          {loadError && (
            <Alert tone="danger" title="Failed to load reference records">
              {loadError}
            </Alert>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--mf-space-4)' }}>
            <div style={{ position: 'relative' }}>
              <Input
                id="prescription-patient-select"
                label="Patient *"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={patientPickerOpen}
                aria-controls="prescription-patient-options"
                aria-activedescendant={
                  patientPickerOpen && activePatientIndex >= 0
                    ? `prescription-patient-option-${activePatientIndex}`
                    : undefined
                }
                autoComplete="off"
                placeholder="Search registered patients"
                value={patientQuery || selectedPatient?.label || ''}
                onFocus={(event) => {
                  setPatientPickerOpen(true);
                  if (selectedPatient && !patientQuery) event.currentTarget.select();
                }}
                onBlur={() => {
                  setPatientPickerOpen(false);
                  setActivePatientIndex(-1);
                }}
                onChange={(event) => {
                  setPatientQuery(event.target.value);
                  setPatientId('');
                  setPatientPickerOpen(true);
                  setActivePatientIndex(-1);
                }}
                onKeyDown={handlePatientKeyDown}
                error={errors.patientId}
              />
              {patientPickerOpen && (
                <ul
                  id="prescription-patient-options"
                  role="listbox"
                  aria-label="Registered patients"
                  style={{
                    position: 'absolute',
                    zIndex: 10,
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    margin: 'var(--mf-space-1) 0 0',
                    padding: 'var(--mf-space-1)',
                    listStyle: 'none',
                    background: 'var(--mf-bg)',
                    border: '1px solid var(--mf-border)',
                    borderRadius: 'var(--mf-radius-md)',
                    boxShadow: 'var(--mf-shadow-md)',
                  }}
                >
                  {filteredPatientOptions.length > 0 ? filteredPatientOptions.map((patient, index) => (
                    <li
                      id={`prescription-patient-option-${index}`}
                      key={patient.value}
                      role="option"
                      aria-selected={patient.value === patientId}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectPatient(patient.value)}
                      style={{
                        padding: 'var(--mf-space-2)',
                        borderRadius: 'var(--mf-radius-sm)',
                        cursor: 'pointer',
                        background: index === activePatientIndex ? 'var(--mf-bg-subtle)' : undefined,
                      }}
                    >
                      {patient.label}
                    </li>
                  )) : (
                    <li role="status" style={{ padding: 'var(--mf-space-2)', color: 'var(--mf-ink-500)' }}>
                      No registered patients found
                    </li>
                  )}
                </ul>
              )}
            </div>

            <Select
              id="prescription-doctor-select"
              label="Doctor (Registered Clinicians) *"
              options={doctorOptions}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              error={errors.doctorId}
              placeholder="Select doctor"
            />
          </div>

          <div className="mf-field">
            <label className="mf-field__label" htmlFor="prescription-diagnosis">
              Diagnosis / Clinical Notes
            </label>
            <textarea
              id="prescription-diagnosis"
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
                      id={`med-name-${idx}`}
                      label="Medication Name *"
                      placeholder="e.g. Paracetamol 500mg"
                      value={med.medicationName}
                      onChange={(e) => handleMedicineChange(idx, 'medicationName', e.target.value)}
                      error={errors[`med_${idx}_medicationName`]}
                    />
                    <Input
                      id={`med-dosage-${idx}`}
                      label="Dosage *"
                      placeholder="e.g. 1 tablet"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                      error={errors[`med_${idx}_dosage`]}
                    />
                    <Input
                      id={`med-freq-${idx}`}
                      label="Frequency *"
                      placeholder="e.g. TDS, Twice daily"
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                      error={errors[`med_${idx}_frequency`]}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--mf-space-2)' }}>
                    <Input
                      id={`med-duration-${idx}`}
                      label="Duration (days)"
                      type="number"
                      placeholder="e.g. 5"
                      value={med.durationDays}
                      onChange={(e) => handleMedicineChange(idx, 'durationDays', e.target.value)}
                      error={errors[`med_${idx}_durationDays`]}
                    />
                    <Input
                      id={`med-instructions-${idx}`}
                      label="Special Instructions"
                      placeholder="e.g. Take after meals with plenty of water"
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
              id="prescription-digitally-signed"
              type="checkbox"
              checked={digitallySigned}
              onChange={(e) => setDigitallySigned(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <label htmlFor="prescription-digitally-signed" style={{ cursor: 'pointer', fontSize: 'var(--mf-fs-sm)' }}>
              <strong>Digitally sign & seal prescription</strong>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)', marginTop: '2px' }}>
                Signing certifiably stamps this record with clinical authority. Once signed, edits and deletions are locked.
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mf-space-2)', marginTop: 'var(--mf-space-2)' }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || loading}>
              {submitting ? 'Saving…' : digitallySigned ? 'Sign & Issue prescription' : 'Save as draft'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
