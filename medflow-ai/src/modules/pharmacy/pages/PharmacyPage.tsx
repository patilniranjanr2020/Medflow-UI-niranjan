import { useEffect, useState } from 'react';
import { DataPage } from '../../../shared/components/DataPage';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { Select } from '../../../shared/components/Select/Select';
import { useToast } from '../../../shared/components/Toast/Toast';
import { pharmacyApi } from '../../../core/api/services';
import { ApiError } from '../../../core/api/client';
import { formatDate, formatMoney } from '../../../core/utils/format';
import type { Medication } from '../../../core/api/types';
import { AddMedicineModal } from '../components/AddMedicineModal';
import { EditMedicineModal } from '../components/EditMedicineModal';
import { MedicineDetailDrawer } from '../components/MedicineDetailDrawer';
import { DeleteMedicineModal } from '../components/DeleteMedicineModal';
import { Plus } from 'lucide-react';

const STOCK_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All stock levels' },
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'LOW_STOCK', label: 'Low stock (reorder alert)' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
];

export default function PharmacyPage() {
  const { show } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockStatus, setStockStatus] = useState('ALL');
  const [version, setVersion] = useState(0);

  // Modals & Drawer State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medication | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<Medication | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medication | null>(null);

  useEffect(() => {
    pharmacyApi
      .categories()
      .then((cats) => {
        if (cats) setCategories(cats);
      })
      .catch(() => {
        // Fall back gracefully
      });
  }, [version]);

  async function restock(row: Medication, delta: number) {
    try {
      const updated = await pharmacyApi.adjustStock(row.id, delta);
      show({
        title: `${row.name}: stock ${delta > 0 ? '+' : ''}${delta}`,
        description: `New stock level: ${updated.stockQuantity} units`,
        tone: 'success',
      });
      setVersion((v) => v + 1);
      if (selectedMedicine && selectedMedicine.id === row.id) {
        setSelectedMedicine(updated);
      }
    } catch (cause) {
      show({
        title: 'Could not adjust stock',
        description: cause instanceof ApiError ? cause.message : undefined,
        tone: 'danger',
      });
    }
  }

  const categoryOptions = [
    { value: 'ALL', label: 'All categories' },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  return (
    <>
      <DataPage<Medication>
        title="Pharmacy"
        description="Medication catalogue, stock levels, batch expiries, and reorder alerts."
        searchPlaceholder="Search medications by name or category…"
        rowKey={(row) => row.id}
        deps={[selectedCategory, stockStatus, version]}
        onRowClick={(row) => setSelectedMedicine(row)}
        load={({ page, size, query }) =>
          pharmacyApi.list({
            page,
            size,
            query,
            category: selectedCategory === 'ALL' ? undefined : selectedCategory,
            stockStatus: stockStatus === 'ALL' ? undefined : stockStatus,
            lowStockOnly: stockStatus === 'LOW_STOCK',
          })
        }
        emptyMessage="No medications found matching your search and filter criteria."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsAddOpen(true)}
            aria-label="Add medicine"
          >
            Add medicine
          </Button>
        }
        toolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mf-space-3)', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '180px' }}>
              <Select
                id="pharmacy-category-filter"
                aria-label="Filter by category"
                options={categoryOptions}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              />
            </div>
            <div style={{ minWidth: '200px' }}>
              <Select
                id="pharmacy-stock-filter"
                aria-label="Filter by stock status"
                options={STOCK_STATUS_OPTIONS}
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
              />
            </div>
            {(selectedCategory !== 'ALL' || stockStatus !== 'ALL') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setStockStatus('ALL');
                }}
              >
                Reset filters
              </Button>
            )}
          </div>
        }
        columns={[
          { key: 'name', header: 'Medication', render: (row) => row.name },
          { key: 'category', header: 'Category', render: (row) => row.category },
          { key: 'price', header: 'Unit price', align: 'right', render: (row) => formatMoney(row.unitPrice) },
          {
            key: 'stock',
            header: 'Stock',
            align: 'right',
            render: (row) => {
              const tone = row.stockQuantity === 0 ? 'coral' : row.lowStock ? 'coral' : 'green';
              return (
                <Badge tone={tone}>
                  {row.stockQuantity} / reorder at {row.reorderLevel}
                </Badge>
              );
            },
          },
          { key: 'expiry', header: 'Expires', render: (row) => formatDate(row.expiryDate) },
          {
            key: 'action',
            header: 'Stock actions',
            align: 'right',
            render: (row) => (
              <div
                style={{ display: 'flex', gap: 'var(--mf-space-2)', justifyContent: 'flex-end' }}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    restock(row, 10);
                  }}
                  aria-label={`Restock 10 units of ${row.name}`}
                >
                  +10
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={row.stockQuantity <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    restock(row, -1);
                  }}
                  aria-label={`Dispense 1 unit of ${row.name}`}
                >
                  Dispense
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* Creation Modal */}
      <AddMedicineModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={() => {
          setVersion((v) => v + 1);
        }}
      />

      {/* Detail Drawer */}
      <MedicineDetailDrawer
        medication={selectedMedicine}
        isOpen={!!selectedMedicine}
        onClose={() => setSelectedMedicine(null)}
        onEdit={(med) => {
          setEditingMedicine(med);
        }}
        onDelete={(med) => {
          setDeletingMedicine(med);
        }}
        onAdjustStock={async (med, delta) => {
          await restock(med, delta);
        }}
      />

      {/* Edit Modal */}
      <EditMedicineModal
        medication={editingMedicine}
        isOpen={!!editingMedicine}
        onClose={() => setEditingMedicine(null)}
        onUpdated={(updated) => {
          setSelectedMedicine(updated);
          setVersion((v) => v + 1);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteMedicineModal
        medication={deletingMedicine}
        isOpen={!!deletingMedicine}
        onClose={() => setDeletingMedicine(null)}
        onDeleted={() => {
          setSelectedMedicine(null);
          setVersion((v) => v + 1);
        }}
      />
    </>
  );
}
