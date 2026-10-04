import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Eye, Play, CheckCircle2, Edit2, XCircle, Trash2 } from 'lucide-react';
import { cn } from '../../../core/utils/cn';
import type { LabOrder } from '../../../core/api/types';
import './LabOrderActionMenu.css';

interface Props {
  order: LabOrder;
  onViewDetails: (order: LabOrder) => void;
  onStart: (order: LabOrder) => void;
  onRecordResult: (order: LabOrder) => void;
  onEdit: (order: LabOrder) => void;
  onCancel: (order: LabOrder) => void;
  onDelete: (order: LabOrder) => void;
}

export function LabOrderActionMenu({
  order,
  onViewDetails,
  onStart,
  onRecordResult,
  onEdit,
  onCancel,
  onDelete,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div
      className="mf-lab-action-menu"
      ref={containerRef}
      onClick={(e) => e.stopPropagation()} // prevent triggering table row click
    >
      <button
        type="button"
        className={cn('mf-lab-action-menu__trigger', isOpen && 'mf-lab-action-menu__trigger--open')}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Actions for ${order.testName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="mf-lab-action-menu__panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="mf-lab-action-menu__item"
            onClick={() => {
              setIsOpen(false);
              onViewDetails(order);
            }}
          >
            <Eye size={14} className="mf-lab-action-menu__icon" />
            View details
          </button>

          {order.status === 'ORDERED' && (
            <button
              type="button"
              role="menuitem"
              className="mf-lab-action-menu__item"
              onClick={() => {
                setIsOpen(false);
                onStart(order);
              }}
            >
              <Play size={14} className="mf-lab-action-menu__icon" />
              Start processing
            </button>
          )}

          {!isCompleted && !isCancelled && (
            <button
              type="button"
              role="menuitem"
              className="mf-lab-action-menu__item"
              onClick={() => {
                setIsOpen(false);
                onRecordResult(order);
              }}
            >
              <CheckCircle2 size={14} className="mf-lab-action-menu__icon" />
              {order.resultSummary ? 'Edit findings' : 'Record result'}
            </button>
          )}

          {!isCancelled && (
            <button
              type="button"
              role="menuitem"
              className="mf-lab-action-menu__item"
              onClick={() => {
                setIsOpen(false);
                onEdit(order);
              }}
            >
              <Edit2 size={14} className="mf-lab-action-menu__icon" />
              Edit order
            </button>
          )}

          {!isCompleted && !isCancelled && (
            <button
              type="button"
              role="menuitem"
              className="mf-lab-action-menu__item mf-lab-action-menu__item--danger"
              onClick={() => {
                setIsOpen(false);
                onCancel(order);
              }}
            >
              <XCircle size={14} className="mf-lab-action-menu__icon" />
              Cancel order
            </button>
          )}

          <div className="mf-lab-action-menu__divider" />

          <button
            type="button"
            role="menuitem"
            className="mf-lab-action-menu__item mf-lab-action-menu__item--danger"
            onClick={() => {
              setIsOpen(false);
              onDelete(order);
            }}
          >
            <Trash2 size={14} className="mf-lab-action-menu__icon" />
            Delete order
          </button>
        </div>
      )}
    </div>
  );
}
