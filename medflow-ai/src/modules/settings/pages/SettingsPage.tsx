import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader';
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from '../../../shared/components/Card/Card';
import { Input } from '../../../shared/components/Input/Input';
import { Button } from '../../../shared/components/Button/Button';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Loading } from '../../../shared/components/Loading/Loading';
import { Badge } from '../../../shared/components/Badge/Badge';
import { useToast } from '../../../shared/components/Toast/Toast';
import { useApiResource } from '../../../shared/hooks/useApiResource';
import { hospitalApi, settingsApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import { PatientRegistrationProfileForm } from '../components/PatientRegistrationProfileForm';

export default function SettingsPage() {
  const { show } = useToast();
  const { can } = useAuth();
  const hospital = useApiResource(() => hospitalApi.profile(), []);
  const modules = useApiResource(() => hospitalApi.modules(), []);
  const settings = useApiResource(() => settingsApi.list(), []);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) {
      setDraft(Object.fromEntries(settings.data.map((setting) => [setting.key, setting.value])));
    }
  }, [settings.data]);

  const canEdit = can('settings:write');

  async function save(key: string) {
    setSavingKey(key);
    try {
      await settingsApi.save(key, draft[key] ?? '');
      show({ title: 'Setting saved', description: key, tone: 'success' });
    } catch (cause) {
      show({
        title: 'Could not save the setting',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mf-space-5)' }}>
      <PageHeader title="Settings" description="Workspace configuration and licensed modules." />

      {settings.error && (
        <Alert tone="danger" title="Could not load settings">
          {settings.error}
        </Alert>
      )}

      <Card padding="lg">
        <CardHeader>
          <div>
            <CardTitle>Workspace</CardTitle>
            <CardSubtitle>The hospital this account belongs to</CardSubtitle>
          </div>
        </CardHeader>
        <CardBody>
          {hospital.isLoading && !hospital.data ? (
            <Loading />
          ) : hospital.data ? (
            <dl style={{ display: 'grid', gap: 'var(--mf-space-2)', margin: 0 }}>
              <div>
                <strong>{hospital.data.name}</strong> · {hospital.data.hospitalCode}
              </div>
              <div style={{ color: 'var(--mf-text-muted)' }}>
                {[hospital.data.city, hospital.data.phone, hospital.data.email].filter(Boolean).join(' · ')}
              </div>
              <div style={{ color: 'var(--mf-text-muted)' }}>Timezone: {hospital.data.timezone}</div>
            </dl>
          ) : null}
        </CardBody>
      </Card>

      <PatientRegistrationProfileForm canEdit={canEdit} />

      <Card padding="lg">
        <CardHeader>
          <div>
            <CardTitle>Configuration</CardTitle>
            <CardSubtitle>
              {canEdit ? 'Values apply to this hospital only' : 'Read-only — administrators can change these'}
            </CardSubtitle>
          </div>
        </CardHeader>
        <CardBody>
          {settings.isLoading && !settings.data ? (
            <Loading />
          ) : (
            <div style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
              {(settings.data ?? []).map((setting) => (
                <div
                  key={setting.key}
                  style={{ display: 'flex', gap: 'var(--mf-space-3)', alignItems: 'flex-end' }}
                >
                  <div style={{ flex: 1 }}>
                    <Input
                      label={setting.key}
                      value={draft[setting.key] ?? ''}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [setting.key]: event.target.value }))
                      }
                    />
                  </div>
                  {canEdit && (
                    <Button
                      variant="outline"
                      leftIcon={<Save size={15} />}
                      isLoading={savingKey === setting.key}
                      onClick={() => save(setting.key)}
                    >
                      Save
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <div>
            <CardTitle>Modules</CardTitle>
            <CardSubtitle>What this workspace is licensed for</CardSubtitle>
          </div>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--mf-space-2)' }}>
            {(modules.data ?? []).map((module) => (
              <Badge key={module.moduleCode} tone={module.accessible ? 'green' : 'neutral'} dot>
                {module.moduleName}
              </Badge>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
