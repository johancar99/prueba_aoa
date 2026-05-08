import type { ReactNode } from 'react';
import Pagination from './Pagination';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  /** Función de render personalizada. Si se omite, usa String(row[key]). */
  render?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TablePaginationConfig {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  entityLabel?: string;
  onPrev: () => void;
  onNext: () => void;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  error?: string;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  pagination?: TablePaginationConfig;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

const SkeletonRow = ({ cols }: { cols: number }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div
          className={`h-4 bg-gray-200 rounded animate-pulse ${i === 0 ? 'w-36' : 'w-full max-w-[180px]'}`}
        />
      </td>
    ))}
  </tr>
);

// ─── Default empty icon ───────────────────────────────────────────────────────

const DefaultEmptyIcon = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  skeletonRows = 6,
  error,
  emptyMessage = 'No se encontraron registros',
  emptyIcon,
  pagination,
}: TableProps<T>) {
  const isEmpty = !loading && !error && data.length === 0;

  return (
    <div className="overflow-hidden">
      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-semibold text-gray-600 uppercase text-xs tracking-wide whitespace-nowrap ${col.headerClassName ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {/* Skeleton */}
            {loading && Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))}

            {/* Empty state */}
            {isEmpty && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    {emptyIcon ?? <DefaultEmptyIcon />}
                    <p className="font-medium text-gray-500">{emptyMessage}</p>
                    <p className="text-xs">Intenta ajustar los filtros de búsqueda</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading && data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-blue-50/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && pagination.total > 0 && (
        <Pagination {...pagination} />
      )}
    </div>
  );
}

export default Table;
