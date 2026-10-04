import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LaboratoryPage from './LaboratoryPage';
import { ToastProvider } from '../../../shared/components/Toast/Toast';
import { laboratoryApi, patientsApi, doctorsApi } from '../../../core/api/services';
import type { Page } from '../../../core/api/client';
import type { LabOrder } from '../../../core/api/types';

vi.mock('../../../core/api/services', () => ({
  laboratoryApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    start: vi.fn(),
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

const mockOrders: LabOrder[] = [
  {
    id: 101,
    patientId: 1,
    patientName: 'Aarav Sharma',
    doctorId: 10,
    doctorName: 'Dr. Anand Kumar',
    testName: 'Complete Blood Count',
    priority: 'ROUTINE',
    status: 'ORDERED',
    resultSummary: undefined,
    orderedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 102,
    patientId: 2,
    patientName: 'Pooja Reddy',
    doctorId: 11,
    doctorName: 'Dr. Sunita Rao',
    testName: 'Lipid Profile',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    resultSummary: 'Cholesterol elevated',
    orderedAt: '2026-03-02T11:30:00Z',
  },
  {
    id: 103,
    patientId: 3,
    patientName: 'Vikram Mehta',
    doctorId: 10,
    doctorName: 'Dr. Anand Kumar',
    testName: 'Thyroid Stimulating Hormone (TSH)',
    priority: 'STAT',
    status: 'COMPLETED',
    resultSummary: 'TSH 2.4 mIU/L (Normal range 0.4 - 4.0)',
    orderedAt: '2026-03-03T09:15:00Z',
    completedAt: '2026-03-03T14:20:00Z',
  },
];

function pagedResponse<T>(content: T[], totalPages = 1): Page<T> {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages,
  };
}

describe('LaboratoryPage end-to-end workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laboratoryApi.list).mockResolvedValue(pagedResponse(mockOrders));
    vi.mocked(patientsApi.list).mockResolvedValue(
      pagedResponse([
        {
          id: 1,
          fullName: 'Aarav Sharma',
          patientCode: 'PAT-001',
          firstName: 'Aarav',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    vi.mocked(doctorsApi.list).mockResolvedValue(
      pagedResponse([
        {
          id: 10,
          fullName: 'Dr. Anand Kumar',
          doctorCode: 'DOC-010',
          firstName: 'Anand',
          specialty: 'Pathology',
          registrationNumber: 'MED-1234',
          yearsOfExperience: 10,
          consultationFee: 500,
          status: 'ACTIVE',
        },
      ]),
    );
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <LaboratoryPage />
        </ToastProvider>
      </MemoryRouter>,
    );
  }

  it('renders Laboratory page header and "Add order" button', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Laboratory' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Add order/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Complete Blood Count')).toBeDefined();
      expect(screen.getByText('Lipid Profile')).toBeDefined();
      expect(screen.getByText('Thyroid Stimulating Hormone (TSH)')).toBeDefined();
    });
  });

  it('opens Add Lab Order modal and submits new order', async () => {
    const newOrder: LabOrder = {
      id: 104,
      patientId: 1,
      patientName: 'Aarav Sharma',
      doctorId: 10,
      doctorName: 'Dr. Anand Kumar',
      testName: 'Serum Ferritin',
      priority: 'URGENT',
      status: 'ORDERED',
      orderedAt: '2026-03-04T12:00:00Z',
    };
    vi.mocked(laboratoryApi.create).mockResolvedValue(newOrder);

    renderPage();

    const addBtn = screen.getByRole('button', { name: /Add order/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Create laboratory order')).toBeDefined();
    });

    const testInput = screen.getByPlaceholderText(/Complete Blood Count/i);
    fireEvent.change(testInput, { target: { value: 'Serum Ferritin' } });

    const submitBtn = screen.getByRole('button', { name: 'Place order' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(laboratoryApi.create).toHaveBeenCalledWith({
        patientId: 1,
        doctorId: 10,
        testName: 'Serum Ferritin',
        priority: 'ROUTINE',
      });
    });
  });

  it('opens detail drawer when clicking an order row with Edit and Delete actions in top-right', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Complete Blood Count')).toBeDefined();
    });

    // Click the row
    fireEvent.click(screen.getByText('Complete Blood Count'));

    await waitFor(() => {
      expect(screen.getByText('Order #101')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Edit order details' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Delete order' })).toBeDefined();
    });
  });

  it('clicking pencil in Result column opens EditResultModal and allows editing active results', async () => {
    vi.mocked(laboratoryApi.complete).mockResolvedValue({
      ...mockOrders[1],
      status: 'COMPLETED',
      resultSummary: 'Cholesterol 240 mg/dL (Elevated), Triglycerides normal',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lipid Profile')).toBeDefined();
    });

    // Find pencil for Lipid Profile
    const pencilBtn = screen.getByRole('button', { name: 'Edit result for Lipid Profile' });
    fireEvent.click(pencilBtn);

    await waitFor(() => {
      expect(screen.getByText('Record laboratory result')).toBeDefined();
      expect(screen.getByText(/Lipid Profile for Pooja Reddy/i)).toBeDefined();
    });

    const textarea = screen.getByPlaceholderText(/Enter clinical findings/i);
    fireEvent.change(textarea, { target: { value: 'Cholesterol 240 mg/dL (Elevated), Triglycerides normal' } });

    const signOffBtn = screen.getByRole('button', { name: 'Sign off result' });
    fireEvent.click(signOffBtn);

    await waitFor(() => {
      expect(laboratoryApi.complete).toHaveBeenCalledWith(
        102,
        'Cholesterol 240 mg/dL (Elevated), Triglycerides normal',
      );
    });
  });

  it('respects signed-off results and presents them as read-only', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Thyroid Stimulating Hormone (TSH)')).toBeDefined();
    });

    // Click pencil for completed order
    const pencilBtn = screen.getByRole('button', { name: 'Edit result for Thyroid Stimulating Hormone (TSH)' });
    fireEvent.click(pencilBtn);

    await waitFor(() => {
      expect(screen.getByText('Signed-off result')).toBeDefined();
      expect(screen.getByText(/In accordance with clinical audit policies, signed-off results are read-only/i)).toBeDefined();
      expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Sign off result' })).toBeNull();
    });
  });

  it('renders contextual action menu on row and handles delete with confirmation', async () => {
    vi.mocked(laboratoryApi.delete).mockResolvedValue(undefined);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Complete Blood Count')).toBeDefined();
    });

    // Trigger action menu
    const menuBtn = screen.getByRole('button', { name: 'Actions for Complete Blood Count' });
    fireEvent.click(menuBtn);

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /View details/i })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: /Start processing/i })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: /Delete order/i })).toBeDefined();
    });

    // Click delete order in menu
    fireEvent.click(screen.getByRole('menuitem', { name: /Delete order/i }));

    await waitFor(() => {
      expect(screen.getByText('Delete laboratory order')).toBeDefined();
      expect(screen.getByText(/In compliance with clinical record regulations, this order will be archived/i)).toBeDefined();
    });

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: 'Delete order' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(laboratoryApi.delete).toHaveBeenCalledWith(101);
    });
  });

  it('filters laboratory orders through server-side search input', async () => {
    renderPage();

    await waitFor(() => {
      expect(laboratoryApi.list).toHaveBeenCalledWith({ page: 0, size: 10, query: undefined });
    });

    const searchInput = screen.getByPlaceholderText(/Search by test, patient, clinician/i);
    fireEvent.change(searchInput, { target: { value: 'Lipid' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(laboratoryApi.list).toHaveBeenCalledWith({ page: 0, size: 10, query: 'Lipid' });
    });
  });

  it('renders numbered pagination when results exceed page size', async () => {
    vi.mocked(laboratoryApi.list).mockResolvedValue({
      content: mockOrders,
      page: 0,
      size: 2,
      totalElements: 25,
      totalPages: 13,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '1' })).toBeDefined();
      expect(screen.getByRole('button', { name: '2' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDefined();
    });
  });
});
