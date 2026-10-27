import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../core/utils/cn';
import '../Input/Input.css';
import './DatePicker.css';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function parseDateValue(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  // Parse YYYY-MM-DD safely into local timezone without UTC offset shifts
  const parts = val.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatToYyyyMmDd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface DatePickerProps {
  label?: string;
  hint?: string;
  error?: string;
  value?: Date | string | null;
  onChange?: (date: Date) => void;
  onChangeString?: (dateStr: string) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  placement?: 'top' | 'bottom' | 'auto';
  align?: 'left' | 'right' | 'auto';
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

/** Text-field trigger that opens a month-grid calendar popover with independently scrollable year selection. */
export function DatePicker({
  label,
  hint,
  error,
  value,
  onChange,
  onChangeString,
  placeholder = 'Select a date',
  minDate,
  maxDate,
  placement = 'auto',
  align = 'auto',
  disabled = false,
  required = false,
  name,
  className,
  id,
  'aria-label': ariaLabel,
  onFocus,
  onBlur,
  onKeyDown,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const parsedValue = useMemo(() => parseDateValue(value), [value]);
  const isoValue = parsedValue ? formatToYyyyMmDd(parsedValue) : typeof value === 'string' ? value : '';
  const [viewDate, setViewDate] = useState(() => parsedValue ?? new Date());
  const [effectivePlacement, setEffectivePlacement] = useState<'top' | 'bottom'>(
    placement === 'top' ? 'top' : placement === 'bottom' ? 'bottom' : 'bottom'
  );
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>('left');
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);

  // Sync internal viewDate whenever external value changes
  useEffect(() => {
    if (parsedValue) {
      setViewDate(parsedValue);
    }
  }, [parsedValue]);

  // Close year list when popover closes
  useEffect(() => {
    if (!isOpen) {
      setIsYearPickerOpen(false);
    }
  }, [isOpen]);

  // Dynamic positioning relative to trigger and viewport boundaries
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();

    const isMockRect =
      triggerRect.width === 0 &&
      triggerRect.height === 0 &&
      triggerRect.top === 0 &&
      triggerRect.left === 0;

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    const viewportMargin = 8;
    const gap = 6;

    const popoverEl = popoverRef.current;
    const popoverWidth = popoverEl?.offsetWidth || 272;
    const popoverHeight = popoverEl?.offsetHeight || 315;

    // Available vertical space
    const spaceBelow = isMockRect ? 500 : viewportHeight - triggerRect.bottom - gap - viewportMargin;
    const spaceAbove = isMockRect ? 200 : triggerRect.top - gap - viewportMargin;

    let chosenPlacement: 'top' | 'bottom' = 'bottom';
    if (placement === 'top') {
      chosenPlacement = 'top';
    } else if (placement === 'bottom') {
      chosenPlacement = 'bottom';
    } else {
      // Auto: prefer bottom if it fits, otherwise use side with more space
      if (spaceBelow >= popoverHeight) {
        chosenPlacement = 'bottom';
      } else if (spaceAbove >= popoverHeight || spaceAbove > spaceBelow) {
        chosenPlacement = 'top';
      } else {
        chosenPlacement = 'bottom';
      }
    }

    let top = 0;
    let maxHeight: number | undefined;

    if (isMockRect) {
      top = chosenPlacement === 'top' ? 20 : 50;
    } else if (chosenPlacement === 'top') {
      top = triggerRect.top - gap - popoverHeight;
      if (top < viewportMargin) {
        top = viewportMargin;
        maxHeight = Math.max(220, triggerRect.top - gap - viewportMargin);
      }
    } else {
      top = triggerRect.bottom + gap;
      if (top + popoverHeight > viewportHeight - viewportMargin) {
        maxHeight = Math.max(220, viewportHeight - top - viewportMargin);
      }
    }

    // Horizontal calculation
    let chosenAlign: 'left' | 'right' = 'left';
    if (align === 'right') {
      chosenAlign = 'right';
    } else if (align === 'left') {
      chosenAlign = 'left';
    } else {
      const spaceRight = viewportWidth - triggerRect.left - viewportMargin;
      chosenAlign = spaceRight < popoverWidth ? 'right' : 'left';
    }

    let left = isMockRect
      ? 10
      : chosenAlign === 'right'
        ? triggerRect.right - popoverWidth
        : triggerRect.left;

    // Clamp horizontally to stay completely within viewport margins
    const minLeft = viewportMargin;
    const maxLeft = Math.max(viewportMargin, viewportWidth - popoverWidth - viewportMargin);
    left = Math.max(minLeft, Math.min(left, maxLeft));

    const maxWidth = Math.max(240, viewportWidth - 2 * viewportMargin);

    setEffectivePlacement(chosenPlacement);
    setEffectiveAlign(chosenAlign);
    setPopoverStyle({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      maxWidth: `${Math.round(maxWidth)}px`,
      maxHeight: maxHeight ? `${Math.round(maxHeight)}px` : undefined,
      zIndex: 1200,
    });
  }, [placement, align]);

  // Keep popover positioned while scrolling (including modal body) or resizing
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Handle outside clicks and keyboard escape
  useEffect(() => {
    if (!isOpen) return;

    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (rootRef.current && rootRef.current.contains(target)) return;
      setIsOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isYearPickerOpen) {
          setIsYearPickerOpen(false);
        } else {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, isYearPickerOpen]);

  // Auto-scroll the year list to center on the active year when opened
  useEffect(() => {
    if (isYearPickerOpen && selectedYearRef.current) {
      selectedYearRef.current.scrollIntoView({ block: 'center' });
      selectedYearRef.current.focus();
    }
  }, [isYearPickerOpen]);

  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))];
  }, [viewDate]);

  const today = useMemo(() => new Date(), []);
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });
  const currentYear = viewDate.getFullYear();

  // Generate range of years (1900 to maxDate/future)
  const minYear = minDate ? minDate.getFullYear() : 1900;
  const maxYear = maxDate ? maxDate.getFullYear() : today.getFullYear() + 20;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  const isDisabled = (day: Date) => (minDate && day < minDate) || (maxDate && day > maxDate);

  const handleYearWheel = (e: React.WheelEvent) => {
    // Stop propagation so mouse wheel over the year list does not scroll parent modal/page
    e.stopPropagation();
  };

  const selectDate = (day: Date) => {
    onChange?.(day);
    onChangeString?.(formatToYyyyMmDd(day));
    setIsOpen(false);
  };

  const selectYear = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setIsYearPickerOpen(false);
  };

  return (
    <div className={cn('mf-field', error && 'mf-field--error', className)} ref={rootRef}>
      {label && (
        <label className="mf-field__label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <div className="mf-field__control mf-datepicker">
        <input
          type="text"
          id={fieldId}
          name={name}
          disabled={disabled}
          value={isoValue}
          aria-label={ariaLabel}
          aria-invalid={!!error}
          aria-required={required}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          readOnly
          tabIndex={-1}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: 1,
            height: 1,
            margin: -1,
            border: 0,
            padding: 0,
            clip: 'rect(0 0 0 0)',
            overflow: 'hidden',
          }}
          onClick={() => !disabled && setIsOpen((v) => !v)}
          onChange={(e) => {
            const nextVal = e.target.value;
            if (onChangeString) onChangeString(nextVal);
            if (onChange) {
              const parsed = parseDateValue(nextVal);
              if (parsed) onChange(parsed);
            }
          }}
        />
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          className={cn(
            'mf-field__input',
            'mf-datepicker__trigger',
            !parsedValue && 'mf-datepicker__trigger--placeholder',
            isOpen && 'mf-datepicker__trigger--active',
            disabled && 'mf-datepicker__trigger--disabled'
          )}
          onClick={() => !disabled && setIsOpen((v) => !v)}
          onKeyDown={(e) => {
            if (onKeyDown) onKeyDown(e);
            if (e.key === 'ArrowDown' && !isOpen) {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-invalid={!!error}
          aria-required={required}
        >
          {parsedValue ? formatDate(parsedValue) : placeholder}
        </button>
        <span className="mf-field__icon mf-field__icon--right">
          <Calendar size={16} />
        </span>

      </div>
      {error ? (
        <p className="mf-field__message mf-field__message--error">{error}</p>
      ) : hint ? (
        <p className="mf-field__message">{hint}</p>
      ) : null}
      {typeof document !== 'undefined' &&
        isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className={cn(
              'mf-datepicker__popover',
              effectivePlacement === 'top' ? 'mf-datepicker__popover--top' : 'mf-datepicker__popover--bottom',
              effectiveAlign === 'right' ? 'mf-datepicker__popover--right' : 'mf-datepicker__popover--left'
            )}
            role="dialog"
            aria-label="Choose date"
          >
            {/* Header: Month and clickable Year button */}
            <div className="mf-datepicker__header">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              >
                <ChevronLeft size={14} />
              </button>

              <div className="mf-datepicker__header-center">
                <span className="mf-datepicker__header-month">{monthName}</span>
                <button
                  type="button"
                  className={cn('mf-datepicker__year-btn', isYearPickerOpen && 'mf-datepicker__year-btn--active')}
                  onClick={() => setIsYearPickerOpen((prev) => !prev)}
                  aria-expanded={isYearPickerOpen}
                  aria-label={`Select year, current year is ${currentYear}`}
                >
                  <span>{currentYear}</span>
                  <ChevronDown size={13} className={cn('mf-datepicker__year-chevron', isYearPickerOpen && 'mf-datepicker__year-chevron--open')} />
                </button>
              </div>

              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Stationary Calendar Area & Overlay Year List */}
            <div className="mf-datepicker__body">
              <div className="mf-datepicker__calendar" aria-hidden={isYearPickerOpen}>
                <div className="mf-datepicker__grid mf-datepicker__grid--labels">
                  {WEEKDAY_LABELS.map((d, i) => (
                    <span key={`${d}-${i}`}>{d}</span>
                  ))}
                </div>

                <div className="mf-datepicker__grid">
                  {cells.map((day, idx) => {
                    if (!day) {
                      return <span key={`empty-${idx}`} className="mf-datepicker__cell mf-datepicker__cell--empty" />;
                    }
                    const disabledDay = isDisabled(day);
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={disabledDay}
                        aria-disabled={disabledDay}
                        className={cn(
                          'mf-datepicker__cell',
                          isSameDay(day, today) && 'mf-datepicker__cell--today',
                          parsedValue && isSameDay(day, parsedValue) && 'mf-datepicker__cell--selected'
                        )}
                        onClick={() => selectDate(day)}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Independently Scrollable Year Selection Pane (Overlaid while month stays stationary) */}
              {isYearPickerOpen && (
                <div
                  role="listbox"
                  aria-label="Select year"
                  className="mf-datepicker__year-pane"
                  onWheel={handleYearWheel}
                >
                  {years.map((year) => {
                    const isSelected = year === currentYear;
                    const isYearDisabled = (maxDate && year > maxDate.getFullYear()) || (minDate && year < minDate.getFullYear());
                    return (
                      <button
                        key={year}
                        ref={isSelected ? selectedYearRef : undefined}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={isYearDisabled}
                        className={cn(
                          'mf-datepicker__year-item',
                          isSelected && 'mf-datepicker__year-item--selected',
                          year === today.getFullYear() && 'mf-datepicker__year-item--current'
                        )}
                        onClick={() => selectYear(year)}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
