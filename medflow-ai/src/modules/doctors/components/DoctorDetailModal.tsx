import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Alert } from '../../../shared/components/Alert/Alert';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Loading } from '../../../shared/components/Loading/Loading';
import { Modal } from '../../../shared/components/Modal/Modal';
import { doctorsApi } from '../../../core/api/services';
import type { Doctor } from '../../../core/api/types';
import { formatMoney, formatDateTime, humanize, statusTone } from '../../../core/utils/format';

interface Props {
  doctorId?: number;
  canManage: boolean;
  onClose: () => void;
  onEdit: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
}

export function DoctorDetailModal({ doctorId, canManage, onClose, onEdit, onDelete }: Props) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!doctorId) {
      setDoctor(null);
      return;
    }
    let current = true;
    setLoading(true);
    setError(undefined);
    doctorsApi.get(doctorId)
      .then((record) => { if (current) setDoctor(record); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : 'Could not load doctor details.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [doctorId]);

  return (
    <Modal isOpen={Boolean(doctorId)} onClose={onClose} title={doctor?.fullName ?? 'Doctor details'} description="Professional profile and account status." size="lg">
      {canManage && doctor && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mf-space-2)', marginBottom: 'var(--mf-space-4)' }}>
          <Button size="sm" variant="outline" leftIcon={<Pencil size={15} />} onClick={() => onEdit(doctor)}>Edit</Button>
          <Button size="sm" variant="outline" leftIcon={<Trash2 size={15} />} title="Deactivate doctor and preserve linked records" aria-label="Delete doctor" disabled={doctor.status !== 'ACTIVE'} onClick={() => onDelete(doctor)}>Delete</Button>
        </div>
      )}
      {loading ? <Loading label="Loading doctor details…" /> : error ? <Alert tone="danger" title="Could not load doctor">{error}</Alert> : doctor && (
        <div style={{ display: 'grid', gap: 'var(--mf-space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--mf-space-3)' }}>
            <div><h4 style={{ margin: 0 }}>{doctor.fullName}</h4><small style={{ color: 'var(--mf-text-muted)' }}>{doctor.doctorCode}</small></div>
            <Badge tone={statusTone(doctor.status)} dot>{humanize(doctor.status)}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--mf-space-4)' }}>
            {[
              ['Email', doctor.email], ['Phone', doctor.phone], ['Specialty', doctor.specialty],
              ['Qualification', doctor.qualification], ['Registration number', doctor.registrationNumber],
              ['Experience', `${doctor.yearsOfExperience ?? 0} years`], ['Consultation fee', formatMoney(doctor.consultationFee)],
              ['Joined', doctor.createdAt ? formatDateTime(doctor.createdAt) : undefined],
            ].map(([label, value]) => <div key={label}><small style={{ color: 'var(--mf-text-muted)' }}>{label}</small><div>{value || '—'}</div></div>)}
          </div>
          {doctor.bio && <section><h4 style={{ margin: '0 0 var(--mf-space-2)' }}>Professional bio</h4><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{doctor.bio}</p></section>}
        </div>
      )}
    </Modal>
  );
}