import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataPage } from '../../../shared/components/DataPage';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { useToast } from '../../../shared/components/Toast/Toast';
import { prescriptionsApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import { formatDate, humanize, statusTone } from '../../../core/utils/format';
import type { Prescription } from '../../../core/api/types';
import { AddPrescriptionModal } from '../components/AddPrescriptionModal';
import { EditPrescriptionModal } from '../components/EditPrescriptionModal';
import { DeletePrescriptionModal } from '../components/DeletePrescriptionModal';
import { PrescriptionDetailDrawer } from '../components/PrescriptionDetailDrawer';

export default function PrescriptionsPage() {
  const { show } = useToast();
  const [version, setVersion] = useState(0);

  // Modal and drawer state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [prescriptionToEdit, setPrescriptionToEdit] = useState<Prescription | null>(null);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<Prescription | null>(null);

  function refresh() {
    setVersion((v) => v + 1);
  }

  async function handleComplete(rx: Prescription) {
    try {
      const updated = await prescriptionsApi.complete(rx.id);
      show({
        title: 'Prescription completed',
        description: `Prescription #${rx.id} course marked as completed`,
        tone: 'success',
      });
      if (selectedPrescription?.id === rx.id) setSelectedPrescription(updated);
      refresh();
    } catch (err) {
      show({
        title: 'Could not complete prescription',
        description: err instanceof ApiError ? err.message : undefined,
        tone: 'danger',
      });
    }
  }

  async function handleCancel(rx: Prescription) {
    try {
      const updated = await prescriptionsApi.cancel(rx.id);
      show({
        title: 'Prescription cancelled',
        description: `Prescription #${rx.id} has been withdrawn`,
        tone: 'info',
      });
      if (selectedPrescription?.id === rx.id) setSelectedPrescription(updated);
      refresh();
    } catch (err) {
      show({
        title: 'Could not cancel prescription',
        description: err instanceof ApiError ? err.message : undefined,
        tone: 'danger',
      });
    }
  }

  return (
    <>
      <DataPage<Prescription>
        title="Prescription Management"
        description="Digitally signed prescriptions and their medication lines."
        searchable={false}
        rowKey={(row) => row.id}
        deps={[version]}
        onRowClick={(row) => setSelectedPrescription(row)}
        actions={
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsAddOpen(true)}>
            Add prescription
          </Button>
        }
        load={({ page, size }) => prescriptionsApi.list({ page, size })}
        emptyMessage="No prescriptions issued yet. Use 'Add prescription' to prescribe medications."
        columns={[
          { key: 'patient', header: 'Patient', render: (row) => row.patientName },
          { key: 'doctor', header: 'Doctor', render: (row) => row.doctorName },
          { key: 'diagnosis', header: 'Diagnosis', render: (row) => row.diagnosis ?? '—' },
          {
            key: 'medicines',
            header: 'Medicines',
            render: (row) => (
              <span title={row.medicines.map((m) => `${m.medicationName} — ${m.dosage}, ${m.frequency}`).join('\n')}>
                {row.medicines.length === 0
                  ? '—'
                  : `${row.medicines[0].medicationName}${row.medicines.length > 1 ? ` +${row.medicines.length - 1}` : ''}`}
              </span>
            ),
          },
          { key: 'issued', header: 'Issued', render: (row) => formatDate(row.createdAt) },
          {
            key: 'signed',
            header: 'Signed',
            render: (row) => (
              <Badge tone={row.digitallySigned ? 'green' : 'neutral'}>
                {row.digitallySigned ? 'Signed' : 'Draft'}
              </Badge>
            ),
          },
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

      {/* Add Prescription Modal */}
      <AddPrescriptionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={() => {
          refresh();
        }}
      />

      {/* Prescription Details Drawer */}
      <PrescriptionDetailDrawer
        prescription={selectedPrescription}
        isOpen={!!selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
        onEdit={(rx) => {
          setPrescriptionToEdit(rx);
        }}
        onDelete={(rx) => {
          setPrescriptionToDelete(rx);
        }}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />

      {/* Edit Prescription Modal */}
      <EditPrescriptionModal
        prescription={prescriptionToEdit}
        isOpen={!!prescriptionToEdit}
        onClose={() => setPrescriptionToEdit(null)}
        onUpdated={(updated) => {
          setSelectedPrescription(updated);
          refresh();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeletePrescriptionModal
        prescription={prescriptionToDelete}
        isOpen={!!prescriptionToDelete}
        onClose={() => setPrescriptionToDelete(null)}
        onDeleted={() => {
          setSelectedPrescription(null);
          refresh();
        }}
      />
    </>
  );
}
