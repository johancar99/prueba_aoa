import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import Table, { type Column } from '../../../components/common/Table';
import MovementForm from '../components/MovementForm';
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

const PAGE_SIZE = 15;

const TypeBadge = ({ type }: { type: MovementType }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
      ${type === 'IN'
        ? 'bg-green-100 text-green-800'
        : 'bg-red-100 text-red-800'
      }`}
  >
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

const StockDelta = ({ movement }: { movement: MovementItem }) => {
  const delta = movement.newStock - movement.previousStock;
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <div className="flex items-center gap-1.5 tabular-nums">
        <span className="text-gray-400 text-xs w-14 shrink-0">Antes:</span>
        <span className="font-medium text-gray-700">{formatQuantity(movement.previousStock)}</span>
      </div>
      <div className="flex items-center gap-1.5 tabular-nums">
        <span className="text-gray-400 text-xs w-14 shrink-0">Después:</span>
        <span
          className={`font-semibold ${
            delta >= 0 ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {formatQuantity(movement.newStock)}
        </span>
        {movement.lowStockAlert && (
          <span
            title="Stock bajo mínimo"
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800"
          >
            ⚠ Bajo
          </span>
        )}
      </div>
    </div>
  );
};

const KardexPage = () => {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  /** Filtro por producto (server-side sobre `productId`). Inicializa desde URL ?productId=xxx */
  const [productFilterId, setProductFilterId] = useState(() => searchParams.get('productId') ?? '');
  const [typeFilter, setTypeFilter] = useState<MovementType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const movementsVars = useMemo<GetGlobalMovementsVars>(() => {
    const filters: NonNullable<GetGlobalMovementsVars['filters']> = {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      ...(productFilterId ? { productId: productFilterId } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    };
    return { filters };
  }, [page, productFilterId, typeFilter, startDate, endDate]);

  const { data, loading, error, refetch } = useQuery<
    GetGlobalMovementsData,
    GetGlobalMovementsVars
  >(GET_GLOBAL_MOVEMENTS, {
    variables: movementsVars,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { data: productsData } = useQuery<GetProductsData, GetProductsVars>(GET_PRODUCTS, {
    variables: { filters: { limit: 1000 } },
    fetchPolicy: 'cache-first',
  });

  const productMap = useMemo(() => {
    const map: Record<string, { name: string; code: string }> = {};
    productsData?.products.items.forEach((p) => {
      map[p.id] = { name: p.name, code: p.code };
    });
    return map;
  }, [productsData]);

  const items = data?.getGlobalMovements.items ?? [];
  const total = data?.getGlobalMovements.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetPage = useCallback(() => setPage(1), []);

  const hasFilters = Boolean(productFilterId || typeFilter || startDate || endDate);

  const clearFilters = () => {
    setProductFilterId('');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const columns = useMemo<Column<MovementItem>[]>(
    () => [
      {
        key: 'createdAt',
        header: 'Fecha',
        render: (m) => (
          <span className="text-sm text-gray-600 tabular-nums whitespace-nowrap">
            {formatDateTime(m.createdAt)}
          </span>
        ),
      },
      {
        key: 'product',
        header: 'Producto',
        render: (m) => {
          // product null = resolver no lo devolvió (eliminado en backend)
          // productMap solo contiene activos, así que tampoco estará ahí
          const prod = m.product ?? productMap[m.productId] ?? null;
          const isDeleted = prod === null || prod.status === false;
          return (
            <div>
              <div className="flex items-center gap-1.5">
                <p className={`font-medium text-sm ${isDeleted ? 'text-gray-400' : 'text-gray-900'}`}>
                  {prod?.name ?? '(Producto eliminado)'}
                </p>
                {isDeleted && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
                    Eliminado
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono">
                {prod?.code ?? m.productId.slice(-8).toUpperCase()}
              </p>
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
          <span
            className={`font-bold tabular-nums text-sm ${
              m.type === 'IN' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {m.type === 'IN' ? '+' : '−'}
            {formatQuantity(m.quantity)}
          </span>
        ),
      },
      {
        key: 'previousStock',
        header: 'Stock anterior',
        render: (m) => (
          <span className="tabular-nums text-sm text-gray-600">
            {formatQuantity(m.previousStock)}
          </span>
        ),
      },
      {
        key: 'newStock',
        header: 'Stock resultante',
        render: (m) => <StockDelta movement={m} />,
      },
      {
        key: 'unitPrice',
        header: 'Precio unit.',
        render: (m) => (
          <span className="tabular-nums text-sm text-gray-700">
            {formatCurrencyCOP(m.unitPrice ?? 0)}
          </span>
        ),
      },
      {
        key: 'user',
        header: 'Usuario',
        render: (m) => {
          const userName = m.user?.name ?? m.userId.slice(-6).toUpperCase();
          return (
            <span className="text-xs text-gray-500 font-mono">{userName}</span>
          );
        },
      },
      {
        key: 'observations',
        header: 'Observación',
        render: (m) => (
          <span className="text-xs text-gray-500 max-w-[180px] block truncate" title={m.observations ?? ''}>
            {m.observations ?? '—'}
          </span>
        ),
      },
    ],
    [productMap],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Movimientos & Kardex</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Historial completo de entradas y salidas del inventario
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white
                     text-sm font-semibold rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Registrar movimiento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <select
                value={productFilterId}
                onChange={(e) => { setProductFilterId(e.target.value); resetPage(); }}
                className="w-full appearance-none pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {/* Solo productos activos: el backend filtra status=true por defecto */}
                <option value="">Todos los productos</option>
                {productsData?.products.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as MovementType | ''); resetPage(); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="IN">Entradas</option>
              <option value="OUT">Salidas</option>
            </select>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); resetPage(); }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); resetPage(); }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700
                           border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>

        <Table
          columns={columns}
          data={items}
          keyExtractor={(m) => m.id}
          loading={loading}
          error={error ? `Error al cargar movimientos: ${error.message}` : undefined}
          emptyMessage="No se encontraron movimientos"
          emptyIcon={
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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

      <MovementForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => void refetch()}
      />
    </div>
  );
};

export default KardexPage;
