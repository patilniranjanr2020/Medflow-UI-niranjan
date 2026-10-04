import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataPage } from '../../../shared/components/DataPage';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Avatar } from '../../../shared/components/Avatar/Avatar';
import { Button } from '../../../shared/components/Button/Button';
import { useAuth } from '../../../core/auth/AuthContext';
import { doctorsApi } from '../../../core/api/services';
import { formatMoney, humanize, statusTone } from '../../../core/utils/format';
import type { Doctor } from '../../../core/api/types';
import { DoctorFormModal } from '../components/DoctorFormModal';
import { DoctorDetailModal } from '../components/DoctorDetailModal';
import { DeactivateDoctorModal } from '../components/DeactivateDoctorModal';

export default function DoctorsPage() {
  const { can } = useAuth();
  const canManage = can('doctors:write');
  const [version, setVersion] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>();
  const [doctorToEdit, setDoctorToEdit] = useState<Doctor | null>(null);
  const [doctorToDeactivate, setDoctorToDeactivate] = useState<Doctor | null>(null);

  function refresh() {
    setVersion((current) => current + 1);
  }

  return (
    <>
    <DataPage<Doctor>
      title="Doctor Management"
      description="Every doctor on staff, their credentials and consulting fee."
      actions={canManage ? <Button leftIcon={<Plus size={16} />} onClick={() => setIsAddOpen(true)}>Add doctor</Button> : undefined}
      searchPlaceholder="Search by name, code or specialty…"
      rowKey={(row) => row.id}
      deps={[version]}
      load={({ page, size, query }) => doctorsApi.list({ page, size, query })}
      emptyMessage="No doctors match this search."
      onRowClick={(doctor) => setSelectedDoctorId(doctor.id)}
      columns={[
        {
          key: 'name',
          header: 'Doctor',
          render: (row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-3)' }}>
              <Avatar name={row.fullName} size="sm" />
              <div>
                <div>{row.fullName}</div>
                <small style={{ color: 'var(--mf-text-muted)' }}>{row.doctorCode}</small>
              </div>
            </div>
          ),
        },
        { key: 'specialty', header: 'Specialty', render: (row) => row.specialty },
        { key: 'qualification', header: 'Qualification', render: (row) => row.qualification ?? '—' },
        {
          key: 'experience',
          header: 'Experience',
          render: (row) => `${row.yearsOfExperience} yrs`,
        },
        { key: 'fee', header: 'Fee', align: 'right', render: (row) => formatMoney(row.consultationFee) },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <Badge tone={statusTone(row.status)} dot>
              {humanize(row.status)}
            </Badge>
          ),
        },
      ]}
    />
      <DoctorFormModal
        isOpen={isAddOpen || Boolean(doctorToEdit)}
        doctor={doctorToEdit}
        onClose={() => { setIsAddOpen(false); setDoctorToEdit(null); }}
        onSaved={() => { setIsAddOpen(false); setDoctorToEdit(null); refresh(); }}
      />
      <DoctorDetailModal
        doctorId={selectedDoctorId}
        canManage={canManage}
        onClose={() => setSelectedDoctorId(undefined)}
        onEdit={(doctor) => { setSelectedDoctorId(undefined); setDoctorToEdit(doctor); }}
        onDelete={(doctor) => { setSelectedDoctorId(undefined); setDoctorToDeactivate(doctor); }}
      />
      <DeactivateDoctorModal
        doctor={doctorToDeactivate}
        isOpen={Boolean(doctorToDeactivate)}
        onClose={() => setDoctorToDeactivate(null)}
        onDeactivated={() => { setDoctorToDeactivate(null); refresh(); }}
      />
    </>
  );
}
