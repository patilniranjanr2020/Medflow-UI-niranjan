import { Trash2 } from 'lucide-react';
import { Drawer } from '../../../shared/components/Drawer/Drawer';
import { Button } from '../../../shared/components/Button/Button';
import { Badge } from '../../../shared/components/Badge/Badge';
import { humanize, formatDateTime, statusTone } from '../../../core/utils/format';
import type { Appointment } from '../../../core/api/types';

interface Props { appointment: Appointment | null; isOpen: boolean; onClose: () => void; onDelete: (appointment: Appointment) => void; }
export function AppointmentDetailDrawer({ appointment, isOpen, onClose, onDelete }: Props) {
  if (!appointment) return null; const cancellable = ['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION'].includes(appointment.status);
  return <Drawer isOpen={isOpen} onClose={onClose} title={`Appointment #${appointment.id}`} actions={cancellable ? <Button variant="ghost" size="sm" aria-label="Cancel appointment" title="Cancel appointment" onClick={() => onDelete(appointment)} style={{ color: 'var(--mf-coral-600)' }}><Trash2 size={18} /></Button> : undefined}>
    <div style={{ display: 'grid', gap: 'var(--mf-space-5)' }}><Badge tone={statusTone(appointment.status)} dot>{humanize(appointment.status)}</Badge>
      {[['Patient', appointment.patientName], ['Doctor', appointment.doctorName], ['Specialty', appointment.doctorSpecialty ?? '—'], ['Scheduled', formatDateTime(appointment.scheduledAt)], ['Mode', humanize(appointment.appointmentMode)], ['Queue number', appointment.queueNumber ?? '—']].map(([label, value]) => <div key={label as string}><small style={{ color: 'var(--mf-text-muted)' }}>{label}</small><div style={{ fontWeight: 600 }}>{value}</div></div>)}
      {!cancellable && <p style={{ color: 'var(--mf-text-muted)', margin: 0 }}>This appointment cannot be cancelled because it is {humanize(appointment.status).toLowerCase()}. Its history is retained.</p>}
    </div>
  </Drawer>;
}
