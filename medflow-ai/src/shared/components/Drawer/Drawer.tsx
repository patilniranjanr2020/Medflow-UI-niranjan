import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Drawer.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Drawer({ isOpen, onClose, title, actions, children }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="mf-drawer-overlay" onMouseDown={onClose}>
      <aside className="mf-drawer" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mf-drawer__header">
          {title && <h3 className="mf-drawer__title">{title}</h3>}
          <div className="mf-drawer__header-actions">
            {actions}
            <button className="mf-drawer__close" onClick={onClose} aria-label="Close panel">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="mf-drawer__body">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
