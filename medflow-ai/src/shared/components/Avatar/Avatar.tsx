import { cn } from '../../../core/utils/cn';
import './Avatar.css';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLSpanElement>) => void;
  ariaLabel?: string;
  tabIndex?: number;
  interactive?: boolean;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PALETTE = ['var(--mf-blue-600)', 'var(--mf-amber-500)', 'var(--mf-coral-500)', 'var(--mf-green-500)', 'var(--mf-ink-700)', 'var(--mf-blue-700)'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({
  name,
  size = 'md',
  status,
  className,
  onClick,
  ariaLabel,
  tabIndex,
  interactive = Boolean(onClick),
}: AvatarProps) {
  const circle = (
    <>
      <span className="mf-avatar__circle" style={{ background: colorForName(name) }}>
        {initialsFromName(name)}
      </span>
      {status && <span className={cn('mf-avatar__status', `mf-avatar__status--${status}`)} />}
    </>
  );

  if (onClick || interactive) {
    return (
      <button
        type="button"
        className={cn('mf-avatar', 'mf-avatar--interactive', `mf-avatar--${size}`, className)}
        onClick={onClick}
        aria-label={ariaLabel ?? `Avatar for ${name}`}
        tabIndex={tabIndex ?? 0}
      >
        {circle}
      </button>
    );
  }

  return (
    <span
      className={cn('mf-avatar', `mf-avatar--${size}`, className)}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
    >
      {circle}
    </span>
  );
}
