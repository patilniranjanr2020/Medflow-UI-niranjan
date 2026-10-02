import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../../core/utils/cn';
import './Toast.css';

type ToastTone = 'info' | 'success' | 'warning' | 'danger';

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. Pass 0 to require manual dismissal. */
  duration?: number;
}

interface ToastRecord extends Required<Pick<ToastInput, 'title' | 'tone' | 'duration'>> {
  id: number;
  description?: string;
}

interface ToastContextValue {
  show: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

let idSeq = 0;

/**
 * App-wide toast host. Mount once near the root (see AppProviders) and call
 * `useToast().show(...)` from anywhere to queue a transient notification.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    ({ title, description, tone = 'info', duration = 4000 }: ToastInput) => {
      const id = ++idSeq;
      setToasts((prev) => [...prev, { id, title, description, tone, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="mf-toast-stack" role="region" aria-label="Notifications">
          {toasts.map((toast) => {
            const Icon = TONE_ICON[toast.tone];
            return (
              <div key={toast.id} className={cn('mf-toast', `mf-toast--${toast.tone}`)} role="status">
                <span className="mf-toast__icon">
                  <Icon size={17} />
                </span>
                <div className="mf-toast__body">
                  <p className="mf-toast__title">{toast.title}</p>
                  {toast.description && <p className="mf-toast__description">{toast.description}</p>}
                </div>
                <button type="button" className="mf-toast__close" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/** Access the toast host to queue notifications: `useToast().show({ title, tone })`. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { show: () => {} };
  return ctx;
}
