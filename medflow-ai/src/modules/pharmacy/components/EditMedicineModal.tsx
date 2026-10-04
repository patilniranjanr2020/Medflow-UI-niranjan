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
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (medication: Medication) => void;
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

export function EditMedicineModal({ medication, isOpen, onClose, onUpdated }: Props) {
  const { show } = useToast();
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [name, setName] = useState('');
  const [categoryChoice, setCategoryChoice] = useState('Analgesics');
  const [customCategory, setCustomCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState('10.00');
  const [reorderLevel, setReorderLevel] = useState('20');
  const [expiryDate, setExpiryDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !medication) return;
    setErrors({});
    setSubmitError(null);
    setName(medication.name);
    setUnitPrice(String(medication.unitPrice));
    setReorderLevel(String(medication.reorderLevel));
    setExpiryDate(medication.expiryDate ? medication.expiryDate.substring(0, 10) : '');

    pharmacyApi
      .categories()
      .then((catList) => {
        const merged = Array.from(new Set([...(catList || []), ...DEFAULT_CATEGORIES, medication.category])).sort();
        setCategories(merged);
        if (merged.includes(medication.category)) {
          setCategoryChoice(medication.category);
          setCustomCategory('');
        } else {
          setCategoryChoice('__CUSTOM__');
          setCustomCategory(medication.category);
        }
      })
      .catch(() => {
        if (DEFAULT_CATEGORIES.includes(medication.category)) {
          setCategoryChoice(medication.category);
          setCustomCategory('');
        } else {
          setCategoryChoice('__CUSTOM__');
          setCustomCategory(medication.category);
        }
      });
  }, [isOpen, medication]);

  if (!medication) return null;

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
    if (!medication || !validate()) {
      show({ title: 'Please complete all required fields correctly', tone: 'danger' });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await pharmacyApi.update(medication.id, {
        name: name.trim(),
        category: effectiveCategory,
        unitPrice: parseFloat(unitPrice),
        reorderLevel: parseInt(reorderLevel, 10),
        expiryDate: expiryDate ? expiryDate : undefined,
      });
      show({ title: `Updated ${updated.name}`, tone: 'success' });
      onUpdated(updated);
      onClose();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : 'Could not update medication. Please verify your inputs and try again.';
      setSubmitError(message);
      show({ title: 'Could not update medicine', description: message, tone: 'danger' });
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
      title={`Edit ${medication.name}`}
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--mf-space-3)' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-medicine-form" variant="primary" isLoading={submitting} onClick={submit}>
            Save changes
          </Button>
        </div>
      }
    >
      <form id="edit-medicine-form" onSubmit={submit} style={{ display: 'grid', gap: 'var(--mf-space-4)' }}>
        {submitError && (
          <Alert tone="danger" title="Update error">
            {submitError}
          </Alert>
        )}

        <Input
          label="Medication name *"
          id="edit-medication-name-input"
          placeholder="e.g. Paracetamol 500mg"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={submitting}
        />

        <div style={{ display: 'grid', gap: 'var(--mf-space-3)' }}>
          <Select
            label="Category *"
            id="edit-medication-category-select"
            options={categoryOptions}
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value)}
            disabled={submitting}
          />
          {categoryChoice === '__CUSTOM__' && (
            <Input
              label="Custom category name *"
              id="edit-custom-category-input"
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
            id="edit-medication-price-input"
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
            label="Reorder level *"
            id="edit-medication-reorder-input"
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
        </div>

        <Input
          label="Expiry date"
          id="edit-medication-expiry-input"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          error={errors.expiryDate}
          disabled={submitting}
        />
      </form>
    </Modal>
  );
}
