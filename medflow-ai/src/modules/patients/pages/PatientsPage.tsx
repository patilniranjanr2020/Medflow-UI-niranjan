import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataPage } from '../../../shared/components/DataPage';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Avatar } from '../../../shared/components/Avatar/Avatar';
import { Button } from '../../../shared/components/Button/Button';
import { patientsApi } from '../../../core/api/services';
import { formatDate, humanize, statusTone } from '../../../core/utils/format';
import type { Patient } from '../../../core/api/types';
import { AddPatientModal } from '../components/AddPatientModal';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  return (
    <>
      <DataPage<Patient>
      title="Patient Management"
      description="Registered patients, their contact details and record status."
      actions={<Button leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>Add patient</Button>}
      searchPlaceholder="Search by name, code, phone or email…"
      rowKey={(row) => row.id}
      load={({ page, size, query }) => patientsApi.list({ page, size, query })}
      emptyMessage="No patients match this search."
      columns={[
        {
          key: 'name',
          header: 'Patient',
          render: (row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-3)' }}>
              <Avatar
                name={row.fullName}
                size="sm"
                onClick={() => navigate(`/patients/${row.id}`)}
                ariaLabel={`View profile for ${row.fullName}`}
              />
              <div>
                <Link
                  to={`/patients/${row.id}`}
                  style={{
                    color: 'var(--mf-ink-900)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mf-blue-600)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mf-ink-900)')}
                >
                  {row.fullName}
                </Link>
                <div>
                  <small style={{ color: 'var(--mf-text-muted)' }}>{row.patientCode}</small>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'age',
          header: 'Age / Gender',
          render: (row) => `${row.age ?? '—'} · ${humanize(row.gender)}`,
        },
        { key: 'blood', header: 'Blood group', render: (row) => row.bloodGroup ?? '—' },
        { key: 'phone', header: 'Phone', render: (row) => row.phone ?? '—' },
        { key: 'registered', header: 'Registered', render: (row) => formatDate(row.createdAt) },
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
      deps={[reloadToken]}
      />
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => setReloadToken((current) => current + 1)}
      />
    </>
  );
}
