import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Select } from '../../../shared/components/Select/Select';
import { Alert } from '../../../shared/components/Alert/Alert';
import { useToast } from '../../../shared/components/Toast/Toast';
import { ApiError } from '../../../core/api/client';
import { pharmacyApi } from '../../../core/api/services';
import type { Medication } from '../../../core/api/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (medication: Medication) => void;
}

const DEFAULT_CATEGORIES = [
  'Analgesics',
  'Antibiotics',
  'Antihistamines',
  'Antipyretics',
  'Cardiovascular',
  'Dermatological',
  'Gastrointestinal',
  'Respiratory',
  'Vitamins & Supplements',
];

export function AddMedicineModal({ isOpen, onClose, onCreated }: Props) {
  const { show } = useToast();
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [name, setName] = useState('');
  const [categoryChoice, setCategoryChoice] = useState('Analgesics');
  const [customCategory, setCustomCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState('10.00');
  const [stockQuantity, setStockQuantity] = useState('100');
  const [reorderLevel, setReorderLevel] = useState('20');
  const [expiryDate, setExpiryDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitError(null);
    setName('');
    setCategoryChoice('Analgesics');
    setCustomCategory('');
    setUnitPrice('10.00');
    setStockQuantity('100');
    setReorderLevel('20');
    setExpiryDate('');

    pharmacyApi
      .categories()
      .then((catList) => {
        if (catList && catList.length > 0) {
          const merged = Array.from(new Set([...catList, ...DEFAULT_CATEGORIES])).sort();
          setCategories(merged);
          setCategoryChoice(merged[0]);
        }
      })
      .catch(() => {
        // Fall back to default categories
      });
  }, [isOpen]);

  const effectiveCategory = categoryChoice === '__CUSTOM__' ? customCategory.trim() : categoryChoice;

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) {
      nextErrors.name = 'Medication name is required';
    } else if (name.trim().length > 150) {
      nextErrors.name = 'Medication name cannot exceed 150 characters';
    }

    if (categoryChoice === '__CUSTOM__' && !customCategory.trim()) {
      nextErrors.category = 'Please enter a category name';
    } else if (!effectiveCategory) {
      nextErrors.category = 'Please select or enter a category';
    }

    const priceNum = parseFloat(unitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      nextErrors.unitPrice = 'Unit price must be a positive number';
    }

    const stockNum = parseInt(stockQuantity, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      nextErrors.stockQuantity = 'Stock quantity must be a non-negative integer';
    }

    const reorderNum = parseInt(reorderLevel, 10);
    if (isNaN(reorderNum) || reorderNum < 0) {
      nextErrors.reorderLevel = 'Reorder level must be a non-negative integer';
    }

    if (expiryDate) {
      const parsedDate = new Date(expiryDate);
      if (isNaN(parsedDate.getTime())) {
        nextErrors.expiryDate = 'Please enter a valid expiry date';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) {
      show({ title: 'Please complete all required fields correctly', tone: 'danger' });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await pharmacyApi.create({
        name: name.trim(),
        category: effectiveCategory,
        unitPrice: parseFloat(unitPrice),
        stockQuantity: parseInt(stockQuantity, 10),
        reorderLevel: parseInt(reorderLevel, 10),
        expiryDate: expiryDate ? expiryDate : undefined,
      });
      show({ title: `Added ${created.name} to pharmacy catalogue`, tone: 'success' });
      onCreated(created);
      onClose();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : 'Could not create medication. Please verify your inputs and try again.';
      setSubmitError(message);
      show({ title: 'Could not add medicine', description: message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  }

  const categoryOptions = [
    ...categories.map((c) => ({ value: c, label: c })),
    { value: '__CUSTOM__', label: '+ Other (enter custom category)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add medication"
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mf-space-3)' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="add-medicine-form" variant="primary" isLoading={submitting} onClick={submit}>
            Create medication
          </Button>
        </div>
      }
    >
      <form id="add-medicine-form" onSubmit={submit} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
        {submitError && (
          <Alert tone="danger" title="Registration error">
            {submitError}
          </Alert>
        )}

        <Input
          label="Medication name *"
          id="medication-name-input"
          placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={submitting}
          autoFocus
        />

        <div style={{ display: 'grid', gap: 'var(--mf-space-3)' }}>
          <Select
            label="Category *"
            id="medication-category-select"
            options={categoryOptions}
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value)}
            disabled={submitting}
          />
          {categoryChoice === '__CUSTOM__' && (
            <Input
              label="Custom category name *"
              id="custom-category-input"
              placeholder="e.g. Ophthalmic, Oncology"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              error={errors.category}
              disabled={submitting}
            />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mf-space-3)' }}>
          <Input
            label="Unit price (₹) *"
            id="medication-price-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            error={errors.unitPrice}
            disabled={submitting}
          />

          <Input
            label="Initial stock quantity *"
            id="medication-stock-input"
            type="number"
            step="1"
            min="0"
            placeholder="0"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            error={errors.stockQuantity}
            disabled={submitting}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mf-space-3)' }}>
          <Input
            label="Reorder level *"
            id="medication-reorder-input"
            type="number"
            step="1"
            min="0"
            placeholder="10"
            hint="Alert triggers when stock <= this level"
            value={reorderLevel}
            onChange={(e) => setReorderLevel(e.target.value)}
            error={errors.reorderLevel}
            disabled={submitting}
          />

          <Input
            label="Expiry date"
            id="medication-expiry-input"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            error={errors.expiryDate}
            disabled={submitting}
          />
        </div>
      </form>
    </Modal>
  );
}
