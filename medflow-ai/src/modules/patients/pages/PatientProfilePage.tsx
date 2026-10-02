import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  HeartPulse,
  Activity,
  FileText,
  Shield,
  Users,
  Link as LinkIcon,
  RefreshCw,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Download,
  AlertTriangle,
  FileCheck2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { Avatar } from '../../../shared/components/Avatar/Avatar';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Breadcrumb } from '../../../shared/components/Breadcrumb/Breadcrumb';
import { EmptyState } from '../../../shared/components/EmptyState/EmptyState';
import { Loading } from '../../../shared/components/Loading/Loading';
import { Tabs, TabPanel, type TabItem } from '../../../shared/components/Tabs/Tabs';
import { useToast } from '../../../shared/components/Toast/Toast';
import { patientsApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import { ROUTES } from '../../../core/config/app.config';
import { formatDate, formatDateTime, humanize, statusTone } from '../../../core/utils/format';
import type {
  Patient,
  PatientMedicalHistory,
  PatientAccount,
  PatientReport,
} from '../../../core/api/types';
import { InlineEditableField } from '../components/InlineEditableField';
import './PatientProfilePage.css';

/** Renders fallback text if the value is null, undefined, or empty string. */
function fallback(val?: string | number | null, placeholder = '—'): string {
  if (val === null || val === undefined) return placeholder;
  const str = String(val).trim();
  return str.length > 0 ? str : placeholder;
}

/** Formats date-only string (YYYY-MM-DD) safely without shifting calendar day. */
function formatDobDate(dob?: string | null): string {
  if (!dob) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const [y, m, d] = dob.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return formatDate(dob);
}

/** Calculates readable age from date of birth or returns age property. */
function calculateAge(dob?: string | null, ageProp?: number | null): string {
  if (ageProp !== undefined && ageProp !== null) return `${ageProp} yrs`;
  if (!dob) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const [year, month, day] = dob.split('-').map(Number);
    const today = new Date();
    let years = today.getFullYear() - year;
    const m = today.getMonth() + 1 - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      years--;
    }
    return years >= 0 ? `${years} yrs` : '—';
  }
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return '—';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    years--;
  }
  return years >= 0 ? `${years} yrs` : '—';
}

/** Mask government ID numbers for privacy while allowing verification of the last 4 digits. */
function maskGovernmentId(id?: string | null): string {
  if (!id) return 'Not available';
  const trimmed = id.trim();
  if (trimmed.length <= 4) return trimmed;
  const visible = trimmed.slice(-4);
  return `${'•'.repeat(Math.min(trimmed.length - 4, 8))}${visible}`;
}

export default function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<PatientMedicalHistory[]>([]);
  const [accounts, setAccounts] = useState<PatientAccount[]>([]);
  const [reports, setReports] = useState<PatientReport[]>([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGovernmentId, setShowGovernmentId] = useState(false);

  // Inline editing state
  const { show: showToast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<Partial<Patient>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleStartEdit = useCallback(() => {
    setIsEditMode(true);
    setPendingEdits({});
    setTouchedFields(new Set());
    setActiveField(null);
    setFieldErrors({});
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (touchedFields.size > 0) {
      const confirmed = window.confirm('You have unsaved changes. Discard pending edits?');
      if (!confirmed) return;
    }
    setIsEditMode(false);
    setPendingEdits({});
    setTouchedFields(new Set());
    setActiveField(null);
    setFieldErrors({});
  }, [touchedFields]);

  const handleFieldChange = useCallback((fieldKey: string, val: string) => {
    setActiveField(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });

    if (fieldKey === 'fullName') {
      const trimmed = val.trim();
      const parts = trimmed.split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      setPendingEdits((prev) => ({
        ...prev,
        firstName,
        lastName,
        fullName: trimmed,
      }));
      setTouchedFields((prev) => new Set(prev).add('fullName').add('firstName').add('lastName'));
    } else if (fieldKey === 'firstName') {
      const trimmed = val.trim();
      setPendingEdits((prev) => {
        const lastName = prev.lastName !== undefined ? prev.lastName : (patient?.lastName || '');
        return {
          ...prev,
          firstName: trimmed,
          fullName: lastName ? `${trimmed} ${lastName}`.trim() : trimmed,
        };
      });
      setTouchedFields((prev) => new Set(prev).add('firstName').add('fullName'));
    } else if (fieldKey === 'lastName') {
      const trimmed = val.trim();
      setPendingEdits((prev) => {
        const firstName = prev.firstName !== undefined ? prev.firstName : (patient?.firstName || '');
        return {
          ...prev,
          lastName: trimmed,
          fullName: trimmed ? `${firstName} ${trimmed}`.trim() : firstName,
        };
      });
      setTouchedFields((prev) => new Set(prev).add('lastName').add('fullName'));
    } else {
      setPendingEdits((prev) => ({
        ...prev,
        [fieldKey]: val,
      }));
      setTouchedFields((prev) => new Set(prev).add(fieldKey));
    }
  }, [patient]);

  const handleSaveDone = useCallback(async () => {
    if (!patient || !patientId) return;

    if (touchedFields.size === 0) {
      setIsEditMode(false);
      setActiveField(null);
      return;
    }

    const errors: Record<string, string> = {};

    if (touchedFields.has('fullName') || touchedFields.has('firstName')) {
      const fn = pendingEdits.firstName !== undefined ? pendingEdits.firstName : patient.firstName;
      if (!fn || fn.trim().length === 0) {
        errors.fullName = 'First name is required';
        errors.firstName = 'First name is required';
      } else if (fn.length > 100) {
        errors.fullName = 'First name cannot exceed 100 characters';
        errors.firstName = 'First name cannot exceed 100 characters';
      }
    }

    if (touchedFields.has('dateOfBirth')) {
      const dob = pendingEdits.dateOfBirth;
      if (dob) {
        const today = new Date().toISOString().split('T')[0];
        if (dob > today) {
          errors.dateOfBirth = 'Date of birth cannot be in the future';
        }
      }
    }

    if (touchedFields.has('bloodGroup')) {
      const bg = pendingEdits.bloodGroup;
      if (bg && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bg)) {
        errors.bloodGroup = 'Choose a valid blood group, for example O+';
      }
    }

    if (touchedFields.has('phone')) {
      const ph = pendingEdits.phone;
      if (ph && ph.length > 20) {
        errors.phone = 'Phone number cannot exceed 20 characters';
      }
    }

    if (touchedFields.has('email')) {
      const em = pendingEdits.email;
      if (em && em.trim().length > 0) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.trim())) {
          errors.email = 'Enter a valid email address';
        } else if (em.length > 120) {
          errors.email = 'Email cannot exceed 120 characters';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast({
        title: 'Validation error',
        description: Object.values(errors)[0],
        tone: 'danger',
      });
      return;
    }

    setFieldErrors({});
    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        lastUpdatedAt: patient.updatedAt || patient.createdAt,
      };

      if (touchedFields.has('fullName') || touchedFields.has('firstName')) {
        payload.firstName = pendingEdits.firstName !== undefined ? pendingEdits.firstName : patient.firstName;
      }
      if (touchedFields.has('fullName') || touchedFields.has('lastName')) {
        payload.lastName = pendingEdits.lastName !== undefined ? pendingEdits.lastName : patient.lastName;
      }
      if (touchedFields.has('dateOfBirth')) {
        payload.dateOfBirth = pendingEdits.dateOfBirth;
      }
      if (touchedFields.has('gender')) {
        payload.gender = pendingEdits.gender;
      }
      if (touchedFields.has('bloodGroup')) {
        payload.bloodGroup = pendingEdits.bloodGroup;
      }
      if (touchedFields.has('phone')) {
        payload.phone = pendingEdits.phone;
      }
      if (touchedFields.has('email')) {
        payload.email = pendingEdits.email;
      }

      const updated = await patientsApi.update(patientId, payload);
      setPatient(updated);
      setIsEditMode(false);
      setPendingEdits({});
      setTouchedFields(new Set());
      setActiveField(null);
      showToast({
        title: 'Patient details updated',
        description: 'Demographic changes saved successfully.',
        tone: 'success',
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          showToast({
            title: 'Conflict detected',
            description: err.message || 'Patient record was modified by another session. Please refresh.',
            tone: 'danger',
          });
        } else if (err.fieldErrors && err.fieldErrors.length > 0) {
          const mapped: Record<string, string> = {};
          err.fieldErrors.forEach((fe) => {
            if (fe.field) mapped[fe.field] = fe.message;
          });
          setFieldErrors(mapped);
          showToast({
            title: 'Update failed',
            description: err.message || err.fieldErrors[0].message,
            tone: 'danger',
          });
        } else {
          showToast({
            title: 'Update failed',
            description: err.message || 'Could not save patient details.',
            tone: 'danger',
          });
        }
      } else {
        showToast({
          title: 'Update failed',
          description: 'An unexpected error occurred while communicating with the server.',
          tone: 'danger',
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [patient, patientId, touchedFields, pendingEdits, showToast]);

  useEffect(() => {
    if (!isEditMode) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeField !== null) {
          setActiveField(null);
          return;
        }
        handleCancelEdit();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isEditMode, activeField, handleCancelEdit]);

  const loadData = useCallback(async (quiet = false) => {
    if (!patientId) {
      setErrorStatus(400);
      setErrorMessage('A valid patient ID must be specified in the URL.');
      setIsLoading(false);
      return;
    }

    if (quiet) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      // 1. Load primary patient record (authoritative authorization & tenant check)
      const patientData = await patientsApi.get(patientId);
      setPatient(patientData);

      // 2. Load sub-resources concurrently
      const [historyResult, accountsResult, reportsResult] = await Promise.allSettled([
        patientsApi.medicalHistory(patientId),
        patientsApi.accounts(patientId),
        patientsApi.reports(patientId),
      ]);

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value);
      } else {
        setHistory([]);
      }

      if (accountsResult.status === 'fulfilled') {
        setAccounts(accountsResult.value);
      } else {
        setAccounts([]);
      }

      if (reportsResult.status === 'fulfilled') {
        setReports(reportsResult.value);
      } else {
        setReports([]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorStatus(err.status);
        if (err.status === 404) {
          setErrorMessage(
            'Patient record not found. The patient may have been deleted, or does not exist within your hospital workspace.',
          );
        } else if (err.status === 401 || err.status === 403) {
          setErrorMessage(
            'Access restricted. You do not have sufficient permissions to view this patient profile.',
          );
        } else {
          setErrorMessage(err.message || 'Failed to load patient profile from the server.');
        }
      } else {
        setErrorStatus(500);
        setErrorMessage('An unexpected error occurred while communicating with the server.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="mf-patient-profile" role="status" aria-live="polite">
        <div style={{ padding: 'var(--mf-space-12) 0' }}>
          <Loading label="Loading patient profile and clinical history…" fullHeight />
        </div>
      </div>
    );
  }

  // Not Found State (404)
  if (errorStatus === 404) {
    return (
      <div className="mf-patient-profile">
        <nav className="mf-patient-profile__nav">
          <Link to={ROUTES.patients} className="mf-patient-profile__back-btn">
            <ArrowLeft size={16} />
            Back to patient list
          </Link>
        </nav>
        <div className="mf-patient-profile__state-container" role="alert">
          <div className="mf-patient-profile__state-icon mf-patient-profile__state-icon--notfound">
            <AlertCircle size={28} />
          </div>
          <h2 className="mf-patient-profile__state-title">Patient Not Found</h2>
          <p className="mf-patient-profile__state-desc">{errorMessage}</p>
          <div className="mf-patient-profile__state-actions">
            <Button variant="secondary" onClick={() => navigate(ROUTES.patients)}>
              Return to Patients
            </Button>
            <Button variant="secondary" onClick={() => loadData()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized State (401 / 403)
  if (errorStatus === 401 || errorStatus === 403) {
    return (
      <div className="mf-patient-profile">
        <nav className="mf-patient-profile__nav">
          <Link to={ROUTES.patients} className="mf-patient-profile__back-btn">
            <ArrowLeft size={16} />
            Back to patient list
          </Link>
        </nav>
        <div className="mf-patient-profile__state-container" role="alert">
          <div className="mf-patient-profile__state-icon mf-patient-profile__state-icon--unauthorized">
            <Lock size={28} />
          </div>
          <h2 className="mf-patient-profile__state-title">Access Restricted</h2>
          <p className="mf-patient-profile__state-desc">{errorMessage}</p>
          <div className="mf-patient-profile__state-actions">
            <Button variant="secondary" onClick={() => navigate(ROUTES.patients)}>
              Return to Patients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // General Error State
  if (errorStatus !== null || !patient) {
    return (
      <div className="mf-patient-profile">
        <nav className="mf-patient-profile__nav">
          <Link to={ROUTES.patients} className="mf-patient-profile__back-btn">
            <ArrowLeft size={16} />
            Back to patient list
          </Link>
        </nav>
        <div className="mf-patient-profile__state-container" role="alert">
          <div className="mf-patient-profile__state-icon mf-patient-profile__state-icon--error">
            <AlertTriangle size={28} />
          </div>
          <h2 className="mf-patient-profile__state-title">Unable to Load Profile</h2>
          <p className="mf-patient-profile__state-desc">
            {errorMessage || 'There was an issue fetching the latest patient details from the server.'}
          </p>
          <div className="mf-patient-profile__state-actions">
            <Button leftIcon={<RefreshCw size={15} />} onClick={() => loadData()}>
              Retry Loading
            </Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.patients)}>
              Back to Patients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Tab definitions
  const tabs: TabItem[] = [
    { value: 'overview', label: 'Overview', icon: <User size={15} /> },
    { value: 'clinical', label: 'Clinical Information', icon: <HeartPulse size={15} /> },
    {
      value: 'history',
      label: `Medical History (${history.length})`,
      icon: <Activity size={15} />,
    },
    {
      value: 'reports',
      label: `Reports & Docs (${reports.length})`,
      icon: <FileText size={15} />,
    },
    { value: 'emergency', label: 'Emergency & Guardian', icon: <Users size={15} /> },
    { value: 'insurance', label: 'Insurance & ID', icon: <Shield size={15} /> },
    {
      value: 'accounts',
      label: `Linked Accounts (${accounts.length})`,
      icon: <LinkIcon size={15} />,
    },
  ];

  // Effective values considering pending edits
  const effectiveFirstName = pendingEdits.firstName !== undefined ? pendingEdits.firstName : (patient.firstName || '');
  const effectiveLastName = pendingEdits.lastName !== undefined ? pendingEdits.lastName : (patient.lastName || '');
  const effectiveFullName =
    pendingEdits.fullName !== undefined
      ? pendingEdits.fullName
      : (patient.fullName || `${effectiveFirstName} ${effectiveLastName}`.trim());
  const effectiveGender = pendingEdits.gender !== undefined ? pendingEdits.gender : (patient.gender || '');
  const effectiveBloodGroup = pendingEdits.bloodGroup !== undefined ? pendingEdits.bloodGroup : (patient.bloodGroup || '');
  const effectiveDob = pendingEdits.dateOfBirth !== undefined ? pendingEdits.dateOfBirth : (patient.dateOfBirth || '');
  const effectivePhone = pendingEdits.phone !== undefined ? pendingEdits.phone : (patient.phone || '');
  const effectiveEmail = pendingEdits.email !== undefined ? pendingEdits.email : (patient.email || '');

  // Derived age dynamically reflects DOB changes
  const effectiveAge = touchedFields.has('dateOfBirth')
    ? calculateAge(effectiveDob, null)
    : calculateAge(patient.dateOfBirth, patient.age);

  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
    { value: 'UNKNOWN', label: 'Unknown' },
  ];

  const bloodGroupOptions = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
  ];

  return (
    <div className={`mf-patient-profile ${isEditMode ? 'mf-patient-profile--editing' : ''}`}>
      {/* Top Navigation & Breadcrumbs */}
      <nav className="mf-patient-profile__nav" aria-label="Patient profile navigation">
        <Breadcrumb
          items={[
            { label: 'Patients', path: ROUTES.patients },
            { label: effectiveFullName || patient.fullName },
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)' }}>
          <Link to={ROUTES.patients} className="mf-patient-profile__back-btn">
            <ArrowLeft size={15} />
            Back to patients
          </Link>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} className={isRefreshing ? 'mf-spin' : undefined} />}
            onClick={() => loadData(true)}
            disabled={isRefreshing || isEditMode}
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </nav>

      {/* Hero Patient Banner */}
      <header className="mf-patient-profile__hero">
        <div className="mf-patient-profile__hero-main">
          <div className="mf-patient-profile__hero-identity">
            <Avatar name={effectiveFullName || patient.fullName} size="xl" />
            <div className="mf-patient-profile__hero-titles">
              <div className="mf-patient-profile__title-row">
                <h1 className="mf-patient-profile__name">
                  <InlineEditableField
                    fieldKey="fullName"
                    label="Patient Name"
                    value={effectiveFullName}
                    displayElement={<span>{effectiveFullName || '—'}</span>}
                    isEditMode={isEditMode}
                    isActive={activeField === 'fullName'}
                    hasPendingChange={touchedFields.has('fullName') || touchedFields.has('firstName') || touchedFields.has('lastName')}
                    error={fieldErrors.fullName}
                    inputType="text"
                    placeholder="Full patient name"
                    onStartEdit={() => setActiveField('fullName')}
                    onCancelEdit={() => setActiveField(null)}
                    onCommit={(val) => handleFieldChange('fullName', val)}
                  />
                </h1>
                <span className="mf-patient-profile__code-badge" title="Patient Identifier (Read-only)">
                  {patient.patientCode}
                </span>
                <Badge tone={statusTone(patient.status)} dot>
                  {humanize(patient.status)}
                </Badge>
                {isEditMode && (
                  <span className="mf-patient-profile__edit-badge">
                    <Pencil size={11} aria-hidden="true" />
                    Edit Mode
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-3)', color: 'var(--mf-ink-500)', fontSize: 'var(--mf-fs-sm)', flexWrap: 'wrap' }}>
                <span data-testid="patient-effective-age" title="Age (dynamically calculated from date of birth)">{effectiveAge}</span>
                <span>•</span>
                <span>
                  <InlineEditableField
                    fieldKey="gender"
                    label="Gender"
                    value={effectiveGender}
                    displayElement={<span>{humanize(effectiveGender) || '—'}</span>}
                    isEditMode={isEditMode}
                    isActive={activeField === 'gender'}
                    hasPendingChange={touchedFields.has('gender')}
                    error={fieldErrors.gender}
                    inputType="select"
                    options={genderOptions}
                    onStartEdit={() => setActiveField('gender')}
                    onCancelEdit={() => setActiveField(null)}
                    onCommit={(val) => handleFieldChange('gender', val)}
                  />
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Blood:
                  <InlineEditableField
                    fieldKey="bloodGroup"
                    label="Blood Group"
                    value={effectiveBloodGroup}
                    displayElement={<strong>{fallback(effectiveBloodGroup)}</strong>}
                    isEditMode={isEditMode}
                    isActive={activeField === 'bloodGroup'}
                    hasPendingChange={touchedFields.has('bloodGroup')}
                    error={fieldErrors.bloodGroup}
                    inputType="select"
                    options={bloodGroupOptions}
                    onStartEdit={() => setActiveField('bloodGroup')}
                    onCancelEdit={() => setActiveField(null)}
                    onCommit={(val) => handleFieldChange('bloodGroup', val)}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Profile Hero Action Buttons */}
          <div className="mf-patient-profile__hero-actions">
            {!isEditMode ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pencil size={14} />}
                onClick={handleStartEdit}
                data-testid="edit-profile-btn"
              >
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Check size={14} />}
                  onClick={handleSaveDone}
                  disabled={isSaving}
                  data-testid="save-profile-btn"
                >
                  {isSaving ? 'Saving…' : 'Done'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<X size={14} />}
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  data-testid="cancel-profile-btn"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick summary stats bar */}
        <div className="mf-patient-profile__quick-stats" aria-label="Key patient facts">
          <div className="mf-patient-profile__quick-item">
            <span className="mf-patient-profile__quick-label">Date of Birth</span>
            <span className="mf-patient-profile__quick-val">
              <InlineEditableField
                fieldKey="dateOfBirth"
                label="Date of Birth"
                value={effectiveDob}
                displayElement={<span>{formatDobDate(effectiveDob)}</span>}
                isEditMode={isEditMode}
                isActive={activeField === 'dateOfBirth'}
                hasPendingChange={touchedFields.has('dateOfBirth')}
                error={fieldErrors.dateOfBirth}
                inputType="date"
                onStartEdit={() => setActiveField('dateOfBirth')}
                onCancelEdit={() => setActiveField(null)}
                onCommit={(val) => handleFieldChange('dateOfBirth', val)}
              />
            </span>
          </div>
          <div className="mf-patient-profile__quick-item">
            <span className="mf-patient-profile__quick-label">Phone</span>
            <span className="mf-patient-profile__quick-val">
              <InlineEditableField
                fieldKey="phone"
                label="Phone"
                value={effectivePhone}
                displayElement={
                  effectivePhone ? (
                    <a href={`tel:${effectivePhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {effectivePhone}
                    </a>
                  ) : (
                    <span>—</span>
                  )
                }
                isEditMode={isEditMode}
                isActive={activeField === 'phone'}
                hasPendingChange={touchedFields.has('phone')}
                error={fieldErrors.phone}
                inputType="tel"
                placeholder="Phone number"
                onStartEdit={() => setActiveField('phone')}
                onCancelEdit={() => setActiveField(null)}
                onCommit={(val) => handleFieldChange('phone', val)}
              />
            </span>
          </div>
          <div className="mf-patient-profile__quick-item">
            <span className="mf-patient-profile__quick-label">Email</span>
            <span className="mf-patient-profile__quick-val">
              <InlineEditableField
                fieldKey="email"
                label="Email"
                value={effectiveEmail}
                displayElement={
                  effectiveEmail ? (
                    <a href={`mailto:${effectiveEmail}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {effectiveEmail}
                    </a>
                  ) : (
                    <span>—</span>
                  )
                }
                isEditMode={isEditMode}
                isActive={activeField === 'email'}
                hasPendingChange={touchedFields.has('email')}
                error={fieldErrors.email}
                inputType="email"
                placeholder="Email address"
                onStartEdit={() => setActiveField('email')}
                onCancelEdit={() => setActiveField(null)}
                onCommit={(val) => handleFieldChange('email', val)}
              />
            </span>
          </div>
          <div className="mf-patient-profile__quick-item">
            <span className="mf-patient-profile__quick-label">Registered</span>
            <span className="mf-patient-profile__quick-val">{formatDate(patient.createdAt)}</span>
          </div>
          <div className="mf-patient-profile__quick-item">
            <span className="mf-patient-profile__quick-label">Last Updated</span>
            <span className="mf-patient-profile__quick-val">
              {patient.updatedAt ? formatDate(patient.updatedAt) : formatDate(patient.createdAt)}
            </span>
          </div>
        </div>
      </header>

      {/* Tab Strip */}
      <div className="mf-patient-profile__tabs-wrapper">
        <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab 1: Overview */}
      <TabPanel value="overview" activeValue={activeTab}>
        <div className="mf-patient-profile__grid">
          {/* Demographics Card */}
          <section className="mf-profile-card" aria-labelledby="demographics-heading">
            <div className="mf-profile-card__header">
              <h2 id="demographics-heading" className="mf-profile-card__title">
                <User size={18} />
                Demographic Information
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <dl className="mf-data-list">
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Full Legal Name</dt>
                  <dd className="mf-data-item__val">
                    <InlineEditableField
                      fieldKey="fullName"
                      testId="overview-editable-field-fullName"
                      label="Full Legal Name"
                      value={effectiveFullName}
                      displayElement={<span>{fallback(effectiveFullName)}</span>}
                      isEditMode={isEditMode}
                      isActive={activeField === 'overview-fullName'}
                      hasPendingChange={touchedFields.has('fullName') || touchedFields.has('firstName') || touchedFields.has('lastName')}
                      error={fieldErrors.fullName}
                      inputType="text"
                      placeholder="Full patient name"
                      onStartEdit={() => setActiveField('overview-fullName')}
                      onCancelEdit={() => setActiveField(null)}
                      onCommit={(val) => handleFieldChange('fullName', val)}
                    />
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">First Name</dt>
                  <dd className="mf-data-item__val">
                    <InlineEditableField
                      fieldKey="firstName"
                      testId="overview-editable-field-firstName"
                      label="First Name"
                      value={effectiveFirstName}
                      displayElement={<span>{fallback(effectiveFirstName)}</span>}
                      isEditMode={isEditMode}
                      isActive={activeField === 'overview-firstName'}
                      hasPendingChange={touchedFields.has('firstName')}
                      error={fieldErrors.firstName}
                      inputType="text"
                      placeholder="First name"
                      onStartEdit={() => setActiveField('overview-firstName')}
                      onCancelEdit={() => setActiveField(null)}
                      onCommit={(val) => handleFieldChange('firstName', val)}
                    />
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Last Name</dt>
                  <dd className="mf-data-item__val">
                    <InlineEditableField
                      fieldKey="lastName"
                      testId="overview-editable-field-lastName"
                      label="Last Name"
                      value={effectiveLastName}
                      displayElement={<span>{fallback(effectiveLastName)}</span>}
                      isEditMode={isEditMode}
                      isActive={activeField === 'overview-lastName'}
                      hasPendingChange={touchedFields.has('lastName')}
                      error={fieldErrors.lastName}
                      inputType="text"
                      placeholder="Last name"
                      onStartEdit={() => setActiveField('overview-lastName')}
                      onCancelEdit={() => setActiveField(null)}
                      onCommit={(val) => handleFieldChange('lastName', val)}
                    />
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Patient Code</dt>
                  <dd className="mf-data-item__val mf-data-item__val--mono">{fallback(patient.patientCode)}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Date of Birth</dt>
                  <dd className="mf-data-item__val">
                    <InlineEditableField
                      fieldKey="dateOfBirth"
                      testId="overview-editable-field-dateOfBirth"
                      label="Date of Birth"
                      value={effectiveDob}
                      displayElement={<span>{formatDobDate(effectiveDob)}</span>}
                      isEditMode={isEditMode}
                      isActive={activeField === 'overview-dateOfBirth'}
                      hasPendingChange={touchedFields.has('dateOfBirth')}
                      error={fieldErrors.dateOfBirth}
                      inputType="date"
                      onStartEdit={() => setActiveField('overview-dateOfBirth')}
                      onCancelEdit={() => setActiveField(null)}
                      onCommit={(val) => handleFieldChange('dateOfBirth', val)}
                    />
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Calculated Age</dt>
                  <dd className="mf-data-item__val">{effectiveAge}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Gender</dt>
                  <dd className="mf-data-item__val">
                    <InlineEditableField
                      fieldKey="gender"
                      testId="overview-editable-field-gender"
                      label="Gender"
                      value={effectiveGender}
                      displayElement={<span>{humanize(effectiveGender) || '—'}</span>}
                      isEditMode={isEditMode}
                      isActive={activeField === 'overview-gender'}
                      hasPendingChange={touchedFields.has('gender')}
                      error={fieldErrors.gender}
                      inputType="select"
                      options={genderOptions}
                      onStartEdit={() => setActiveField('overview-gender')}
                      onCancelEdit={() => setActiveField(null)}
                      onCommit={(val) => handleFieldChange('gender', val)}
                    />
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Preferred Language</dt>
                  <dd className="mf-data-item__val">{fallback(patient.preferredLanguage, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Account Status</dt>
                  <dd className="mf-data-item__val">
                    <Badge tone={statusTone(patient.status)} dot>
                      {humanize(patient.status)}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Contact & Address Card */}
          <section className="mf-profile-card" aria-labelledby="contact-heading">
            <div className="mf-profile-card__header">
              <h2 id="contact-heading" className="mf-profile-card__title">
                <MapPin size={18} />
                Contact & Address
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <dl className="mf-data-list">
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Phone Number</dt>
                  <dd className="mf-data-item__val">
                    <InlineEditableField
                      fieldKey="phone"
                      testId="overview-editable-field-phone"
                      label="Phone Number"
                      value={effectivePhone}
                      displayElement={
                        effectivePhone ? (
                          <a href={`tel:${effectivePhone}`}>
                            <Phone size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                            {effectivePhone}
                          </a>
                        ) : (
                          <span>Not available</span>
                        )
                      }
                      isEditMode={isEditMode}
                      isActive={activeField === 'overview-phone'}
                      hasPendingChange={touchedFields.has('phone')}
                      error={fieldErrors.phone}
                      inputType="tel"
                      placeholder="Phone number"
                      onStartEdit={() => setActiveField('overview-phone')}
                      onCancelEdit={() => setActiveField(null)}
                      onCommit={(val) => handleFieldChange('phone', val)}
                    />
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Email Address</dt>
                  <dd className="mf-data-item__val">
                    <InlineEditableField
                      fieldKey="email"
                      testId="overview-editable-field-email"
                      label="Email Address"
                      value={effectiveEmail}
                      displayElement={
                        effectiveEmail ? (
                          <a href={`mailto:${effectiveEmail}`}>
                            <Mail size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                            {effectiveEmail}
                          </a>
                        ) : (
                          <span>Not available</span>
                        )
                      }
                      isEditMode={isEditMode}
                      isActive={activeField === 'overview-email'}
                      hasPendingChange={touchedFields.has('email')}
                      error={fieldErrors.email}
                      inputType="email"
                      placeholder="Email address"
                      onStartEdit={() => setActiveField('overview-email')}
                      onCancelEdit={() => setActiveField(null)}
                      onCommit={(val) => handleFieldChange('email', val)}
                    />
                  </dd>
                </div>
                <div className="mf-data-item mf-patient-profile__grid--full">
                  <dt className="mf-data-item__label">Street Address</dt>
                  <dd className="mf-data-item__val">{fallback(patient.address, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">City</dt>
                  <dd className="mf-data-item__val">{fallback(patient.city, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">State / Province</dt>
                  <dd className="mf-data-item__val">{fallback(patient.state, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Postal / ZIP Code</dt>
                  <dd className="mf-data-item__val mf-data-item__val--mono">{fallback(patient.postalCode, 'Not available')}</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Record Metadata Card */}
          <section className="mf-profile-card mf-patient-profile__grid--full" aria-labelledby="metadata-heading">
            <div className="mf-profile-card__header">
              <h2 id="metadata-heading" className="mf-profile-card__title">
                <Clock size={18} />
                Record Timestamps & Provenance
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <dl className="mf-data-list">
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Initial Registration</dt>
                  <dd className="mf-data-item__val">{formatDateTime(patient.createdAt)}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Last Profile Update</dt>
                  <dd className="mf-data-item__val">
                    {patient.updatedAt ? formatDateTime(patient.updatedAt) : formatDateTime(patient.createdAt)}
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Record Classification</dt>
                  <dd className="mf-data-item__val">Electronic Health Record (Read-only master)</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </TabPanel>

      {/* Tab 2: Clinical Information */}
      <TabPanel value="clinical" activeValue={activeTab}>
        <div className="mf-patient-profile__grid">
          {/* Clinical Details */}
          <section className="mf-profile-card" aria-labelledby="clinical-heading">
            <div className="mf-profile-card__header">
              <h2 id="clinical-heading" className="mf-profile-card__title">
                <HeartPulse size={18} />
                Clinical Profile
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <dl className="mf-data-list">
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Blood Group</dt>
                  <dd className="mf-data-item__val">
                    <InlineEditableField
                      fieldKey="bloodGroup"
                      testId="clinical-editable-field-bloodGroup"
                      label="Blood Group"
                      value={effectiveBloodGroup}
                      displayElement={<strong>{fallback(effectiveBloodGroup, 'Not available')}</strong>}
                      isEditMode={isEditMode}
                      isActive={activeField === 'clinical-bloodGroup'}
                      hasPendingChange={touchedFields.has('bloodGroup')}
                      error={fieldErrors.bloodGroup}
                      inputType="select"
                      options={bloodGroupOptions}
                      onStartEdit={() => setActiveField('clinical-bloodGroup')}
                      onCancelEdit={() => setActiveField(null)}
                      onCommit={(val) => handleFieldChange('bloodGroup', val)}
                    />
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Referring Physician</dt>
                  <dd className="mf-data-item__val">{fallback(patient.referringPhysician, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Consent Status</dt>
                  <dd className="mf-data-item__val">
                    <Badge tone={patient.consentStatus?.toUpperCase() === 'GRANTED' ? 'green' : 'neutral'}>
                      {humanize(patient.consentStatus) || 'Not recorded'}
                    </Badge>
                  </dd>
                </div>
              </dl>

              {/* Known Allergies Alert Box */}
              <div style={{ marginTop: 'var(--mf-space-2)' }}>
                <span className="mf-data-item__label" style={{ display: 'block', marginBottom: 6 }}>
                  Allergies & Contraindications
                </span>
                {patient.allergies && patient.allergies.trim().length > 0 ? (
                  <div className="mf-allergy-box" role="note">
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Active Allergies:</strong> {patient.allergies}
                    </div>
                  </div>
                ) : (
                  <div className="mf-allergy-box mf-allergy-box--none" role="note">
                    <FileCheck2 size={18} style={{ flexShrink: 0 }} />
                    <div>No documented drug or food allergies on file.</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Medical Privacy & Audit Notice */}
          <section className="mf-profile-card" aria-labelledby="privacy-heading">
            <div className="mf-profile-card__header">
              <h2 id="privacy-heading" className="mf-profile-card__title">
                <Shield size={18} />
                Clinical Privacy Notice
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <p style={{ fontSize: 'var(--mf-fs-sm)', color: 'var(--mf-ink-500)', margin: 0, lineHeight: 1.6 }}>
                This patient record is protected under clinical data privacy policies and hospital tenant boundaries.
                All views, medical updates, and document attachments are audited with actor identifiers, timestamp, and network trace.
              </p>
              <div style={{ background: 'var(--mf-bg-subtle)', padding: 'var(--mf-space-3)', borderRadius: 'var(--mf-radius-sm)', fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-400)' }}>
                <strong>Read-Only Notice:</strong> Clinical diagnoses and treatment history are authored directly during doctor consultations.
              </div>
            </div>
          </section>
        </div>
      </TabPanel>

      {/* Tab 3: Medical History */}
      <TabPanel value="history" activeValue={activeTab}>
        <section className="mf-profile-card" aria-labelledby="history-heading">
          <div className="mf-profile-card__header">
            <h2 id="history-heading" className="mf-profile-card__title">
              <Activity size={18} />
              Recorded Medical Conditions & History
            </h2>
            <span style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-400)' }}>
              Read-only clinical log
            </span>
          </div>
          <div className="mf-profile-card__body" style={{ padding: 0 }}>
            {history.length === 0 ? (
              <div style={{ padding: 'var(--mf-space-8)' }}>
                <EmptyState
                  icon={<Activity size={32} />}
                  title="No Medical History Recorded"
                  description="No chronic conditions, past procedures, or clinical notes have been logged for this patient."
                />
              </div>
            ) : (
              <table className="mf-profile-table">
                <thead>
                  <tr>
                    <th>Condition / Diagnosis</th>
                    <th>Clinical Notes</th>
                    <th>Recorded By</th>
                    <th>Date Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--mf-ink-900)' }}>{item.conditionName}</td>
                      <td>{fallback(item.notes, 'No clinical notes provided')}</td>
                      <td>
                        {item.recordedByDoctorId ? (
                          <span className="mf-data-item__val--mono">Doctor #{item.recordedByDoctorId}</span>
                        ) : (
                          'Attending Staff'
                        )}
                      </td>
                      <td>{formatDateTime(item.recordedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </TabPanel>

      {/* Tab 4: Reports & Documents */}
      <TabPanel value="reports" activeValue={activeTab}>
        <section className="mf-profile-card" aria-labelledby="reports-heading">
          <div className="mf-profile-card__header">
            <h2 id="reports-heading" className="mf-profile-card__title">
              <FileText size={18} />
              Diagnostic Reports & Attached Documents
            </h2>
          </div>
          <div className="mf-profile-card__body" style={{ padding: 0 }}>
            {reports.length === 0 ? (
              <div style={{ padding: 'var(--mf-space-8)' }}>
                <EmptyState
                  icon={<FileText size={32} />}
                  title="No Documents Attached"
                  description="No lab results, imaging scans, discharge summaries, or referrals have been uploaded for this patient."
                />
              </div>
            ) : (
              <table className="mf-profile-table">
                <thead>
                  <tr>
                    <th>Report Type / Title</th>
                    <th>File Location</th>
                    <th>Uploaded By</th>
                    <th>Date Uploaded</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td style={{ fontWeight: 600, color: 'var(--mf-ink-900)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={15} color="var(--mf-blue-600)" />
                          {report.reportType}
                        </span>
                      </td>
                      <td className="mf-data-item__val--mono" style={{ fontSize: 'var(--mf-fs-xs)' }}>
                        {fallback(report.fileUrl, 'Not available')}
                      </td>
                      <td>
                        {report.uploadedByUserId ? `Staff ID #${report.uploadedByUserId}` : 'System'}
                      </td>
                      <td>{formatDateTime(report.uploadedAt)}</td>
                      <td>
                        {report.fileUrl ? (
                          <a
                            href={report.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: 'var(--mf-blue-600)',
                              fontSize: 'var(--mf-fs-xs)',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <Download size={13} />
                            Open document
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </TabPanel>

      {/* Tab 5: Emergency & Guardian */}
      <TabPanel value="emergency" activeValue={activeTab}>
        <div className="mf-patient-profile__grid">
          {/* Emergency Contact */}
          <section className="mf-profile-card" aria-labelledby="emergency-heading">
            <div className="mf-profile-card__header">
              <h2 id="emergency-heading" className="mf-profile-card__title">
                <Phone size={18} />
                Primary Emergency Contact
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <dl className="mf-data-list">
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Contact Name</dt>
                  <dd className="mf-data-item__val">{fallback(patient.emergencyContactName, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Relationship</dt>
                  <dd className="mf-data-item__val">
                    {fallback(humanize(patient.emergencyContactRelationship), 'Not available')}
                  </dd>
                </div>
                <div className="mf-data-item mf-patient-profile__grid--full">
                  <dt className="mf-data-item__label">Emergency Phone Number</dt>
                  <dd className="mf-data-item__val">
                    {patient.emergencyContactPhone ? (
                      <a href={`tel:${patient.emergencyContactPhone}`}>
                        <Phone size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                        {patient.emergencyContactPhone}
                      </a>
                    ) : (
                      'Not available'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Guardian Details */}
          <section className="mf-profile-card" aria-labelledby="guardian-heading">
            <div className="mf-profile-card__header">
              <h2 id="guardian-heading" className="mf-profile-card__title">
                <Users size={18} />
                Guardian / Caretaker Details
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <dl className="mf-data-list">
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Guardian Name</dt>
                  <dd className="mf-data-item__val">{fallback(patient.guardianName, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Relationship to Patient</dt>
                  <dd className="mf-data-item__val">
                    {fallback(humanize(patient.guardianRelationship), 'Not available')}
                  </dd>
                </div>
                <div className="mf-data-item mf-patient-profile__grid--full">
                  <dt className="mf-data-item__label">Guardian Mobile</dt>
                  <dd className="mf-data-item__val">
                    {patient.guardianMobile ? (
                      <a href={`tel:${patient.guardianMobile}`}>
                        <Phone size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                        {patient.guardianMobile}
                      </a>
                    ) : (
                      'Not available'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </TabPanel>

      {/* Tab 6: Insurance & Identification */}
      <TabPanel value="insurance" activeValue={activeTab}>
        <div className="mf-patient-profile__grid">
          {/* Insurance Coverage */}
          <section className="mf-profile-card" aria-labelledby="insurance-heading">
            <div className="mf-profile-card__header">
              <h2 id="insurance-heading" className="mf-profile-card__title">
                <Shield size={18} />
                Health Insurance Coverage
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <dl className="mf-data-list">
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Insurance Provider</dt>
                  <dd className="mf-data-item__val">{fallback(patient.insuranceProvider, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Member / Policy ID</dt>
                  <dd className="mf-data-item__val mf-data-item__val--mono">
                    {fallback(patient.memberId, 'Not available')}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Government Identification */}
          <section className="mf-profile-card" aria-labelledby="govid-heading">
            <div className="mf-profile-card__header">
              <h2 id="govid-heading" className="mf-profile-card__title">
                <Lock size={18} />
                Government Identification
              </h2>
            </div>
            <div className="mf-profile-card__body">
              <dl className="mf-data-list">
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">ID Type</dt>
                  <dd className="mf-data-item__val">{fallback(patient.governmentIdType, 'Not available')}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">ID Number</dt>
                  <dd className="mf-data-item__val">
                    {patient.governmentIdNumber ? (
                      <div className="mf-sensitive-id">
                        <span>
                          {showGovernmentId
                            ? patient.governmentIdNumber
                            : maskGovernmentId(patient.governmentIdNumber)}
                        </span>
                        <button
                          type="button"
                          className="mf-sensitive-id__toggle"
                          onClick={() => setShowGovernmentId(!showGovernmentId)}
                          title={showGovernmentId ? 'Hide identification number' : 'Show identification number'}
                          aria-label={showGovernmentId ? 'Hide identification number' : 'Show identification number'}
                        >
                          {showGovernmentId ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    ) : (
                      'Not available'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </TabPanel>

      {/* Tab 7: Linked Accounts */}
      <TabPanel value="accounts" activeValue={activeTab}>
        <section className="mf-profile-card" aria-labelledby="accounts-heading">
          <div className="mf-profile-card__header">
            <h2 id="accounts-heading" className="mf-profile-card__title">
              <LinkIcon size={18} />
              Authorized Patient Portal Accounts
            </h2>
          </div>
          <div className="mf-profile-card__body" style={{ padding: 0 }}>
            {accounts.length === 0 ? (
              <div style={{ padding: 'var(--mf-space-8)' }}>
                <EmptyState
                  icon={<LinkIcon size={32} />}
                  title="No Linked Portal Accounts"
                  description="No user accounts (self, parent, caretaker, or guardian) have been mapped to this patient record yet."
                />
              </div>
            ) : (
              <table className="mf-profile-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Email Address</th>
                    <th>Relationship</th>
                    <th>Primary Contact</th>
                    <th>Linked Date</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id}>
                      <td style={{ fontWeight: 600, color: 'var(--mf-ink-900)' }}>
                        {fallback(acc.userFullName, `User #${acc.userId}`)}
                      </td>
                      <td>{fallback(acc.userEmail, 'Not available')}</td>
                      <td>
                        <Badge tone="teal">{humanize(acc.relation)}</Badge>
                      </td>
                      <td>
                        {acc.primaryContact ? (
                          <Badge tone="green" dot>
                            Primary Contact
                          </Badge>
                        ) : (
                          'No'
                        )}
                      </td>
                      <td>{formatDate(acc.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </TabPanel>
    </div>
  );
}
