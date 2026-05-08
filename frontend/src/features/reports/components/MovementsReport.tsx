import { useState, useMemo, useCallback } from 'react';
import { useQuery, useApolloClient } from '@apollo/client';
import { Link } from 'react-router-dom';
import Table, { type Column } from '../../../components/common/Table';
import {
  GET_GLOBAL_MOVEMENTS,
  type GetGlobalMovementsData,
  type GetGlobalMovementsVars,
  type MovementItem,
  type MovementType,
} from '../../../api/queries/kardex.queries';
import {
  GET_PRODUCTS,
  type GetProductsData,
  type GetProductsVars,
} from '../../../api/queries/products.queries';
import { formatCurrencyCOP, formatQuantity, formatDateTime } from '../../../utils/format';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';

const PAGE_SIZE = 15;

// Convierte "YYYY-MM-DD" → ISO inicio/fin de día en UTC
function toISOStart(date: string) { return date ? `${date}T00:00:00.000Z` : undefined; }
function toISOEnd(date: string)   { return date ? `${date}T23:59:59.999Z` : undefined; }

// ─── Export helpers ───────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { header: 'Fecha',          dataKey: 'date' },
  { header: 'Producto',       dataKey: 'product' },
  { header: 'Código',         dataKey: 'code' },
  { header: 'Tipo',           dataKey: 'type' },
  { header: 'Cantidad',       dataKey: 'quantity' },
  { header: 'Stock Anterior', dataKey: 'previousStock' },
  { header: 'Stock Nuevo',    dataKey: 'newStock' },
  { header: 'Precio Unit.',   dataKey: 'unitPrice' },
  { header: 'Usuario',        dataKey: 'user' },
  { header: 'Observaciones',  dataKey: 'observations' },
];

function buildExportRows(items: MovementItem[]) {
  return items.map((m) => ({
    date:          formatDateTime(m.createdAt),
    product:       m.product?.name ?? '(Eliminado)',
    code:          m.product?.code ?? m.productId.slice(-8).toUpperCase(),
    type:          m.type === 'IN' ? 'Entrada' : 'Salida',
    quantity:      m.quantity,
    previousStock: m.previousStock,
    newStock:      m.newStock,
    unitPrice:     m.unitPrice != null ? formatCurrencyCOP(m.unitPrice) : '—',
    user:          m.user?.name ?? '—',
    observations:  m.observations ?? '—',
  }));
}

// ─── Small sub-components ─────────────────────────────────────────────────────

const TypeBadge = ({ type }: { type: MovementType }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
    type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }`}>
    {type === 'IN' ? (
      <>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Entrada
      </>
    ) : (
      <>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
        Salida
      </>
    )}
  </span>
);

// ─── Component ────────────────────────────────────────────────────────────────

const MovementsReport = () => {
  const [page, setPage] = useState(1);
  const [productFilterId, setProductFilterId] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | ''>('');
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate,   setEndDate]   = useState(`${currentYear}-12-31`);

  const resetPage = useCallback(() => setPage(1), []);

  const movementsVars = useMemo<GetGlobalMovementsVars>(() => ({
    filters: {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      ...(productFilterId ? { productId: productFilterId } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(startDate ? { startDate: toISOStart(startDate) } : {}),
      ...(endDate   ? { endDate:   toISOEnd(endDate)     } : {}),
    },
  }), [page, productFilterId, typeFilter, startDate, endDate]);

  const { data, loading, error } = useQuery<GetGlobalMovementsData, GetGlobalMovementsVars>(
    GET_GLOBAL_MOVEMENTS,
    { variables: movementsVars, fetchPolicy: 'network-only', notifyOnNetworkStatusChange: true },
  );

  const client = useApolloClient();

  const { data: productsData } = useQuery<GetProductsData, GetProductsVars>(GET_PRODUCTS, {
    variables: { filters: { limit: 100 } },
    fetchPolicy: 'cache-first',
  });

  const items = data?.getGlobalMovements.items ?? [];
  const total = data?.getGlobalMovements.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const totalsInPeriod = useMemo(() => {
    const entries = items.filter((m) => m.type === 'IN').reduce((s, m) => s + m.quantity, 0);
    const exits = items.filter((m) => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0);
    return { entries, exits };
  }, [items]);

  const handleExport = async (format: 'pdf' | 'excel') => {
    const result = await client.query<GetGlobalMovementsData, GetGlobalMovementsVars>({
      query: GET_GLOBAL_MOVEMENTS,
      fetchPolicy: 'network-only',
      variables: {
        filters: {
          limit: 100,
          offset: 0,
          ...(productFilterId ? { productId: productFilterId } : {}),
          ...(typeFilter ? { type: typeFilter } : {}),
          ...(startDate ? { startDate: toISOStart(startDate) } : {}),
          ...(endDate   ? { endDate:   toISOEnd(endDate)     } : {}),
        },
      },
    });
    const allItems = result.data?.getGlobalMovements.items ?? items;
    const rows = buildExportRows(allItems);
    const title = `Movimientos del ${startDate} al ${endDate}`;
    if (format === 'pdf') {
      exportToPDF(title, EXPORT_COLUMNS, rows, `movimientos-${startDate}-${endDate}`);
    } else {
      exportToExcel('Movimientos', EXPORT_COLUMNS, rows, `movimientos-${startDate}-${endDate}`);
    }
  };

  const hasFilters = Boolean(productFilterId || typeFilter);

  const columns = useMemo<Column<MovementItem>[]>(() => [
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (m) => (
        <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap">
          {formatDateTime(m.createdAt)}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Producto',
      render: (m) => {
        const deleted = !m.product || m.product.status === false;
        return (
          <div className="flex items-center gap-2">
            <div className="min-w-0">
              <p className={`font-medium text-sm truncate ${deleted ? 'text-gray-400' : 'text-gray-900'}`}>
                {m.product?.name ?? '(Eliminado)'}
              </p>
              <p className="text-xs font-mono text-gray-400">
                {m.product?.code ?? m.productId.slice(-8).toUpperCase()}
              </p>
            </div>
            {!deleted && (
              <Link
                to={`/kardex?productId=${m.productId}`}
                title="Ver en Kardex"
                className="shrink-0 p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            )}
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (m) => <TypeBadge type={m.type} />,
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (m) => (
        <span className={`font-bold tabular-nums text-sm ${m.type === 'IN' ? 'text-green-700' : 'text-red-700'}`}>
          {m.type === 'IN' ? '+' : '−'}{formatQuantity(m.quantity)}
        </span>
      ),
    },
    {
      key: 'previousStock',
      header: 'Antes',
      render: (m) => <span className="tabular-nums text-sm text-gray-500">{formatQuantity(m.previousStock)}</span>,
    },
    {
      key: 'newStock',
      header: 'Después',
      render: (m) => (
        <div className="flex items-center gap-1.5">
          <span className={`tabular-nums text-sm font-semibold ${
            m.newStock > m.previousStock ? 'text-green-700' : 'text-red-700'
          }`}>
            {formatQuantity(m.newStock)}
          </span>
          {m.lowStockAlert && (
            <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">⚠</span>
          )}
        </div>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Precio',
      render: (m) => (
        <span className="tabular-nums text-xs text-gray-600">
          {m.unitPrice != null ? formatCurrencyCOP(m.unitPrice) : '—'}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Usuario',
      render: (m) => (
        <span className="text-xs text-gray-500 font-mono">
          {m.user?.name ?? m.userId.slice(-6).toUpperCase()}
        </span>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      {/* Period summary bar */}
      {!loading && total > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="px-2 sm:px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-blue-600 font-medium leading-tight">Total período</p>
            <p className="text-base sm:text-lg font-bold text-blue-800 tabular-nums">{total}</p>
          </div>
          <div className="px-2 sm:px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-green-600 font-medium leading-tight">Entradas</p>
            <p className="text-base sm:text-lg font-bold text-green-800 tabular-nums">+{formatQuantity(totalsInPeriod.entries)}</p>
          </div>
          <div className="px-2 sm:px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-red-600 font-medium leading-tight">Salidas</p>
            <p className="text-base sm:text-lg font-bold text-red-800 tabular-nums">−{formatQuantity(totalsInPeriod.exits)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* Date range */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <label className="text-xs text-gray-500 whitespace-nowrap w-10 sm:w-auto">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); resetPage(); }}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <label className="text-xs text-gray-500 whitespace-nowrap w-10 sm:w-auto">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); resetPage(); }}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Product selector */}
            <div className="relative flex-1 min-w-[160px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <select
                value={productFilterId}
                onChange={(e) => { setProductFilterId(e.target.value); resetPage(); }}
                className="w-full appearance-none pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los productos</option>
                {productsData?.products.items.map((p) => (
                  <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                ))}
              </select>
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as MovementType | ''); resetPage(); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="IN">Entradas</option>
              <option value="OUT">Salidas</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={() => { setProductFilterId(''); setTypeFilter(''); resetPage(); }}
                className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar
              </button>
            )}

            {/* Export buttons */}
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto shrink-0">
              <button
                type="button"
                onClick={() => void handleExport('excel')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                type="button"
                onClick={() => void handleExport('pdf')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
            </div>
          </div>
        </div>

        <Table
          columns={columns}
          data={items}
          keyExtractor={(m) => m.id}
          loading={loading}
          error={error ? `Error al cargar movimientos: ${error.message}` : undefined}
          emptyMessage={
            startDate || endDate
              ? `Sin movimientos del ${startDate} al ${endDate}`
              : 'No se encontraron movimientos'
          }
          emptyIcon={
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          pagination={{
            page,
            totalPages,
            total,
            pageSize: PAGE_SIZE,
            entityLabel: 'movimientos',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </div>
    </div>
  );
};

export default MovementsReport;
