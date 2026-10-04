import { Drawer } from '../../../shared/components/Drawer/Drawer';
import { Button } from '../../../shared/components/Button/Button';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Card, CardBody } from '../../../shared/components/Card/Card';
import { formatDateTime, humanize, statusTone } from '../../../core/utils/format';
import type { LabOrder } from '../../../core/api/types';
import { Edit2, Trash2, Play, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  order: LabOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (order: LabOrder) => void;
  onDelete: (order: LabOrder) => void;
  onStart: (order: LabOrder) => void;
  onRecordResult: (order: LabOrder) => void;
  onCancel: (order: LabOrder) => void;
}

const PRIORITY_TONE = { ROUTINE: 'neutral', URGENT: 'amber', STAT: 'coral' } as const;

export function LabOrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStart,
  onRecordResult,
  onCancel,
}: Props) {
  if (!order) return null;

  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)' }}>
      {!isCancelled && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(order)}
          aria-label="Edit order details"
        >
          <Edit2 size={14} style={{ marginRight: 'var(--mf-space-1)' }} />
          Edit
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onDelete(order)}
        aria-label="Delete order"
        style={{ color: 'var(--mf-coral-600)', borderColor: 'var(--mf-coral-200)' }}
      >
        <Trash2 size={14} style={{ marginRight: 'var(--mf-space-1)' }} />
        Delete
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Order #${order.id}`}
      actions={headerActions}
    >
      <div style={{ display: 'grid', gap: 'var(--mf-space-5)' }}>
        {/* Status & Priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)' }}>
          <Badge tone={statusTone(order.status)} dot>
            {humanize(order.status)}
          </Badge>
          <Badge tone={PRIORITY_TONE[order.priority]}>
            {humanize(order.priority)} Priority
          </Badge>
        </div>

        {/* Test Name */}
        <div>
          <span style={{ fontSize: 'var(--mf-fs-xs)', textTransform: 'uppercase', color: 'var(--mf-ink-400)', fontWeight: 600 }}>
            Test Ordered
          </span>
          <h3 style={{ margin: 'var(--mf-space-1) 0 0', fontSize: 'var(--mf-fs-xl)' }}>
            {order.testName}
          </h3>
        </div>

        {/* Patient & Doctor cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mf-space-3)' }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-400)' }}>Patient</div>
              <div style={{ fontWeight: 600, marginTop: 'var(--mf-space-1)' }}>{order.patientName}</div>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)' }}>ID #{order.patientId}</div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-400)' }}>Ordered by</div>
              <div style={{ fontWeight: 600, marginTop: 'var(--mf-space-1)' }}>{order.doctorName}</div>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)' }}>Clinician</div>
            </CardBody>
          </Card>
        </div>

        {/* Timeline */}
        <div style={{ display: 'grid', gap: 'var(--mf-space-2)', fontSize: 'var(--mf-fs-sm)', borderTop: '1px solid var(--mf-border)', paddingTop: 'var(--mf-space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--mf-ink-500)' }}>Ordered:</span>
            <span style={{ fontWeight: 500 }}>{formatDateTime(order.orderedAt)}</span>
          </div>
          {order.completedAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--mf-ink-500)' }}>Signed off:</span>
              <span style={{ fontWeight: 500 }}>{formatDateTime(order.completedAt)}</span>
            </div>
          )}
          {order.updatedAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--mf-ink-500)' }}>Last updated:</span>
              <span style={{ fontWeight: 500 }}>{formatDateTime(order.updatedAt)}</span>
            </div>
          )}
        </div>

        {/* Result summary */}
        <div style={{ borderTop: '1px solid var(--mf-border)', paddingTop: 'var(--mf-space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--mf-space-2)' }}>
            <h4 style={{ margin: 0 }}>Laboratory Results</h4>
            {!isCompleted && !isCancelled && (
              <Button size="sm" variant="ghost" onClick={() => onRecordResult(order)}>
                <Edit2 size={13} style={{ marginRight: 'var(--mf-space-1)' }} />
                {order.resultSummary ? 'Edit result' : 'Enter result'}
              </Button>
            )}
          </div>

          <div
            style={{
              padding: 'var(--mf-space-4)',
              background: 'var(--mf-bg-subtle)',
              borderRadius: 'var(--mf-radius-md)',
              border: '1px solid var(--mf-border)',
              minHeight: '80px',
              whiteSpace: 'pre-wrap',
              fontSize: 'var(--mf-fs-sm)',
            }}
          >
            {order.resultSummary ? (
              order.resultSummary
            ) : (
              <span style={{ color: 'var(--mf-ink-400)', fontStyle: 'italic' }}>
                No findings or report recorded yet.
              </span>
            )}
          </div>
          {isCompleted && (
            <div style={{ marginTop: 'var(--mf-space-2)', fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)' }}>
              🔒 Result formally signed off. Preserved in tamper-evident clinical audit record.
            </div>
          )}
        </div>

        {/* Quick workflow actions */}
        <div style={{ borderTop: '1px solid var(--mf-border)', paddingTop: 'var(--mf-space-4)', display: 'grid', gap: 'var(--mf-space-2)' }}>
          {order.status === 'ORDERED' && (
            <Button variant="primary" onClick={() => onStart(order)}>
              <Play size={15} style={{ marginRight: 'var(--mf-space-2)' }} />
              Start processing specimen
            </Button>
          )}

          {order.status === 'IN_PROGRESS' && (
            <Button variant="primary" onClick={() => onRecordResult(order)}>
              <CheckCircle2 size={15} style={{ marginRight: 'var(--mf-space-2)' }} />
              Record findings & sign off
            </Button>
          )}

          {!isCompleted && !isCancelled && (
            <Button
              variant="outline"
              onClick={() => onCancel(order)}
              style={{ color: 'var(--mf-coral-600)', borderColor: 'var(--mf-coral-200)' }}
            >
              <XCircle size={15} style={{ marginRight: 'var(--mf-space-2)' }} />
              Cancel lab order
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
