import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataPage } from '../../../shared/components/DataPage';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Select/Select';
import { useToast } from '../../../shared/components/Toast/Toast';
import { appointmentsApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import { formatDateTime, humanize, statusTone } from '../../../core/utils/format';
import type { Appointment, AppointmentStatus } from '../../../core/api/types';
import { AddAppointmentModal } from '../components/AddAppointmentModal';
import { AppointmentDetailDrawer } from '../components/AppointmentDetailDrawer';
import { Modal } from '../../../shared/components/Modal/Modal';

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'IN_CONSULTATION', label: 'In consultation' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No show' },
];

/** The next step in the front-desk workflow for a given state. */
const NEXT_ACTION: Partial<Record<AppointmentStatus, { action: string; label: string }>> = {
  BOOKED: { action: 'confirm', label: 'Confirm' },
  CONFIRMED: { action: 'check-in', label: 'Check in' },
  CHECKED_IN: { action: 'start-consultation', label: 'Start' },
  IN_CONSULTATION: { action: 'complete', label: 'Complete' },
};

export default function AppointmentsPage() {
  const { show } = useToast();
  const [status, setStatus] = useState('');
  const [version, setVersion] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function advance(row: Appointment) {
    const next = NEXT_ACTION[row.status];
    if (!next) return;
    try {
      await appointmentsApi.transition(row.id, next.action);
      show({ title: `${row.patientName}: ${next.label.toLowerCase()}d`, tone: 'success' });
      setVersion((v) => v + 1);
    } catch (cause) {
      show({
        title: 'Could not update the appointment',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    }
  }

  async function cancelAppointment() {
    if (!selected) return;
    setCancelling(true);
    try {
      await appointmentsApi.transition(selected.id, 'cancel');
      show({ title: 'Appointment cancelled', tone: 'success' });
      setDeleteOpen(false); setSelected(null); setVersion((v) => v + 1);
    } catch (cause) {
      show({ title: 'Could not cancel the appointment', description: cause instanceof ApiError ? cause.message : undefined, tone: 'danger' });
    } finally { setCancelling(false); }
  }

  return (
    <>
    <DataPage<Appointment>
      title="Appointment Management"
      description="Booking, the day's queue and the consultation workflow."
      actions={<Button leftIcon={<Plus size={16} />} onClick={() => setAddOpen(true)}>Add appointment</Button>}
      searchable={false}
      rowKey={(row) => row.id}
      deps={[status, version]}
      load={({ page, size }) => appointmentsApi.list({ page, size, status: status || undefined })}
      emptyMessage="No appointments for this filter."
      onRowClick={setSelected}
      toolbar={
        <div style={{ minWidth: 220 }}>
          <Select
            options={STATUSES}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          />
        </div>
      }
      columns={[
        { key: 'queue', header: '#', width: '60px', render: (row) => row.queueNumber ?? '—' },
        { key: 'patient', header: 'Patient', render: (row) => row.patientName },
        {
          key: 'doctor',
          header: 'Doctor',
          render: (row) => (
            <div>
              <div>{row.doctorName}</div>
              <small style={{ color: 'var(--mf-text-muted)' }}>{row.doctorSpecialty}</small>
            </div>
          ),
        },
        { key: 'when', header: 'Scheduled', render: (row) => formatDateTime(row.scheduledAt) },
        { key: 'mode', header: 'Mode', render: (row) => humanize(row.appointmentMode) },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <Badge tone={statusTone(row.status)} dot>
              {humanize(row.status)}
            </Badge>
          ),
        },
        {
          key: 'action',
          header: '',
          align: 'right',
          render: (row) =>
            NEXT_ACTION[row.status] ? (
              <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); advance(row); }}>
                {NEXT_ACTION[row.status]!.label}
              </Button>
            ) : null,
        },
      ]}
    />
    <AddAppointmentModal isOpen={addOpen} onClose={() => setAddOpen(false)} onCreated={(appointment) => { show({ title: 'Appointment booked successfully', tone: 'success' }); setVersion((v) => v + 1); setSelected(appointment); }} />
    <AppointmentDetailDrawer appointment={selected} isOpen={!!selected} onClose={() => setSelected(null)} onDelete={() => setDeleteOpen(true)} />
    <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Cancel appointment" description="This keeps the appointment in its history and cannot be undone." size="sm" footer={<><Button variant="ghost" disabled={cancelling} onClick={() => setDeleteOpen(false)}>Keep appointment</Button><Button variant="danger" isLoading={cancelling} onClick={cancelAppointment}>Cancel appointment</Button></>}><p>Are you sure you want to cancel this appointment?</p></Modal>
    </>
  );
}
