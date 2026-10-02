import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import './InlineEditableField.css';

export interface InlineEditableFieldProps {
  fieldKey: string;
  label: string;
  value: string;
  displayElement: ReactNode;
  isEditMode: boolean;
  isActive: boolean;
  hasPendingChange: boolean;
  error?: string;
  inputType?: 'text' | 'date' | 'select' | 'tel' | 'email';
  options?: { value: string; label: string }[];
  placeholder?: string;
  inputClassName?: string;
  testId?: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onCommit: (val) => void;
}

export function InlineEditableField({
  fieldKey,
  label,
  value,
  displayElement,
  isEditMode,
  isActive,
  hasPendingChange,
  error,
  inputType = 'text',
  options = [],
  placeholder,
  inputClassName,
  testId,
  onStartEdit,
  onCancelEdit,
  onCommit,
}: InlineEditableFieldProps) {
  const [draftValue, setDraftValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const resolvedTestId = testId || `editable-field-${fieldKey}`;

  useEffect(() => {
    setDraftValue(value);
  }, [value, isActive]);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current && inputType !== 'date') {
        inputRef.current.select();
      }
    }
  }, [isActive, inputType]);

  const handleApply = () => {
    onCommit(draftValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputType !== 'select') {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setDraftValue(value);
      onCancelEdit();
    }
  };

  // Outside edit mode: Render display element with no edit affordances
  if (!isEditMode) {
    return <>{displayElement}</>;
  }

  // Edit mode - actively editing this field inline
  if (isActive) {
    const today = new Date().toISOString().split('T')[0];
    return (
      <span
        className="mf-inline-editor"
        data-testid={`inline-editor-${fieldKey}`}
        onClick={(e) => e.stopPropagation()}
      >
        {inputType === 'select' ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className={`mf-inline-editor__select ${inputClassName || ''}`}
            aria-label={label}
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={handleKeyDown}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={inputType}
            className={`mf-inline-editor__input ${inputClassName || ''}`}
            aria-label={label}
            placeholder={placeholder}
            value={draftValue}
            max={inputType === 'date' ? today : undefined}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}
        <button
          type="button"
          className="mf-inline-editor__action-btn mf-inline-editor__action-btn--apply"
          aria-label={`Apply ${label}`}
          title="Apply"
          onClick={handleApply}
        >
          <Check size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="mf-inline-editor__action-btn mf-inline-editor__action-btn--cancel"
          aria-label={`Cancel editing ${label}`}
          title="Cancel"
          onClick={() => {
            setDraftValue(value);
            onCancelEdit();
          }}
        >
          <X size={13} aria-hidden="true" />
        </button>
        {error && (
          <span className="mf-inline-editor__error" role="alert">
            {error}
          </span>
        )}
      </span>
    );
  }

  // Edit mode - display mode with hover pencil
  const showPencil = isHovered || isFocused;

  return (
    <span
      className="mf-editable-field"
      data-testid={resolvedTestId}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      tabIndex={0}
      role="group"
      aria-label={`${label}: ${value || 'empty'}`}
    >
      <span className="mf-editable-field__content">{displayElement}</span>
      {hasPendingChange && (
        <span
          className="mf-editable-field__pending-badge"
          title="Pending unsaved change"
          aria-label="Pending unsaved change"
        >
          •
        </span>
      )}
      {showPencil && (
        <button
          type="button"
          className="mf-editable-field__pencil-btn"
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
