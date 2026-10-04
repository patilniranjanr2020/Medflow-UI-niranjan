import { useEffect, useState } from 'react';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Select } from '../../../shared/components/Select/Select';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { accessApi, usersApi } from '../../../core/api/services';
import type { Gender, Role, UserAccount } from '../../../core/api/types';

interface Props {
  isOpen: boolean;
  user: UserAccount | null;
  onClose: () => void;
  onSaved: (user: UserAccount) => void;
}

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  roleCode: string;
  gender: Gender | '';
  dateOfBirth: string;
}

const emptyValues: FormValues = {
  firstName: '', lastName: '', email: '', phone: '', password: '', roleCode: '', gender: '', dateOfBirth: '',
};

const genderOptions = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

function valuesFor(user: UserAccount | null): FormValues {
  if (!user) return emptyValues;
  return {
    ...emptyValues,
    firstName: user.firstName,
    lastName: user.lastName ?? '',
    email: user.email,
    phone: user.phone ?? '',
    gender: user.gender ?? '',
    dateOfBirth: user.dateOfBirth ?? '',
  };
}

export function UserFormModal({ isOpen, user, onClose, onSaved }: Props) {
  const { show } = useToast();
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const isEditing = Boolean(user);

  useEffect(() => {
    if (!isOpen) return;
    setValues(valuesFor(user));
    setSubmitted(false);
    setError(undefined);
    if (user) return;

    let current = true;
    setRolesLoading(true);
    accessApi.roles()
      .then((availableRoles) => { if (current) setRoles(availableRoles); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof ApiError ? cause.message : 'Could not load available roles.'); })
      .finally(() => { if (current) setRolesLoading(false); });
    return () => { current = false; };
  }, [isOpen, user]);

  function update(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setError(undefined);
  }

  function validationError() {
    if (!values.firstName.trim()) return 'First name is required.';
    if (!isEditing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return 'Enter a valid email address.';
    if (!isEditing && (!values.password || values.password.length < 8 || values.password.length > 72)) return 'Password must be between 8 and 72 characters.';
    if (!isEditing && !values.roleCode) return 'Select a role from the available roles.';
    if (values.dateOfBirth && values.dateOfBirth > new Date().toISOString().slice(0, 10)) return 'Date of birth cannot be in the future.';
    return undefined;
  }

  async function save() {
    if (submitting) return;
    setSubmitted(true);
    const message = validationError();
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError(undefined);
    const profile = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim() || undefined,
      phone: values.phone.trim() || undefined,
      gender: values.gender || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
    };
    try {
      const saved = user
        ? await usersApi.update(user.id, { ...profile, profilePhotoUrl: user.profilePhotoUrl })
        : await usersApi.create({
            ...profile,
            email: values.email.trim(),
            rawPassword: values.password,
            roleCode: values.roleCode,
          });
      show({ title: user ? 'User profile updated' : 'User added', tone: 'success' });
      onSaved(saved);
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : 'Could not save the user. Please try again.';
      setError(message);
      show({ title: user ? 'Could not update user' : 'Could not add user', description: message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  }

  const roleOptions = roles.map((role) => ({ value: role.roleCode, label: role.roleName }));
  const loading = rolesLoading || submitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!submitting) onClose(); }}
      title={user ? 'Edit user' : 'Add user'}
      description={user ? 'Update this staff member’s personal profile.' : 'Create a staff account with a role from your organization.'}
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="button" isLoading={submitting} disabled={rolesLoading} onClick={save}>{user ? 'Save changes' : 'Add user'}</Button></>}
    >
      {error && <Alert tone="danger" title="User could not be saved">{error}</Alert>}
      <form onSubmit={(event) => { event.preventDefault(); void save(); }} style={{ display: 'grid', gap: 'var(--mf-space-4)', marginTop: error ? 'var(--mf-space-4)' : 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--mf-space-3)' }}>
          <Input label="First name *" value={values.firstName} maxLength={100} aria-invalid={submitted && !values.firstName.trim()} onChange={(event) => update('firstName', event.target.value)} />
          <Input label="Last name" value={values.lastName} maxLength={100} onChange={(event) => update('lastName', event.target.value)} />
          {!user && <Input label="Email *" type="email" value={values.email} maxLength={120} autoComplete="email" onChange={(event) => update('email', event.target.value)} />}
          {user && <Input label="Email" type="email" value={values.email} disabled />}
          <Input label="Phone" type="tel" value={values.phone} maxLength={20} autoComplete="tel" onChange={(event) => update('phone', event.target.value)} />
          {!user && (
            <>
              <Input label="Temporary password *" type="password" value={values.password} minLength={8} maxLength={72} autoComplete="new-password" hint="Use 8 to 72 characters. The password is never shown after account creation." onChange={(event) => update('password', event.target.value)} />
              {rolesLoading ? <p role="status">Loading available roles…</p> : <Select label="Role *" value={values.roleCode} placeholder="Select a role" options={roleOptions} disabled={!roleOptions.length} onChange={(event) => update('roleCode', event.target.value)} />}
            </>
          )}
          <Select label="Gender" value={values.gender} placeholder="Select gender" options={genderOptions} onChange={(event) => update('gender', event.target.value)} />
          <Input label="Date of birth" type="date" value={values.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(event) => update('dateOfBirth', event.target.value)} />
        </div>
        {submitted && loading && <span role="status">Saving user…</span>}
      </form>
    </Modal>
  );
}