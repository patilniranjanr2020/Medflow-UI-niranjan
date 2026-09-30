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
} from 'lucide-react';
import { Avatar } from '../../../shared/components/Avatar/Avatar';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Breadcrumb } from '../../../shared/components/Breadcrumb/Breadcrumb';
import { EmptyState } from '../../../shared/components/EmptyState/EmptyState';
import { Loading } from '../../../shared/components/Loading/Loading';
import { Tabs, TabPanel, type TabItem } from '../../../shared/components/Tabs/Tabs';
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
import './PatientProfilePage.css';

/** Renders fallback text if the value is null, undefined, or empty string. */
function fallback(val?: string | number | null, placeholder = '—'): string {
  if (val === null || val === undefined) return placeholder;
  const str = String(val).trim();
  return str.length > 0 ? str : placeholder;
}

/** Calculates readable age from date of birth or returns age property. */
function calculateAge(dob?: string | null, ageProp?: number | null): string {
  if (ageProp !== undefined && ageProp !== null) return `${ageProp} yrs`;
  if (!dob) return '—';
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

  return (
    <div className="mf-patient-profile">
      {/* Top Navigation & Breadcrumbs */}
      <nav className="mf-patient-profile__nav" aria-label="Patient profile navigation">
        <Breadcrumb
          items={[
            { label: 'Patients', path: ROUTES.patients },
            { label: patient.fullName },
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
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </nav>

      {/* Hero Patient Banner */}
      <header className="mf-patient-profile__hero">
        <div className="mf-patient-profile__hero-main">
          <div className="mf-patient-profile__hero-identity">
            <Avatar name={patient.fullName} size="xl" />
            <div className="mf-patient-profile__hero-titles">
              <div className="mf-patient-profile__title-row">
                <h1 className="mf-patient-profile__name">{patient.fullName}</h1>
                <span className="mf-patient-profile__code-badge" title="Patient Identifier">
                  {patient.patientCode}
                </span>
                <Badge tone={statusTone(patient.status)} dot>
                  {humanize(patient.status)}
                </Badge>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-3)', color: 'var(--mf-ink-500)', fontSize: 'var(--mf-fs-sm)' }}>
                <span>{calculateAge(patient.dateOfBirth, patient.age)}</span>
                <span>•</span>
                <span>{humanize(patient.gender)}</span>
                <span>•</span>
                <span>Blood: <strong>{fallback(patient.bloodGroup)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick summary stats bar */}
        <div className="mf-patient-profile__quick-stats" aria-label="Key patient facts">
          <div className="mf-patient-profile__quick-item">
            <span className="mf-patient-profile__quick-label">Date of Birth</span>
            <span className="mf-patient-profile__quick-val">{formatDate(patient.dateOfBirth)}</span>
          </div>
          <div className="mf-patient-profile__quick-item">
            <span className="mf-patient-profile__quick-label">Phone</span>
            <span className="mf-patient-profile__quick-val">
              {patient.phone ? (
                <a href={`tel:${patient.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {patient.phone}
                </a>
              ) : (
                '—'
              )}
            </span>
          </div>
          <div className="mf-patient-profile__quick-item">
            <span className="mf-patient-profile__quick-label">Email</span>
            <span className="mf-patient-profile__quick-val">
              {patient.email ? (
                <a href={`mailto:${patient.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {patient.email}
                </a>
              ) : (
                '—'
              )}
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
                  <dd className="mf-data-item__val">{fallback(patient.fullName)}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">First Name</dt>
                  <dd className="mf-data-item__val">{fallback(patient.firstName)}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Last Name</dt>
                  <dd className="mf-data-item__val">{fallback(patient.lastName)}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Patient Code</dt>
                  <dd className="mf-data-item__val mf-data-item__val--mono">{fallback(patient.patientCode)}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Date of Birth</dt>
                  <dd className="mf-data-item__val">{formatDate(patient.dateOfBirth)}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Calculated Age</dt>
                  <dd className="mf-data-item__val">{calculateAge(patient.dateOfBirth, patient.age)}</dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Gender</dt>
                  <dd className="mf-data-item__val">{humanize(patient.gender)}</dd>
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
                    {patient.phone ? (
                      <a href={`tel:${patient.phone}`}>
                        <Phone size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                        {patient.phone}
                      </a>
                    ) : (
                      'Not available'
                    )}
                  </dd>
                </div>
                <div className="mf-data-item">
                  <dt className="mf-data-item__label">Email Address</dt>
                  <dd className="mf-data-item__val">
                    {patient.email ? (
                      <a href={`mailto:${patient.email}`}>
                        <Mail size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                        {patient.email}
                      </a>
                    ) : (
                      'Not available'
                    )}
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
                    <strong>{fallback(patient.bloodGroup, 'Not available')}</strong>
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
