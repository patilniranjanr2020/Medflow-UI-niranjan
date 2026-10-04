import { Drawer } from '../../../shared/components/Drawer/Drawer';
import { Button } from '../../../shared/components/Button/Button';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Card, CardBody } from '../../../shared/components/Card/Card';
import { formatDate, formatDateTime, humanize, statusTone } from '../../../core/utils/format';
import type { Prescription } from '../../../core/api/types';
import { Edit2, Trash2, CheckCircle2, FileCheck2, User, Stethoscope, Clock, ShieldAlert } from 'lucide-react';
import { useToast } from '../../../shared/components/Toast/Toast';

interface Props {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (prescription: Prescription) => void;
  onDelete: (prescription: Prescription) => void;
  onComplete?: (prescription: Prescription) => void;
  onCancel?: (prescription: Prescription) => void;
}

export function PrescriptionDetailDrawer({
  prescription,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onComplete,
  onCancel,
}: Props) {
  const { show } = useToast();

  if (!prescription) return null;

  const isLocked = prescription.digitallySigned || prescription.status !== 'ACTIVE';

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)' }}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (isLocked) {
            show({
              title: 'Prescription is locked',
              description: prescription.digitallySigned
                ? 'Digitally signed prescriptions cannot be modified to preserve legal clinical integrity.'
                : `Prescriptions with status ${prescription.status} cannot be modified.`,
              tone: 'neutral',
            });
            return;
          }
          onEdit(prescription);
        }}
        disabled={isLocked}
        title={isLocked ? 'Signed or non-active prescriptions cannot be edited' : 'Edit prescription'}
        aria-label="Edit prescription"
      >
        <Edit2 size={14} style={{ marginRight: 'var(--mf-space-1)' }} />
        Edit
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (isLocked) {
            show({
              title: 'Prescription is locked',
              description: prescription.digitallySigned
                ? 'Digitally signed prescriptions cannot be deleted to preserve medical record history.'
                : `Prescriptions with status ${prescription.status} cannot be deleted.`,
              tone: 'neutral',
            });
            return;
          }
          onDelete(prescription);
        }}
        disabled={isLocked}
        title={isLocked ? 'Signed or non-active prescriptions cannot be deleted' : 'Delete prescription'}
        aria-label="Delete prescription"
        style={{
          color: isLocked ? undefined : 'var(--mf-coral-600)',
          borderColor: isLocked ? undefined : 'var(--mf-coral-200)',
        }}
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
      title={`Prescription #${prescription.id}`}
      actions={headerActions}
    >
      <div style={{ display: 'grid', gap: 'var(--mf-space-5)' }}>
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)', flexWrap: 'wrap' }}>
          <Badge tone={statusTone(prescription.status)} dot>
            {humanize(prescription.status)}
          </Badge>
          <Badge tone={prescription.digitallySigned ? 'green' : 'neutral'}>
            {prescription.digitallySigned ? 'Digitally Signed' : 'Draft'}
          </Badge>
        </div>

        {/* Lock explanation banner */}
        {prescription.digitallySigned ? (
          <div
            style={{
              padding: 'var(--mf-space-3)',
              background: 'var(--mf-green-50, #f0fdf4)',
              border: '1px solid var(--mf-green-200, #bbf7d0)',
              borderRadius: 'var(--mf-radius-md)',
              display: 'flex',
              gap: 'var(--mf-space-2)',
              alignItems: 'center',
              fontSize: 'var(--mf-fs-xs)',
              color: 'var(--mf-green-800, #166534)',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Digitally signed clinical record</strong>
              {prescription.signedAt && ` on ${formatDateTime(prescription.signedAt)}`}. This prescription is legally sealed and locked against edits or deletion.
            </div>
          </div>
        ) : prescription.status !== 'ACTIVE' ? (
          <div
            style={{
              padding: 'var(--mf-space-3)',
              background: 'var(--mf-bg-subtle)',
              border: '1px solid var(--mf-border)',
              borderRadius: 'var(--mf-radius-md)',
              display: 'flex',
              gap: 'var(--mf-space-2)',
              alignItems: 'center',
              fontSize: 'var(--mf-fs-xs)',
              color: 'var(--mf-ink-600)',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <div>
              This prescription is marked as <strong>{prescription.status}</strong> and cannot be modified or deleted.
            </div>
          </div>
        ) : null}

        {/* Patient and Doctor Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mf-space-3)' }}>
          <Card>
            <CardBody style={{ padding: 'var(--mf-space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)', color: 'var(--mf-ink-500)', fontSize: 'var(--mf-fs-xs)', marginBottom: '4px' }}>
                <User size={14} />
                <span>Patient</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 'var(--mf-fs-base)', color: 'var(--mf-ink-900)' }}>
                {prescription.patientName}
              </div>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-400)', marginTop: '2px' }}>
                Patient ID: #{prescription.patientId}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody style={{ padding: 'var(--mf-space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)', color: 'var(--mf-ink-500)', fontSize: 'var(--mf-fs-xs)', marginBottom: '4px' }}>
                <Stethoscope size={14} />
                <span>Prescribing Doctor</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 'var(--mf-fs-base)', color: 'var(--mf-ink-900)' }}>
                {prescription.doctorName}
              </div>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-400)', marginTop: '2px' }}>
                Doctor ID: #{prescription.doctorId}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Diagnosis */}
        <div>
          <span style={{ fontSize: 'var(--mf-fs-xs)', textTransform: 'uppercase', color: 'var(--mf-ink-400)', fontWeight: 600 }}>
            Diagnosis / Clinical Notes
          </span>
          <div
            style={{
              marginTop: 'var(--mf-space-1)',
              padding: 'var(--mf-space-3)',
              background: 'var(--mf-bg-subtle)',
              borderRadius: 'var(--mf-radius-md)',
              border: '1px solid var(--mf-border)',
              color: prescription.diagnosis ? 'var(--mf-ink-800)' : 'var(--mf-ink-400)',
              fontStyle: prescription.diagnosis ? 'normal' : 'italic',
              lineHeight: 1.5,
              fontSize: 'var(--mf-fs-sm)',
            }}
          >
            {prescription.diagnosis || 'No diagnosis or clinical notes specified.'}
          </div>
        </div>

        {/* Medication Lines */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--mf-space-2)' }}>
            <span style={{ fontSize: 'var(--mf-fs-xs)', textTransform: 'uppercase', color: 'var(--mf-ink-400)', fontWeight: 600 }}>
              Prescribed Medications ({prescription.medicines.length})
            </span>
          </div>

          {prescription.medicines.length === 0 ? (
            <div style={{ padding: 'var(--mf-space-4)', textAlign: 'center', color: 'var(--mf-ink-400)', fontSize: 'var(--mf-fs-sm)', border: '1px dashed var(--mf-border)', borderRadius: 'var(--mf-radius-md)' }}>
              No medication lines recorded.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--mf-space-2)' }}>
              {prescription.medicines.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--mf-space-3)',
                    background: 'var(--mf-bg)',
                    border: '1px solid var(--mf-border)',
                    borderRadius: 'var(--mf-radius-md)',
                    display: 'grid',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 'var(--mf-fs-base)', color: 'var(--mf-ink-900)' }}>
                      {item.medicationName}
                    </strong>
                    <span style={{ fontSize: 'var(--mf-fs-xs)', fontWeight: 600, color: 'var(--mf-blue-600, #2563eb)', background: 'var(--mf-blue-50, #eff6ff)', padding: '2px 8px', borderRadius: '12px' }}>
                      {item.dosage}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--mf-space-4)', fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-600)', marginTop: '2px' }}>
                    <span>
                      <strong>Frequency:</strong> {item.frequency}
                    </span>
                    {item.durationDays && (
                      <span>
                        <strong>Duration:</strong> {item.durationDays} days
                      </span>
                    )}
                  </div>

                  {item.instructions && (
                    <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)', fontStyle: 'italic', marginTop: '2px' }}>
                      Instructions: {item.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div style={{ display: 'grid', gap: 'var(--mf-space-2)', borderTop: '1px solid var(--mf-border)', paddingTop: 'var(--mf-space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)', fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)' }}>
            <Clock size={14} />
            <span>Issued on: {formatDateTime(prescription.createdAt)}</span>
          </div>
          {prescription.signedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)', fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-green-700, #15803d)' }}>
              <FileCheck2 size={14} />
              <span>Digitally signed on: {formatDateTime(prescription.signedAt)}</span>
            </div>
          )}
        </div>

        {/* Status Actions */}
        {prescription.status === 'ACTIVE' && (onComplete || onCancel) && (
          <div style={{ display: 'flex', gap: 'var(--mf-space-2)', borderTop: '1px solid var(--mf-border)', paddingTop: 'var(--mf-space-4)' }}>
            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onComplete(prescription)}
                style={{ flex: 1 }}
              >
                <CheckCircle2 size={14} style={{ marginRight: 'var(--mf-space-1)', color: 'var(--mf-green-600)' }} />
                Complete Course
              </Button>
            )}
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(prescription)}
                style={{ flex: 1, color: 'var(--mf-coral-600)' }}
              >
                Withdraw / Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
