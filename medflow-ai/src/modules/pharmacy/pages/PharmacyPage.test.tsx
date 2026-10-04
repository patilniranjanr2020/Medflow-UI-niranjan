import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PharmacyPage from './PharmacyPage';
import { ToastProvider } from '../../../shared/components/Toast/Toast';
import { pharmacyApi } from '../../../core/api/services';
import type { Page } from '../../../core/api/client';
import type { Medication } from '../../../core/api/types';

vi.mock('../../../core/api/services', () => ({
  pharmacyApi: {
    list: vi.fn(),
    get: vi.fn(),
    categories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    adjustStock: vi.fn(),
  },
}));

const mockMedications: Medication[] = [
  {
    id: 1,
    name: 'Paracetamol 500mg',
    category: 'Analgesics',
    unitPrice: 12.5,
    stockQuantity: 150,
    reorderLevel: 25,
    lowStock: false,
    expiryDate: '2027-12-31',
  },
  {
    id: 2,
    name: 'Amoxicillin 250mg',
    category: 'Antibiotics',
    unitPrice: 45.0,
    stockQuantity: 15,
    reorderLevel: 20,
    lowStock: true,
    expiryDate: '2026-06-30',
  },
  {
    id: 3,
    name: 'Cetirizine 10mg',
    category: 'Antihistamines',
    unitPrice: 8.0,
    stockQuantity: 0,
    reorderLevel: 10,
    lowStock: true,
    expiryDate: '2026-11-15',
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

describe('PharmacyPage end-to-end workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pharmacyApi.list).mockResolvedValue(pagedResponse(mockMedications));
    vi.mocked(pharmacyApi.categories).mockResolvedValue(['Analgesics', 'Antibiotics', 'Antihistamines']);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <PharmacyPage />
        </ToastProvider>
      </MemoryRouter>,
    );
  }

  it('renders Pharmacy page with heading, Add medicine button, and table data', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Pharmacy' })).toBeDefined();
    expect(screen.getByRole('button', { name: /add medicine/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeDefined();
      expect(screen.getByText('Amoxicillin 250mg')).toBeDefined();
      expect(screen.getByText('Cetirizine 10mg')).toBeDefined();
    });
  });

  it('opens Add Medicine modal, validates input, and creates medication', async () => {
    vi.mocked(pharmacyApi.create).mockResolvedValue({
      id: 4,
      name: 'Ibuprofen 400mg',
      category: 'Analgesics',
      unitPrice: 20.0,
      stockQuantity: 200,
      reorderLevel: 30,
      lowStock: false,
      expiryDate: '2027-01-01',
    });

    renderPage();

    const addBtn = screen.getByRole('button', { name: /add medicine/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: 'Add medication' })).toBeDefined();

    const nameInput = screen.getByPlaceholderText(/e\.g\. Paracetamol 500mg/i);
    fireEvent.change(nameInput, { target: { value: 'Ibuprofen 400mg' } });

    const submitBtn = screen.getByRole('button', { name: 'Create medication' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(pharmacyApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ibuprofen 400mg',
          category: 'Analgesics',
        }),
      );
    });
  });

  it('opens detail drawer when row is clicked, with Edit and Delete at top-right', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeDefined();
    });

    const row = screen.getByText('Paracetamol 500mg').closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit medicine' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Delete medicine' })).toBeDefined();
      expect(screen.getByText('Catalogue item ID #1 • Analgesics')).toBeDefined();
      expect(screen.getByText('150 units')).toBeDefined();
    });
  });

  it('clicking +10 or Dispense in table adjusts stock without opening detail drawer', async () => {
    vi.mocked(pharmacyApi.adjustStock).mockResolvedValue({
      ...mockMedications[0],
      stockQuantity: 160,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeDefined();
    });

    const restockBtn = screen.getByRole('button', { name: 'Restock 10 units of Paracetamol 500mg' });
    fireEvent.click(restockBtn);

    await waitFor(() => {
      expect(pharmacyApi.adjustStock).toHaveBeenCalledWith(1, 10);
    });

    // Drawer should NOT have opened
    expect(screen.queryByText('Catalogue item ID #1 • Analgesics')).toBeNull();
  });

  it('edits medication from drawer and persists update', async () => {
    vi.mocked(pharmacyApi.update).mockResolvedValue({
      ...mockMedications[0],
      name: 'Paracetamol 650mg Forte',
      unitPrice: 15.0,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeDefined();
    });

    // Click row to open drawer
    fireEvent.click(screen.getByText('Paracetamol 500mg'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit medicine' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit medicine' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Paracetamol 500mg' })).toBeDefined();
    });

    const nameInput = screen.getByDisplayValue('Paracetamol 500mg');
    fireEvent.change(nameInput, { target: { value: 'Paracetamol 650mg Forte' } });

    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(pharmacyApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Paracetamol 650mg Forte',
        }),
      );
    });
  });

  it('opens delete confirmation modal with soft-delete safeguard and deletes medication', async () => {
    vi.mocked(pharmacyApi.delete).mockResolvedValue(undefined);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeDefined();
    });

    // Click row to open drawer
    fireEvent.click(screen.getByText('Paracetamol 500mg'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete medicine' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete medicine' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete medication' })).toBeDefined();
      expect(screen.getByText(/safely preserved in history/i)).toBeDefined();
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete medication' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(pharmacyApi.delete).toHaveBeenCalledWith(1);
    });
  });

  it('filters by category and stock status using dropdown select controls', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Filter by category')).toBeDefined();
      expect(screen.getByLabelText('Filter by stock status')).toBeDefined();
    });

    const categorySelect = screen.getByLabelText('Filter by category');
    fireEvent.change(categorySelect, { target: { value: 'Antibiotics' } });

    await waitFor(() => {
      expect(pharmacyApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Antibiotics',
        }),
      );
    });

    const stockSelect = screen.getByLabelText('Filter by stock status');
    fireEvent.change(stockSelect, { target: { value: 'LOW_STOCK' } });

    await waitFor(() => {
      expect(pharmacyApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          stockStatus: 'LOW_STOCK',
          lowStockOnly: true,
        }),
      );
    });
  });

  it('renders pagination when totalPages > 1 and resets page when filters change', async () => {
    vi.mocked(pharmacyApi.list).mockResolvedValue(pagedResponse(mockMedications, 3));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeDefined();
    });

    // Change category filter
    const categorySelect = screen.getByLabelText('Filter by category');
    fireEvent.change(categorySelect, { target: { value: 'Antibiotics' } });

    await waitFor(() => {
      expect(pharmacyApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 0,
          category: 'Antibiotics',
        }),
      );
    });
  });
});
