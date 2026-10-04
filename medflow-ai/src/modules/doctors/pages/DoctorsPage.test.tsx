import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DoctorsPage from './DoctorsPage';
import { doctorsApi } from '../../../core/api/services';
import { ToastProvider } from '../../../shared/components/Toast/Toast';
import type { Doctor } from '../../../core/api/types';

vi.mock('../../../core/auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));
vi.mock('../../../core/api/services', () => ({
  doctorsApi: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), changeStatus: vi.fn(),
  },
}));

const doctor: Doctor = {
  id: 3,
  doctorCode: 'DOC-0003',
  fullName: 'Arjun Mehta',
  firstName: 'Arjun',
  lastName: 'Mehta',
  email: 'arjun@example.com',
  phone: '9876543210',
  specialty: 'Orthopaedics',
  qualification: 'MBBS, MS (Ortho)',
  registrationNumber: 'REG-003',
  yearsOfExperience: 18,
  consultationFee: 1200,
  digitalSignatureUrl: 'https://example.com/signature',
  bio: 'Consultant orthopaedic surgeon.',
  status: 'ACTIVE',
};
const page = { content: [doctor], page: 0, size: 10, totalElements: 1, totalPages: 1 };

function renderPage() {
  return render(<ToastProvider><DoctorsPage /></ToastProvider>);
}

describe('DoctorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(doctorsApi.list).mockResolvedValue(page);
    vi.mocked(doctorsApi.get).mockResolvedValue(doctor);
  });

  it('adds a doctor through the existing onboarding API', async () => {
    vi.mocked(doctorsApi.create).mockResolvedValue(doctor);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /add doctor/i }));
    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'Arjun' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'arjun@example.com' } });
    fireEvent.change(screen.getByLabelText('Specialty *'), { target: { value: 'Orthopaedics' } });
    fireEvent.change(screen.getByLabelText('Registration number *'), { target: { value: 'REG-003' } });
    fireEvent.change(screen.getByLabelText('Consultation fee *'), { target: { value: '1200' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add doctor' }));

    await waitFor(() => expect(doctorsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Arjun', email: 'arjun@example.com', specialty: 'Orthopaedics',
      registrationNumber: 'REG-003', consultationFee: 1200,
    })));
  });

  it('opens doctor details and saves edits without changing the email or signature', async () => {
    vi.mocked(doctorsApi.update).mockResolvedValue({ ...doctor, consultationFee: 1500 });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Arjun Mehta/ }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Arjun Mehta' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Consultation fee *'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(doctorsApi.update).toHaveBeenCalledWith(3, expect.objectContaining({
      firstName: 'Arjun', consultationFee: 1500, digitalSignatureUrl: doctor.digitalSignatureUrl,
    })));
    expect(doctorsApi.update).toHaveBeenCalledWith(3, expect.not.objectContaining({ email: expect.anything() }));
  });

  it('confirms deactivation instead of hard deleting the doctor record', async () => {
    vi.mocked(doctorsApi.changeStatus).mockResolvedValue({ ...doctor, status: 'INACTIVE' });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Arjun Mehta/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete doctor' }));
    expect(screen.getByText(/profile, appointments, prescriptions, and audit history will be retained/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate doctor' }));

    await waitFor(() => expect(doctorsApi.changeStatus).toHaveBeenCalledWith(3, 'INACTIVE'));
    expect(doctorsApi).not.toHaveProperty('delete');
  });
});