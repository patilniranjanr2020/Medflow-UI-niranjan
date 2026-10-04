import { useEffect, useState } from 'react';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Modal } from '../../../shared/components/Modal/Modal';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { doctorsApi } from '../../../core/api/services';
import type { Doctor } from '../../../core/api/types';

interface Props {
  isOpen: boolean;
  doctor: Doctor | null;
  onClose: () => void;
  onSaved: (doctor: Doctor) => void;
}

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  registrationNumber: string;
  qualification: string;
  yearsOfExperience: string;
  consultationFee: string;
  bio: string;
  password: string;
}

const emptyValues: FormValues = {
  firstName: '', lastName: '', email: '', phone: '', specialty: '', registrationNumber: '',
  qualification: '', yearsOfExperience: '', consultationFee: '', bio: '', password: '',
};

function valuesFor(doctor: Doctor | null): FormValues {
  if (!doctor) return emptyValues;
  return {
    ...emptyValues,
    firstName: doctor.firstName,
    lastName: doctor.lastName ?? '',
    email: doctor.email ?? '',
    phone: doctor.phone ?? '',
    specialty: doctor.specialty,
    registrationNumber: doctor.registrationNumber,
    qualification: doctor.qualification ?? '',
    yearsOfExperience: String(doctor.yearsOfExperience ?? ''),
    consultationFee: String(doctor.consultationFee ?? ''),
    bio: doctor.bio ?? '',
  };
}

export function DoctorFormModal({ isOpen, doctor, onClose, onSaved }: Props) {
  const { show } = useToast();
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const isEditing = Boolean(doctor);

  useEffect(() => {
    if (!isOpen) return;
    setValues(valuesFor(doctor));
    setSubmitted(false);
    setError(undefined);
  }, [isOpen, doctor]);

  function update(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setError(undefined);
  }

  function validate() {
    if (!values.firstName.trim()) return 'First name is required.';
    if (!isEditing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return 'Enter a valid email address.';
    if (!values.specialty.trim()) return 'Specialty is required.';
    if (!isEditing && !values.registrationNumber.trim()) return 'Registration number is required.';
    if (isEditing && !values.registrationNumber.trim()) return 'Registration number is required.';
    const fee = Number(values.consultationFee);
    if (!values.consultationFee.trim() || !Number.isFinite(fee) || fee < 0) return 'Enter a valid non-negative consultation fee.';
    if (values.yearsOfExperience && (!/^\d+$/.test(values.yearsOfExperience) || Number(values.yearsOfExperience) < 0)) return 'Years of experience must be a non-negative whole number.';
    if (!isEditing && values.password && (values.password.length < 8 || values.password.length > 72)) return 'Password must be between 8 and 72 characters.';
    return undefined;
  }

  async function save() {
    setSubmitted(true);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError(undefined);
    try {
      const common = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim() || undefined,
        phone: values.phone.trim() || undefined,
        specialty: values.specialty.trim(),
        qualification: values.qualification.trim() || undefined,
        yearsOfExperience: values.yearsOfExperience ? Number(values.yearsOfExperience) : undefined,
        consultationFee: Number(values.consultationFee),
        bio: values.bio.trim() || undefined,
      };
      const saved = doctor
        ? await doctorsApi.update(doctor.id, { ...common, digitalSignatureUrl: doctor.digitalSignatureUrl })
        : await doctorsApi.create({
            ...common,
            email: values.email.trim(),
            registrationNumber: values.registrationNumber.trim(),
            password: values.password || undefined,
          });
      show({ title: doctor ? 'Doctor profile updated' : 'Doctor added', tone: 'success' });
      onSaved(saved);
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : 'Could not save the doctor. Please try again.';
      setError(message);
      show({ title: doctor ? 'Could not update doctor' : 'Could not add doctor', description: message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!submitting) onClose(); }}
      title={doctor ? 'Edit doctor' : 'Add doctor'}
      description={doctor ? 'Update the professional profile.' : 'Create a doctor account and professional profile.'}
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="button" isLoading={submitting} onClick={save}>{doctor ? 'Save changes' : 'Add doctor'}</Button></>}
    >
      <form id="doctor-form" onSubmit={(event) => { event.preventDefault(); void save(); }} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
        {error && <Alert tone="danger" title="Doctor could not be saved">{error}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--mf-space-3)' }}>
          <Input label="First name *" value={values.firstName} maxLength={100} aria-invalid={submitted && !values.firstName.trim()} onChange={(event) => update('firstName', event.target.value)} />
          <Input label="Last name" value={values.lastName} maxLength={100} onChange={(event) => update('lastName', event.target.value)} />
          {!doctor && <Input label="Email *" type="email" value={values.email} maxLength={120} autoComplete="email" onChange={(event) => update('email', event.target.value)} />}
          <Input label="Phone" type="tel" value={values.phone} maxLength={20} autoComplete="tel" onChange={(event) => update('phone', event.target.value)} />
          <Input label="Specialty *" value={values.specialty} maxLength={100} onChange={(event) => update('specialty', event.target.value)} />
          {!doctor && <Input label="Registration number *" value={values.registrationNumber} maxLength={100} onChange={(event) => update('registrationNumber', event.target.value)} />}
          {doctor && <Input label="Registration number" value={values.registrationNumber} disabled />}
          {!doctor && <Input label="Initial password (optional)" type="password" value={values.password} minLength={8} maxLength={72} autoComplete="new-password" hint="Leave blank to let the doctor set it through account recovery." onChange={(event) => update('password', event.target.value)} />}
          <Input label="Qualification" value={values.qualification} maxLength={200} onChange={(event) => update('qualification', event.target.value)} />
          <Input label="Years of experience" type="number" min={0} step={1} value={values.yearsOfExperience} onChange={(event) => update('yearsOfExperience', event.target.value)} />
          <Input label="Consultation fee *" type="number" min={0} step="0.01" value={values.consultationFee} onChange={(event) => update('consultationFee', event.target.value)} />
        </div>
        <label className="mf-field">
          <span className="mf-field__label">Professional bio</span>
          <textarea className="mf-field__input" rows={3} maxLength={2000} value={values.bio} style={{ height: 'auto', padding: 'var(--mf-space-3) var(--mf-space-4)', resize: 'vertical' }} onChange={(event) => update('bio', event.target.value)} />
        </label>
      </form>
    </Modal>
  );
}