import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddAppointmentModal } from './AddAppointmentModal';
import { appointmentsApi, doctorsApi, patientsApi } from '../../../core/api/services';

vi.mock('../../../core/api/services', () => ({ appointmentsApi: { book: vi.fn() }, doctorsApi: { list: vi.fn() }, patientsApi: { list: vi.fn() } }));
const page = <T,>(content: T[]) => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1 });

describe('AddAppointmentModal', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(patientsApi.list).mockResolvedValue(page([{ id: 7, fullName: 'Udit Rao', patientCode: 'PAT-7', status: 'ACTIVE' }] as never)); vi.mocked(doctorsApi.list).mockResolvedValue(page([{ id: 3, fullName: 'Dr. Shah', doctorCode: 'DOC-3', specialty: 'Cardiology', status: 'ACTIVE' }] as never)); });
  it('uses server search results and submits selected backend IDs only', async () => {
    vi.mocked(appointmentsApi.book).mockResolvedValue({ id: 9 } as never);
    render(<AddAppointmentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    const patientSearch = screen.getByPlaceholderText('Search registered patients');
    expect(screen.queryByRole('listbox', { name: 'Matching registered patients' })).toBeNull();
    await waitFor(() => expect(patientsApi.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' })));
    fireEvent.focus(patientSearch);
    expect(await screen.findByRole('option', { name: /Udit Rao \(PAT-7\)/i })).toBeDefined();
    expect(patientsApi.list).toHaveBeenCalledTimes(1);
    fireEvent.change(patientSearch, { target: { value: 'udit' } });
    await waitFor(() => expect(patientsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'udit', status: 'ACTIVE' })));
    const patientResults = await screen.findByRole('listbox', { name: 'Matching registered patients' });
    expect(patientResults.style.position).toBe('absolute');
    expect(patientResults.parentElement?.style.position).toBe('relative');
    fireEvent.click(screen.getByRole('option', { name: /Udit Rao \(PAT-7\)/i }));
    fireEvent.change(screen.getByLabelText('Doctor *'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Schedule date *'), { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText('Schedule time *'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }));
    await waitFor(() => expect(appointmentsApi.book).toHaveBeenCalledWith(expect.objectContaining({ patientId: 7, doctorId: 3, appointmentMode: 'ONLINE' })));
  });
  it('keeps results visible and shows inline progress while a search is pending', async () => {
    let resolveSearch: ((value: never) => void) | undefined;
    const pendingSearch = new Promise<never>((resolve) => { resolveSearch = resolve; });
    vi.mocked(patientsApi.list).mockResolvedValueOnce(page([{ id: 7, fullName: 'Udit Rao', patientCode: 'PAT-7', status: 'ACTIVE' }] as never)).mockReturnValueOnce(pendingSearch);
    render(<AddAppointmentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => expect(patientsApi.list).toHaveBeenCalledTimes(1));
    const patientSearch = screen.getByPlaceholderText('Search registered patients');
    fireEvent.focus(patientSearch);
    expect(await screen.findByRole('option', { name: /Udit Rao \(PAT-7\)/i })).toBeDefined();
    fireEvent.change(patientSearch, { target: { value: 'Udit' } });

    await waitFor(() => expect(patientsApi.list).toHaveBeenCalledTimes(2));
    expect(patientSearch.getAttribute('aria-busy')).toBe('true');
    expect(patientSearch.closest('.mf-field')?.querySelector('.mf-field__search-spinner')).not.toBeNull();
    expect(screen.getByRole('option', { name: /Udit Rao \(PAT-7\)/i })).toBeDefined();

    resolveSearch?.(page([{ id: 7, fullName: 'Udit Rao', patientCode: 'PAT-7', status: 'ACTIVE' }]) as never);
    await waitFor(() => expect(patientSearch.getAttribute('aria-busy')).toBe('false'));
  });
  it('rejects typed patient text until a result is selected', async () => {
    render(<AddAppointmentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Search registered patients'), { target: { value: 'not a selection' } });
    await screen.findByText('No registered patients match this search.');
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }));
    expect(await screen.findByText('Select a registered patient from the search results.')).toBeDefined();
    expect(appointmentsApi.book).not.toHaveBeenCalled();
  });
  it('shows empty doctor and patient states from the real paged response', async () => {
    vi.mocked(patientsApi.list).mockResolvedValue(page([]));
    vi.mocked(doctorsApi.list).mockResolvedValue(page([]));
    render(<AddAppointmentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByText('No registered patients match this search.')).toBeNull();
    await waitFor(() => expect(patientsApi.list).toHaveBeenCalled());
    fireEvent.focus(screen.getByPlaceholderText('Search registered patients'));
    expect(await screen.findByText('No registered patients match this search.')).toBeDefined();
    expect(screen.getByText('No eligible doctors available')).toBeDefined();
  });
  it('shows recoverable directory failures instead of disguising them as validation', async () => {
    vi.mocked(patientsApi.list).mockRejectedValue(new Error('offline'));
    vi.mocked(doctorsApi.list).mockRejectedValue(new Error('offline'));
    render(<AddAppointmentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.focus(screen.getByPlaceholderText('Search registered patients'));
    expect(await screen.findByText('Could not load patients')).toBeDefined();
    expect(screen.getByText('Could not load doctors')).toBeDefined();
  });
});
