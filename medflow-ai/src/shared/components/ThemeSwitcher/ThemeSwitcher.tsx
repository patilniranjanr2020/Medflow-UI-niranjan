import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '../../providers/ThemeContext';
import { cn } from '../../../core/utils/cn';
import './ThemeSwitcher.css';

export interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { mode, setMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lightOptionRef = useRef<HTMLButtonElement>(null);
  const darkOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'dark') {
        darkOptionRef.current?.focus();
      } else {
        lightOptionRef.current?.focus();
      }
    }
  }, [isOpen, mode]);

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (document.activeElement === lightOptionRef.current) {
        darkOptionRef.current?.focus();
      } else {
        lightOptionRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const selectMode = (newMode: 'light' | 'dark') => {
    setMode(newMode);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const currentLabel = mode === 'dark' ? 'Dark' : 'Light';

  return (
    <div className={cn('mf-theme-switcher', className)} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'mf-theme-switcher__trigger',
          isOpen && 'mf-theme-switcher__trigger--open'
        )}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-label={`Theme: ${currentLabel}`}
        title={`Theme: ${currentLabel}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="mf-theme-menu"
      >
        {mode === 'dark' ? (
          <Moon size={18} className="mf-theme-switcher__icon" aria-hidden="true" />
        ) : (
          <Sun size={18} className="mf-theme-switcher__icon" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div
          id="mf-theme-menu"
          className="mf-theme-switcher__panel"
          role="menu"
          aria-label="Theme options"
          onKeyDown={handleMenuKeyDown}
        >
          <button
            ref={lightOptionRef}
            type="button"
            role="menuitemradio"
            aria-checked={mode === 'light'}
            className={cn(
              'mf-theme-switcher__item',
              mode === 'light' && 'mf-theme-switcher__item--active'
            )}
            onClick={() => selectMode('light')}
          >
            <span className="mf-theme-switcher__item-content">
              <Sun size={15} aria-hidden="true" />
              <span>Light</span>
            </span>
            {mode === 'light' && (
              <Check size={14} className="mf-theme-switcher__check" aria-hidden="true" />
            )}
          </button>

          <button
            ref={darkOptionRef}
            type="button"
            role="menuitemradio"
            aria-checked={mode === 'dark'}
            className={cn(
              'mf-theme-switcher__item',
              mode === 'dark' && 'mf-theme-switcher__item--active'
            )}
            onClick={() => selectMode('dark')}
          >
            <span className="mf-theme-switcher__item-content">
              <Moon size={15} aria-hidden="true" />
              <span>Dark</span>
            </span>
            {mode === 'dark' && (
              <Check size={14} className="mf-theme-switcher__check" aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
