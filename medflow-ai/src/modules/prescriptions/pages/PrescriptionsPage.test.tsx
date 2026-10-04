import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrescriptionsPage from './PrescriptionsPage';
import { ToastProvider } from '../../../shared/components/Toast/Toast';
import { prescriptionsApi, patientsApi, doctorsApi } from '../../../core/api/services';
import type { Page } from '../../../core/api/client';
import type { Doctor, Patient, Prescription } from '../../../core/api/types';

vi.mock('../../../core/api/services', () => ({
  prescriptionsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
  },
  patientsApi: {
    list: vi.fn(),
  },
  doctorsApi: {
    list: vi.fn(),
  },
}));

const mockPrescriptions: Prescription[] = [
  {
    id: 201,
    patientId: 1,
    patientName: 'Aarav Sharma',
    doctorId: 10,
    doctorName: 'Dr. Anand Kumar',
    diagnosis: 'Type 2 Diabetes Mellitus',
    medicines: [
      {
        medicationName: 'Metformin 500mg',
        dosage: '1 tablet',
        frequency: 'Twice daily after meals',
        durationDays: 30,
        instructions: 'Take with food',
      },
    ],
    digitallySigned: true,
    signedAt: '2026-03-01T10:00:00Z',
    status: 'ACTIVE',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 202,
    patientId: 2,
    patientName: 'Pooja Reddy',
    doctorId: 11,
    doctorName: 'Dr. Sunita Rao',
    diagnosis: 'Seasonal Allergic Rhinitis',
    medicines: [
      {
        medicationName: 'Cetirizine 10mg',
        dosage: '1 tablet',
        frequency: 'Once daily at bedtime',
        durationDays: 10,
      },
    ],
    digitallySigned: false,
    status: 'ACTIVE',
    createdAt: '2026-03-02T11:00:00Z',
  },
];

const mockPatients: Patient[] = [
  {
    id: 1,
    patientCode: 'PAT-001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    fullName: 'Aarav Sharma',
    dateOfBirth: '1985-05-12',
    gender: 'MALE',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    patientCode: 'PAT-002',
    firstName: 'Pooja',
    lastName: 'Reddy',
    fullName: 'Pooja Reddy',
    dateOfBirth: '1992-09-20',
    gender: 'FEMALE',
    status: 'ACTIVE',
    createdAt: '2026-01-02T00:00:00Z',
  },
];

const mockDoctors: Doctor[] = [
  {
    id: 10,
    userId: 100,
    doctorCode: 'DOC-001',
    firstName: 'Anand',
    lastName: 'Kumar',
    fullName: 'Anand Kumar',
    specialty: 'Internal Medicine',
    status: 'ACTIVE',
    consultationFee: 500,
  },
  {
    id: 11,
    userId: 101,
    doctorCode: 'DOC-002',
    firstName: 'Sunita',
    lastName: 'Rao',
    fullName: 'Sunita Rao',
    specialty: 'ENT',
    status: 'ACTIVE',
    consultationFee: 600,
  },
];

function paged<T>(content: T[]): Page<T> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PrescriptionsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('PrescriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.list).mockResolvedValue(paged(mockPrescriptions));
    vi.mocked(patientsApi.list).mockResolvedValue(paged(mockPatients));
    vi.mocked(doctorsApi.list).mockResolvedValue(paged(mockDoctors));
  });

  it('renders Prescription Management page with heading, Add prescription button, and table', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Prescription Management' })).toBeDefined();
    expect(screen.getByText('Digitally signed prescriptions and their medication lines.')).toBeDefined();

    const addBtn = screen.getByRole('button', { name: /add prescription/i });
    expect(addBtn).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined();
      expect(screen.getByText('Dr. Anand Kumar')).toBeDefined();
      expect(screen.getByText('Pooja Reddy')).toBeDefined();
      expect(screen.getAllByText('Signed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Draft')).toBeDefined();
    });
  });

  it('opens Add Prescription modal with a searchable patient picker and registered doctors dropdown', async () => {
    renderPage();

    const addBtn = screen.getByRole('button', { name: /add prescription/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: 'Add prescription' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByLabelText(/Patient \*/i)).toBeDefined();
      expect(screen.getByLabelText(/Doctor \(Registered Clinicians\) \*/i)).toBeDefined();
      expect(screen.getByRole('option', { name: /Dr\. Anand Kumar/i })).toBeDefined();
    });
    const patientPicker = screen.getByRole('combobox', { name: /Patient \*/i });
    fireEvent.focus(patientPicker);
    expect(patientPicker).toBeDefined();
    expect(screen.getByRole('option', { name: /Aarav Sharma \(PAT-001\)/i })).toBeDefined();
  });

  it('does not treat typed patient text as a registered patient selection', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /add prescription/i }));

    const patientPicker = await screen.findByRole('combobox', { name: /Patient \*/i });
    fireEvent.change(patientPicker, { target: { value: 'Not a registered patient' } });
    fireEvent.click(screen.getByRole('button', { name: /sign & issue prescription/i }));

    await waitFor(() => {
      expect(screen.getByText('Please select a registered patient')).toBeDefined();
    });
    expect(prescriptionsApi.create).not.toHaveBeenCalled();
  });

  it('validates required fields when creating a prescription', async () => {
    renderPage();

    const addBtn = screen.getByRole('button', { name: /add prescription/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add prescription' })).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /sign & issue prescription/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Medication name is required/i)).toBeDefined();
    });
    expect(prescriptionsApi.create).not.toHaveBeenCalled();
  });

  it('creates prescription with medication lines and refreshes table', async () => {
    vi.mocked(prescriptionsApi.create).mockResolvedValue({
      id: 203,
      patientId: 2,
      patientName: 'Pooja Reddy',
      doctorId: 10,
      doctorName: 'Dr. Anand Kumar',
      diagnosis: 'Acute Pharyngitis',
      medicines: [
        {
          medicationName: 'Amoxicillin 500mg',
          dosage: '1 cap',
          frequency: 'TDS',
          durationDays: 5,
        },
      ],
      digitallySigned: true,
      status: 'ACTIVE',
      createdAt: '2026-03-03T09:00:00Z',
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /add prescription/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add prescription' })).toBeDefined();
    });

    const patientPicker = screen.getByRole('combobox', { name: /Patient \*/i });
    fireEvent.focus(patientPicker);
    fireEvent.change(patientPicker, { target: { value: 'Pooja' } });
    fireEvent.click(screen.getByRole('option', { name: /Pooja Reddy \(PAT-002\)/i }));

    fireEvent.change(screen.getByLabelText(/Diagnosis \/ Clinical Notes/i), {
      target: { value: 'Acute Pharyngitis' },
    });
    fireEvent.change(screen.getByLabelText(/Medication Name \*/i), {
      target: { value: 'Amoxicillin 500mg' },
    });
    fireEvent.change(screen.getByLabelText(/Dosage \*/i), {
      target: { value: '1 cap' },
    });
    fireEvent.change(screen.getByLabelText(/Frequency \*/i), {
      target: { value: 'TDS' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign & issue prescription/i }));

    await waitFor(() => {
      expect(prescriptionsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 2,
          doctorId: 10,
          diagnosis: 'Acute Pharyngitis',
          digitallySigned: true,
          medicines: [
            expect.objectContaining({
              medicationName: 'Amoxicillin 500mg',
              dosage: '1 cap',
              frequency: 'TDS',
            }),
          ],
        })
      );
    });
  });

  it('clicking a prescription opens details drawer with top-right actions and locks signed records', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined();
    });

    // Click row for signed prescription (Aarav Sharma, id 201)
    fireEvent.click(screen.getByText('Aarav Sharma'));

    await waitFor(() => {
      expect(screen.getByText('Prescription #201')).toBeDefined();
      expect(screen.getByText(/Digitally signed clinical record/i)).toBeDefined();
    });

    // Check top-right Edit and Delete actions
    const editBtn = screen.getByRole('button', { name: 'Edit prescription' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete prescription' });

    expect(editBtn).toBeDefined();
    expect(deleteBtn).toBeDefined();

    // Since it's digitally signed, Edit and Delete are disabled
    expect(editBtn.hasAttribute('disabled')).toBe(true);
    expect(deleteBtn.hasAttribute('disabled')).toBe(true);
  });

  it('draft prescription enables Edit and Delete in drawer, allowing updates and deletion', async () => {
    vi.mocked(prescriptionsApi.delete).mockResolvedValue(undefined);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pooja Reddy')).toBeDefined();
    });

    // Click row for draft prescription (Pooja Reddy, id 202)
    fireEvent.click(screen.getByText('Pooja Reddy'));

    await waitFor(() => {
      expect(screen.getByText('Prescription #202')).toBeDefined();
    });

    const editBtn = screen.getByRole('button', { name: 'Edit prescription' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete prescription' });

    // Since it's draft, Edit and Delete are enabled
    expect(editBtn.hasAttribute('disabled')).toBe(false);
    expect(deleteBtn.hasAttribute('disabled')).toBe(false);

    // Click Delete -> opens confirmation dialog
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete draft/i)).toBeDefined();
    });

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Confirm delete prescription' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(prescriptionsApi.delete).toHaveBeenCalledWith(202);
    });
  });
});
