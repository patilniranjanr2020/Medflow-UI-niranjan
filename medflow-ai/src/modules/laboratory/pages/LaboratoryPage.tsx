import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { DataPage } from '../../../shared/components/DataPage/DataPage';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Modal } from '../../../shared/components/Modal/Modal';
import { useToast } from '../../../shared/components/Toast/Toast';
import { laboratoryApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import { formatDateTime, humanize, statusTone } from '../../../core/utils/format';
import type { LabOrder } from '../../../core/api/types';
import { AddLabOrderModal } from '../components/AddLabOrderModal';
import { EditLabOrderModal } from '../components/EditLabOrderModal';
import { EditResultModal } from '../components/EditResultModal';
import { LabOrderDetailDrawer } from '../components/LabOrderDetailDrawer';
import { LabOrderActionMenu } from '../components/LabOrderActionMenu';
import './LaboratoryPage.css';

const PRIORITY_TONE = { ROUTINE: 'neutral', URGENT: 'amber', STAT: 'coral' } as const;

export default function LaboratoryPage() {
  const { show } = useToast();
  const [version, setVersion] = useState(0);

  // Modal / Drawer states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<LabOrder | null>(null);
  const [resultOrder, setResultOrder] = useState<LabOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<LabOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    setVersion((v) => v + 1);
  }

  async function handleStart(row: LabOrder) {
    try {
      const updated = await laboratoryApi.start(row.id);
      show({ title: `${row.testName} moved to processing`, tone: 'success' });
      if (selectedOrder?.id === row.id) setSelectedOrder(updated);
      refresh();
    } catch (cause) {
      show({
        title: 'Could not update the order',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    }
  }

  async function handleCancel(row: LabOrder) {
    try {
      const updated = await laboratoryApi.cancel(row.id);
      show({ title: `${row.testName} cancelled`, tone: 'info' });
      if (selectedOrder?.id === row.id) setSelectedOrder(updated);
      refresh();
    } catch (cause) {
      show({
        title: 'Could not cancel the order',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    }
  }

  async function confirmDelete() {
    if (!orderToDelete) return;
    setDeleting(true);
    try {
      await laboratoryApi.delete(orderToDelete.id);
      show({ title: `Order #${orderToDelete.id} removed from active queue`, tone: 'success' });
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
      refresh();
    } catch (cause) {
      show({
        title: 'Could not delete laboratory order',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <DataPage<LabOrder>
        title="Laboratory"
        description="Test orders, the processing queue and signed-off results."
        actions={
          <Button variant="primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} style={{ marginRight: 'var(--mf-space-1)' }} />
            Add order
          </Button>
        }
        searchable={true}
        searchPlaceholder="Search by test, patient, clinician, status, result…"
        rowKey={(row) => row.id}
        onRowClick={(row) => setSelectedOrder(row)}
        pageSize={10}
        deps={[version]}
        load={({ page, size, query }) =>
          laboratoryApi.list({ page, size, query: query || undefined })
        }
        emptyMessage="The specimen queue is empty. Use 'Add order' to request a test."
        columns={[
          { key: 'test', header: 'Test', render: (row) => row.testName },
          { key: 'patient', header: 'Patient', render: (row) => row.patientName },
          { key: 'doctor', header: 'Ordered by', render: (row) => row.doctorName },
          {
            key: 'priority',
            header: 'Priority',
            render: (row) => <Badge tone={PRIORITY_TONE[row.priority]}>{humanize(row.priority)}</Badge>,
          },
          { key: 'ordered', header: 'Ordered', render: (row) => formatDateTime(row.orderedAt) },
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
            key: 'result',
            header: 'Result',
            render: (row) => (
              <div className="mf-lab-result-cell">
                <span className="mf-lab-result-text" title={row.resultSummary ?? undefined}>
                  {row.resultSummary ?? '—'}
                </span>
                <button
                  type="button"
                  className="mf-pencil-btn"
                  title={row.status === 'COMPLETED' ? 'View signed-off result' : 'Edit result'}
                  aria-label={`Edit result for ${row.testName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setResultOrder(row);
                  }}
                >
                  <Pencil size={13} />
                </button>
              </div>
            ),
          },
          {
            key: 'action',
            header: '',
            align: 'right',
            render: (row) => (
              <LabOrderActionMenu
                order={row}
                onViewDetails={(order) => setSelectedOrder(order)}
                onStart={(order) => handleStart(order)}
                onRecordResult={(order) => setResultOrder(order)}
                onEdit={(order) => setOrderToEdit(order)}
                onCancel={(order) => handleCancel(order)}
                onDelete={(order) => setOrderToDelete(order)}
              />
            ),
          },
        ]}
      />

      {/* Add Order Modal */}
      <AddLabOrderModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={() => refresh()}
      />

      {/* Edit Order Modal */}
      <EditLabOrderModal
        order={orderToEdit}
        isOpen={Boolean(orderToEdit)}
        onClose={() => setOrderToEdit(null)}
        onUpdated={(updated) => {
          if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
          refresh();
        }}
      />

      {/* Edit Result Modal */}
      <EditResultModal
        order={resultOrder}
        isOpen={Boolean(resultOrder)}
        onClose={() => setResultOrder(null)}
        onSaved={(updated) => {
          if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
          refresh();
        }}
      />

      {/* Order Detail Drawer */}
      <LabOrderDetailDrawer
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onEdit={(order) => setOrderToEdit(order)}
        onDelete={(order) => setOrderToDelete(order)}
        onStart={(order) => handleStart(order)}
        onRecordResult={(order) => setResultOrder(order)}
        onCancel={(order) => handleCancel(order)}
      />

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setOrderToDelete(null)}
          title="Delete laboratory order"
          description={`Order #${orderToDelete.id} — ${orderToDelete.testName}`}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOrderToDelete(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                isLoading={deleting}
                style={{ backgroundColor: 'var(--mf-coral-600)', borderColor: 'var(--mf-coral-600)' }}
              >
                Delete order
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 'var(--mf-fs-sm)', color: 'var(--mf-ink-700)' }}>
            Are you sure you want to remove this laboratory order? In compliance with clinical record regulations, this order will be archived and logged in the workspace audit trail.
          </p>
        </Modal>
      )}
    </>
  );
}
