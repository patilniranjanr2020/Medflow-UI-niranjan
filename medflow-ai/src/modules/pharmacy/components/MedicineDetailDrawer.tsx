import { useState } from 'react';
import { Drawer } from '../../../shared/components/Drawer/Drawer';
import { Button } from '../../../shared/components/Button/Button';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Card, CardBody } from '../../../shared/components/Card/Card';
import { Input } from '../../../shared/components/Input/Input';
import { formatDate, formatMoney } from '../../../core/utils/format';
import type { Medication } from '../../../core/api/types';
import { Edit2, Trash2, Plus, Minus, Package, AlertTriangle, Calendar, ShieldCheck } from 'lucide-react';

interface Props {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (medication: Medication) => void;
  onDelete: (medication: Medication) => void;
  onAdjustStock: (medication: Medication, delta: number) => Promise<void>;
}

export function MedicineDetailDrawer({
  medication,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onAdjustStock,
}: Props) {
  const [customDelta, setCustomDelta] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  if (!medication) return null;

  const isLowStock = medication.lowStock;
  const isOutOfStock = medication.stockQuantity === 0;

  let stockStatusTone: 'coral' | 'amber' | 'green' = 'green';
  let stockStatusText = 'In stock';
  if (isOutOfStock) {
    stockStatusTone = 'coral';
    stockStatusText = 'Out of stock';
  } else if (isLowStock) {
    stockStatusTone = 'amber';
    stockStatusText = 'Low stock (reorder alert)';
  }

  // Check if expired
  let isExpired = false;
  let isExpiringSoon = false;
  if (medication.expiryDate) {
    const expDate = new Date(medication.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expDate.getTime() < now.getTime()) {
      isExpired = true;
    } else if (expDate.getTime() <= thirtyDaysFromNow.getTime()) {
      isExpiringSoon = true;
    }
  }

  async function handleAdjust(delta: number) {
    if (!medication) return;
    setAdjusting(true);
    try {
      await onAdjustStock(medication, delta);
    } finally {
      setAdjusting(false);
    }
  }

  async function handleCustomAdjust(event: React.FormEvent) {
    event.preventDefault();
    const delta = parseInt(customDelta, 10);
    if (isNaN(delta) || delta === 0) return;
    await handleAdjust(delta);
    setCustomDelta('');
  }

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)' }}>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(medication);
        }}
        aria-label="Edit medicine"
      >
        <Edit2 size={14} style={{ marginRight: 'var(--mf-space-1)' }} />
        Edit
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(medication);
        }}
        aria-label="Delete medicine"
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
      title={medication.name}
      actions={headerActions}
    >
      <div style={{ display: 'grid', gap: 'var(--mf-space-5)' }}>
        {/* Status badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--mf-space-2)' }}>
          <Badge tone={stockStatusTone} dot>
            {stockStatusText}
          </Badge>
          <Badge tone="neutral">
            {medication.category}
          </Badge>
          {isExpired && (
            <Badge tone="coral">
              Expired
            </Badge>
          )}
          {isExpiringSoon && !isExpired && (
            <Badge tone="amber">
              Expiring soon
            </Badge>
          )}
        </div>

        {/* Medication Name & Category Header */}
        <div>
          <span style={{ fontSize: 'var(--mf-fs-xs)', textTransform: 'uppercase', color: 'var(--mf-ink-400)', fontWeight: 600 }}>
            Medication Details
          </span>
          <h3 style={{ margin: 'var(--mf-space-1) 0 0', fontSize: 'var(--mf-fs-xl)' }}>
            {medication.name}
          </h3>
          <p style={{ margin: 'var(--mf-space-1) 0 0', color: 'var(--mf-ink-500)', fontSize: 'var(--mf-fs-sm)' }}>
            Catalogue item ID #{medication.id} • {medication.category}
          </p>
        </div>

        {/* Pricing & Stock Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mf-space-3)' }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-400)' }}>Unit Price</div>
              <div style={{ fontWeight: 700, fontSize: 'var(--mf-fs-lg)', marginTop: 'var(--mf-space-1)', color: 'var(--mf-ink-900)' }}>
                {formatMoney(medication.unitPrice)}
              </div>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)', marginTop: 'var(--mf-space-1)' }}>
                Per unit / package
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-400)' }}>Current Inventory</div>
              <div style={{ fontWeight: 700, fontSize: 'var(--mf-fs-lg)', marginTop: 'var(--mf-space-1)', color: isLowStock ? 'var(--mf-coral-600)' : 'var(--mf-ink-900)' }}>
                {medication.stockQuantity} units
              </div>
              <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)', marginTop: 'var(--mf-space-1)' }}>
                Reorder trigger at &le; {medication.reorderLevel}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Additional metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mf-space-3)' }}>
          <div style={{ padding: 'var(--mf-space-3)', background: 'var(--mf-surface-subtle)', borderRadius: 'var(--mf-radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-1)', color: 'var(--mf-ink-500)', fontSize: 'var(--mf-fs-xs)' }}>
              <Calendar size={13} />
              Expiry Date
            </div>
            <div style={{ fontWeight: 600, marginTop: 'var(--mf-space-1)', color: isExpired ? 'var(--mf-coral-600)' : 'var(--mf-ink-800)' }}>
              {formatDate(medication.expiryDate)}
            </div>
          </div>

          <div style={{ padding: 'var(--mf-space-3)', background: 'var(--mf-surface-subtle)', borderRadius: 'var(--mf-radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-1)', color: 'var(--mf-ink-500)', fontSize: 'var(--mf-fs-xs)' }}>
              <ShieldCheck size={13} />
              Audit & Safety
            </div>
            <div style={{ fontWeight: 600, marginTop: 'var(--mf-space-1)', color: 'var(--mf-ink-800)' }}>
              Soft-delete enabled
            </div>
          </div>
        </div>

        {/* Inventory Stock Actions (Distinct from editing metadata) */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-2)', marginBottom: 'var(--mf-space-3)' }}>
              <Package size={16} style={{ color: 'var(--mf-teal-600)' }} />
              <h4 style={{ margin: 0, fontSize: 'var(--mf-fs-sm)', fontWeight: 600 }}>
                Inventory Stock Adjustments
              </h4>
            </div>
            <p style={{ margin: '0 0 var(--mf-space-3)', fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-ink-500)' }}>
              Restock incoming shipments or record dispensed quantities. Changes are audited immediately.
            </p>

            <div style={{ display: 'flex', gap: 'var(--mf-space-2)', marginBottom: 'var(--mf-space-4)' }}>
              <Button
                size="sm"
                variant="outline"
                disabled={adjusting}
                onClick={() => handleAdjust(10)}
              >
                <Plus size={14} style={{ marginRight: 'var(--mf-space-1)' }} />
                Restock +10
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={adjusting}
                onClick={() => handleAdjust(50)}
              >
                <Plus size={14} style={{ marginRight: 'var(--mf-space-1)' }} />
                Restock +50
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={adjusting || medication.stockQuantity <= 0}
                onClick={() => handleAdjust(-1)}
              >
                <Minus size={14} style={{ marginRight: 'var(--mf-space-1)' }} />
                Dispense 1
              </Button>
            </div>

            <form onSubmit={handleCustomAdjust} style={{ display: 'flex', gap: 'var(--mf-space-2)', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Custom Adjustment"
                  placeholder="e.g. +25 or -5"
                  type="number"
                  step="1"
                  value={customDelta}
                  onChange={(e) => setCustomDelta(e.target.value)}
                  disabled={adjusting}
                  hint="Enter positive to add stock, negative to deduct"
                />
              </div>
              <Button
                type="submit"
                size="md"
                variant="primary"
                disabled={adjusting || !customDelta || parseInt(customDelta, 10) === 0}
                isLoading={adjusting}
              >
                Apply
              </Button>
            </form>
          </CardBody>
        </Card>

        {isLowStock && (
          <div style={{ display: 'flex', gap: 'var(--mf-space-2)', padding: 'var(--mf-space-3)', background: 'var(--mf-amber-50)', border: '1px solid var(--mf-amber-200)', borderRadius: 'var(--mf-radius-md)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--mf-amber-700)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 'var(--mf-fs-xs)', color: 'var(--mf-amber-900)' }}>
              <strong>Low stock warning:</strong> Inventory has reached or fallen below the configured reorder threshold ({medication.reorderLevel}). Consider placing a restock order with the hospital supplier.
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
