import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { Page } from '../../../core/api/client';
import { useApiResource } from '../../hooks/useApiResource';
import { Alert } from '../Alert/Alert';
import { Button } from '../Button/Button';
import { Card, CardBody } from '../Card/Card';
import { Loading } from '../Loading/Loading';
import { PageHeader } from '../PageHeader/PageHeader';
import { Pagination } from '../Pagination/Pagination';
import { SearchBar } from '../SearchBar/SearchBar';
import { Table, type TableColumn } from '../Table/Table';
import './DataPage.css';

interface DataPageProps<T> {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Rendered between the header and the table — filters, toggles, counters. */
  toolbar?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  columns: TableColumn<T>[];
  rowKey: (row: T) => string | number;
  load: (params: { page: number; size: number; query: string }) => Promise<Page<T>>;
  /** Extra values that should trigger a reload when they change (filters, toggles). */
  deps?: unknown[];
  emptyMessage?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

/**
 * The shape every module list screen shares: header, optional search, a paged table and
 * honest loading/error states. Keeps each module page down to its columns and filters.
 */
export function DataPage<T>({
  title,
  description,
  actions,
  toolbar,
  searchable = true,
  searchPlaceholder = 'Search…',
  columns,
  rowKey,
  load,
  deps = [],
  emptyMessage,
  pageSize = 10,
  onRowClick,
}: DataPageProps<T>) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  const { data, error, isLoading, reload } = useApiResource(
    () => load({ page, size: pageSize, query: term }),
    [page, term, pageSize, ...deps],
  );

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(0);
    setTerm(search.trim());
  }

  return (
    <div className="mf-data-page">
      <PageHeader title={title} description={description} actions={actions} />

      {(searchable || toolbar) && (
        <div className="mf-data-page__toolbar">
          {searchable && (
            <form onSubmit={submitSearch} className="mf-data-page__search">
              <SearchBar
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </form>
          )}
          {toolbar}
        </div>
      )}

      {error && (
        <Alert tone="danger" title="Could not load this page">
          {error}
          <div className="mf-data-page__retry">
            <Button size="sm" variant="outline" onClick={reload}>
              Try again
            </Button>
          </div>
        </Alert>
      )}

      <Card padding="lg">
        <CardBody>
          {isLoading && !data ? (
            <Loading label={`Loading ${title.toLowerCase()}…`} />
          ) : (
            <>
              <Table
                columns={columns}
                data={data?.content ?? []}
                rowKey={rowKey}
                onRowClick={onRowClick}
                emptyMessage={emptyMessage ?? 'Nothing here yet.'}
              />
              {data && data.totalPages > 1 && (
                <div className="mf-data-page__pagination">
                  <Pagination
                    currentPage={page + 1}
                    totalPages={data.totalPages}
                    onPageChange={(next) => setPage(next - 1)}
                    summary={`Showing ${data.content.length} of ${data.totalElements}`}
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
