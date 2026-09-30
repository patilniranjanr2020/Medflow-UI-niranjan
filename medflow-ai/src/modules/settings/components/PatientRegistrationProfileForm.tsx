import { useEffect, useMemo, useState } from 'react';
import { Check, Save } from 'lucide-react';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from '../../../shared/components/Card/Card';
import { Loading } from '../../../shared/components/Loading/Loading';
import { Select } from '../../../shared/components/Select/Select';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { settingsApi } from '../../../core/api/services';
import type {
  PatientRegistrationFieldState,
  PatientRegistrationProfile,
} from '../types/patientRegistrationProfile';

const stateOptions = [
  { value: 'REQUIRED', label: 'Required' },
  { value: 'OPTIONAL', label: 'Optional' },
  { value: 'HIDDEN', label: 'Hidden' },
];

function inferTemplate(profile: PatientRegistrationProfile): 'basic' | 'comprehensive' | null {
  const visibleCount = profile.fields.filter((field) => field.currentState !== 'HIDDEN').length;
  if (visibleCount === 5) return 'basic';
  if (visibleCount === profile.supportedFields.length) return 'comprehensive';
  return null;
}

interface Props {
  canEdit: boolean;
}

export function PatientRegistrationProfileForm({ canEdit }: Props) {
  const { show } = useToast();
  const [profile, setProfile] = useState<PatientRegistrationProfile | null>(null);
  const [draft, setDraft] = useState<Record<string, PatientRegistrationFieldState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'basic' | 'comprehensive' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await settingsApi.patientRegistrationProfile();
      setProfile(result);
      setSelectedTemplate(inferTemplate(result));
      setDraft(Object.fromEntries(
        result.fields.map((field) => [field.fieldKey, field.currentState ?? 'HIDDEN']),
      ));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not load the registration profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const groupedFields = useMemo(() => {
    const fields = profile?.supportedFields ?? [];
    return fields.reduce<Record<string, typeof fields>>((groups, field) => {
      (groups[field.fieldGroup] ??= []).push(field);
      return groups;
    }, {});
  }, [profile]);

  async function applyTemplate(name: 'basic' | 'comprehensive') {
    setTemplate(name);
    try {
      const result = await settingsApi.applyPatientRegistrationTemplate(name);
      setProfile(result);
      setSelectedTemplate(inferTemplate(result));
      setDraft(Object.fromEntries(result.fields.map((field) => [field.fieldKey, field.currentState ?? 'HIDDEN'])));
      setSelectedTemplate(name);
      show({ title: 'Profile template applied', description: name, tone: 'success' });
    } catch (cause) {
      show({ title: 'Could not apply template', description: cause instanceof ApiError ? cause.message : undefined, tone: 'danger' });
    } finally {
      setTemplate(null);
    }
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      const result = await settingsApi.updatePatientRegistrationProfile({
        version: profile.version,
        fields: profile.supportedFields.map((field) => ({
          fieldKey: field.fieldKey,
          state: draft[field.fieldKey] ?? 'HIDDEN',
        })),
      });
      setProfile(result);
      setDraft(Object.fromEntries(result.fields.map((field) => [field.fieldKey, field.currentState ?? 'HIDDEN'])));
      show({ title: 'Registration profile saved', tone: 'success' });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await load();
        show({ title: 'Profile changed elsewhere', description: 'The latest profile was loaded. Review and save again.', tone: 'danger' });
      } else {
        show({ title: 'Could not save registration profile', description: cause instanceof ApiError ? cause.message : undefined, tone: 'danger' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="lg">
      <CardHeader>
        <div>
          <CardTitle>Patient registration profile</CardTitle>
          <CardSubtitle>Control which fields staff see and which visible fields must be completed.</CardSubtitle>
        </div>
        {profile && <Badge tone="teal">v{profile.version}</Badge>}
      </CardHeader>
      <CardBody>
        {loading ? <Loading /> : error ? <Alert tone="danger" title="Could not load profile">{error}</Alert> : profile ? (
          <div style={{ display: 'grid', gap: 'var(--mf-space-5)' }}>
            {canEdit && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--mf-space-2)' }}>
                <Button size="sm" variant="outline" leftIcon={selectedTemplate === 'basic' ? <Check size={15} /> : undefined} isLoading={template === 'basic'} onClick={() => void applyTemplate('basic')}>Basic template</Button>
                <Button size="sm" variant="outline" leftIcon={selectedTemplate === 'comprehensive' ? <Check size={15} /> : undefined} isLoading={template === 'comprehensive'} onClick={() => void applyTemplate('comprehensive')}>Comprehensive template</Button>
              </div>
            )}
            {Object.entries(groupedFields).map(([group, fields]) => (
              <section key={group}>
                <h4 style={{ margin: '0 0 var(--mf-space-3)' }}>{group}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--mf-space-3)' }}>
                  {fields.map((field) => (
                    <Select
                      key={field.fieldKey}
                      label={field.fieldLabel}
                      value={draft[field.fieldKey] ?? 'HIDDEN'}
                      disabled={!canEdit}
                      options={stateOptions}
                      onChange={(event) => {
                        setSelectedTemplate(null);
                        setDraft((current) => ({ ...current, [field.fieldKey]: event.target.value as PatientRegistrationFieldState }));
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
            {canEdit && <Button leftIcon={<Save size={15} />} isLoading={saving} onClick={() => void save()}>Save profile</Button>}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
