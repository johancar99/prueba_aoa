interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  entityLabel?: string;
  onPrev: () => void;
  onNext: () => void;
}

const Pagination = ({
  page,
  totalPages,
  total,
  pageSize,
  entityLabel = 'registros',
  onPrev,
  onNext,
}: PaginationProps) => {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
      <p className="text-sm text-gray-500">
        Mostrando{' '}
        <span className="font-medium text-gray-700">{from}–{to}</span> de{' '}
        <span className="font-medium text-gray-700">{total}</span> {entityLabel}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white
                     border border-gray-300 rounded-lg hover:bg-gray-50
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Anterior
        </button>

        <span className="px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg select-none">
          {page} / {totalPages || 1}
        </span>

        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white
                     border border-gray-300 rounded-lg hover:bg-gray-50
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
