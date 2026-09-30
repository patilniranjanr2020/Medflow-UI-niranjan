import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PatientProfilePage from './PatientProfilePage';
import PatientsPage from './PatientsPage';
import { ToastProvider } from '../../../shared/components/Toast/Toast';
import { patientsApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import type { Patient, PatientMedicalHistory, PatientAccount, PatientReport } from '../../../core/api/types';

vi.mock('../../../core/api/services', () => ({
  patientsApi: {
    get: vi.fn(),
    list: vi.fn(),
    medicalHistory: vi.fn(),
    accounts: vi.fn(),
    reports: vi.fn(),
  },
}));

const mockPatient: Patient = {
  id: 101,
  patientCode: 'PAT-000101',
  fullName: 'Meera Joshi',
  firstName: 'Meera',
  lastName: 'Joshi',
  gender: 'FEMALE',
  dateOfBirth: '1991-04-12',
  age: 34,
  bloodGroup: 'O+',
  phone: '+91 98765 43210',
  email: 'meera.joshi@example.com',
  address: '42 Orchid Lane, Green Valley',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  preferredLanguage: 'English',
  emergencyContactName: 'Vikram Joshi',
  emergencyContactPhone: '+91 98765 11111',
  emergencyContactRelationship: 'SPOUSE',
  insuranceProvider: 'Star Health',
  memberId: 'SH-9928172',
  governmentIdType: 'Aadhaar',
  governmentIdNumber: '998877665544',
  allergies: 'Penicillin, Peanuts',
  consentStatus: 'GRANTED',
  referringPhysician: 'Dr. Anand Kumar',
  guardianName: 'Sunita Joshi',
  guardianRelationship: 'PARENT',
  guardianMobile: '+91 98765 22222',
  status: 'ACTIVE',
  createdAt: '2026-01-15T10:30:00Z',
  updatedAt: '2026-02-20T14:45:00Z',
};

const mockHistory: PatientMedicalHistory[] = [
  {
    id: 1,
    patientId: 101,
    conditionName: 'Hypertension',
    notes: 'Stage 1 managed with lifestyle adjustments.',
    recordedByDoctorId: 12,
    recordedAt: '2026-02-01T09:00:00Z',
  },
];

const mockAccounts: PatientAccount[] = [
  {
    id: 1,
    userId: 201,
    userFullName: 'Vikram Joshi',
    userEmail: 'vikram@example.com',
    relation: 'SPOUSE',
    primaryContact: true,
    createdAt: '2026-01-15T11:00:00Z',
  },
];

const mockReports: PatientReport[] = [
  {
    id: 1,
    patientId: 101,
    reportType: 'Complete Blood Count',
    fileUrl: 'https://storage.medflow.local/reports/cbc-101.pdf',
    uploadedByUserId: 5,
    uploadedAt: '2026-02-15T15:30:00Z',
  },
];

describe('PatientProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially while fetching data', () => {
    vi.mocked(patientsApi.get).mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={['/patients/101']}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText(/Loading patient profile/i)).toBeDefined();
  });

  it('loads and displays full patient details from all backend endpoints', async () => {
    vi.mocked(patientsApi.get).mockResolvedValue(mockPatient);
    vi.mocked(patientsApi.medicalHistory).mockResolvedValue(mockHistory);
    vi.mocked(patientsApi.accounts).mockResolvedValue(mockAccounts);
    vi.mocked(patientsApi.reports).mockResolvedValue(mockReports);

    render(
      <MemoryRouter initialEntries={['/patients/101']}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Meera Joshi' })).toBeDefined();
    });

    expect(patientsApi.get).toHaveBeenCalledWith('101');
    expect(patientsApi.medicalHistory).toHaveBeenCalledWith('101');
    expect(patientsApi.accounts).toHaveBeenCalledWith('101');
    expect(patientsApi.reports).toHaveBeenCalledWith('101');

    // Check header identifiers and badges
    expect(screen.getAllByText('PAT-000101').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('34 yrs').length).toBeGreaterThan(0);

    // Check demographic card details
    expect(screen.getByText('42 Orchid Lane, Green Valley')).toBeDefined();
    expect(screen.getByText('Bengaluru')).toBeDefined();
    expect(screen.getByText('Karnataka')).toBeDefined();
    expect(screen.getByText('560001')).toBeDefined();
    expect(screen.getByText('English')).toBeDefined();

    // Check tabs rendering
    expect(screen.getByRole('tab', { name: /Medical History \(1\)/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Reports & Docs \(1\)/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Linked Accounts \(1\)/i })).toBeDefined();
  });

  it('navigates through tabs and displays clinical, medical history, reports, and accounts', async () => {
    vi.mocked(patientsApi.get).mockResolvedValue(mockPatient);
    vi.mocked(patientsApi.medicalHistory).mockResolvedValue(mockHistory);
    vi.mocked(patientsApi.accounts).mockResolvedValue(mockAccounts);
    vi.mocked(patientsApi.reports).mockResolvedValue(mockReports);

    render(
      <MemoryRouter initialEntries={['/patients/101']}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Meera Joshi' })).toBeDefined();
    });

    // 1. Clinical Information Tab
    fireEvent.click(screen.getByRole('tab', { name: /Clinical Information/i }));
    expect(screen.getByText(/Penicillin, Peanuts/i)).toBeDefined();
    expect(screen.getByText('Dr. Anand Kumar')).toBeDefined();

    // 2. Medical History Tab
    fireEvent.click(screen.getByRole('tab', { name: /Medical History/i }));
    expect(screen.getByText('Hypertension')).toBeDefined();
    expect(screen.getByText('Stage 1 managed with lifestyle adjustments.')).toBeDefined();

    // 3. Reports & Docs Tab
    fireEvent.click(screen.getByRole('tab', { name: /Reports & Docs/i }));
    expect(screen.getByText('Complete Blood Count')).toBeDefined();
    expect(screen.getByRole('link', { name: /Open document/i })).toBeDefined();

    // 4. Emergency & Guardian Tab
    fireEvent.click(screen.getByRole('tab', { name: /Emergency & Guardian/i }));
    expect(screen.getByText('Vikram Joshi')).toBeDefined();
    expect(screen.getByText('Sunita Joshi')).toBeDefined();

    // 5. Insurance & ID Tab
    fireEvent.click(screen.getByRole('tab', { name: /Insurance & ID/i }));
    expect(screen.getByText('Star Health')).toBeDefined();
    expect(screen.getByText('SH-9928172')).toBeDefined();
    expect(screen.getByText('Aadhaar')).toBeDefined();
    // Verify masked government ID by default
    expect(screen.getByText(/••••••••5544/)).toBeDefined();

    // Toggle government ID reveal
    const toggleBtn = screen.getByRole('button', { name: /Show identification number/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByText('998877665544')).toBeDefined();

    // 6. Linked Accounts Tab
    fireEvent.click(screen.getByRole('tab', { name: /Linked Accounts/i }));
    expect(screen.getByText('vikram@example.com')).toBeDefined();
    expect(screen.getAllByText('Primary Contact').length).toBeGreaterThan(0);
  });

  it('renders "—" or "Not available" fallback for missing patient values without broken UI', async () => {
    const minimalPatient: Patient = {
      id: 102,
      patientCode: 'PAT-000102',
      fullName: 'Jane Doe',
      firstName: 'Jane',
      lastName: undefined,
      gender: undefined,
      dateOfBirth: undefined,
      age: undefined,
      bloodGroup: undefined,
      phone: undefined,
      email: undefined,
      address: undefined,
      city: undefined,
      state: undefined,
      postalCode: undefined,
      preferredLanguage: undefined,
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
      emergencyContactRelationship: undefined,
      insuranceProvider: undefined,
      memberId: undefined,
      governmentIdType: undefined,
      governmentIdNumber: undefined,
      allergies: undefined,
      consentStatus: undefined,
      referringPhysician: undefined,
      guardianName: undefined,
      guardianRelationship: undefined,
      guardianMobile: undefined,
      status: 'ACTIVE',
      createdAt: '2026-03-01T08:00:00Z',
    };

    vi.mocked(patientsApi.get).mockResolvedValue(minimalPatient);
    vi.mocked(patientsApi.medicalHistory).mockResolvedValue([]);
    vi.mocked(patientsApi.accounts).mockResolvedValue([]);
    vi.mocked(patientsApi.reports).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/patients/102']}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Jane Doe' })).toBeDefined();
    });

    // Verify fallbacks appear instead of null, undefined, or empty blanks
    const fallbacks = screen.getAllByText('Not available');
    expect(fallbacks.length).toBeGreaterThan(0);

    // Verify empty states for tabs
    fireEvent.click(screen.getByRole('tab', { name: /Medical History/i }));
    expect(screen.getByText('No Medical History Recorded')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: /Reports & Docs/i }));
    expect(screen.getByText('No Documents Attached')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: /Linked Accounts/i }));
    expect(screen.getByText('No Linked Portal Accounts')).toBeDefined();
  });

  it('renders 404 Not Found state with return button when patient is not found', async () => {
    vi.mocked(patientsApi.get).mockRejectedValue(new ApiError(404, 'Patient not found: 999'));

    render(
      <MemoryRouter initialEntries={['/patients/999']}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Patient Not Found' })).toBeDefined();
    });

    expect(screen.getByText(/The patient may have been deleted, or does not exist within your hospital workspace/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Return to Patients/i })).toBeDefined();
  });

  it('renders 401/403 Unauthorized state when user lacks access', async () => {
    vi.mocked(patientsApi.get).mockRejectedValue(new ApiError(403, 'Forbidden'));

    render(
      <MemoryRouter initialEntries={['/patients/101']}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Access Restricted' })).toBeDefined();
    });

    expect(screen.getByText(/You do not have sufficient permissions to view this patient profile/i)).toBeDefined();
  });

  it('renders general error state with a working Retry action', async () => {
    vi.mocked(patientsApi.get)
      .mockRejectedValueOnce(new ApiError(500, 'Internal Server Error'))
      .mockResolvedValueOnce(mockPatient);
    vi.mocked(patientsApi.medicalHistory).mockResolvedValue([]);
    vi.mocked(patientsApi.accounts).mockResolvedValue([]);
    vi.mocked(patientsApi.reports).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/patients/101']}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Unable to Load Profile' })).toBeDefined();
    });

    const retryBtn = screen.getByRole('button', { name: /Retry Loading/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Meera Joshi' })).toBeDefined();
    });
  });
});

describe('PatientsPage Avatar Integration', () => {
  it('renders accessible avatar and clicking it navigates to the patient profile', async () => {
    vi.mocked(patientsApi.list).mockResolvedValue({
      content: [mockPatient],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/patients']}>
          <Routes>
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:patientId" element={<PatientProfilePage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Meera Joshi')).toBeDefined();
    });

    // Check avatar has accessible label
    const avatarButton = screen.getByRole('button', { name: 'View profile for Meera Joshi' });
    expect(avatarButton).toBeDefined();
    expect(avatarButton.getAttribute('tabindex')).toBe('0');

    // Clicking the avatar opens the patient profile
    vi.mocked(patientsApi.get).mockResolvedValue(mockPatient);
    vi.mocked(patientsApi.medicalHistory).mockResolvedValue(mockHistory);
    vi.mocked(patientsApi.accounts).mockResolvedValue(mockAccounts);
    vi.mocked(patientsApi.reports).mockResolvedValue(mockReports);

    fireEvent.click(avatarButton);

    await waitFor(() => {
      expect(patientsApi.get).toHaveBeenCalledWith('101');
    });
  });
});
