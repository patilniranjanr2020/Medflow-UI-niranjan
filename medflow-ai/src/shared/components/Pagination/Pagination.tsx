import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../../core/utils/cn';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Optional "Showing X–Y of Z results" style label rendered on the left. */
  summary?: string;
  className?: string;
}

function getPageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  sorted.forEach((page, idx) => {
    if (idx > 0 && page - sorted[idx - 1] > 1) result.push('ellipsis');
    result.push(page);
  });
  return result;
}

/** Numbered pagination control with previous/next affordances and ellipsis collapsing. */
export function Pagination({ currentPage, totalPages, onPageChange, summary, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = getPageList(currentPage, totalPages);

  return (
    <nav className={cn('mf-pagination', className)} aria-label="Pagination">
      {summary && <span className="mf-pagination__summary">{summary}</span>}
      <div className="mf-pagination__controls">
        <button
          type="button"
          className="mf-pagination__nav"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="mf-pagination__ellipsis">
              <MoreHorizontal size={14} />
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={cn('mf-pagination__page', page === currentPage && 'mf-pagination__page--active')}
              aria-current={page === currentPage ? 'page' : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          className="mf-pagination__nav"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
