import { useState, useMemo } from 'react';
import { useQuery, useApolloClient } from '@apollo/client';
import Table, { type Column } from '../../../components/common/Table';
import {
  GET_PRODUCTS,
  type GetProductsData,
  type GetProductsVars,
  type ProductItem,
} from '../../../api/queries/products.queries';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatCurrencyCOP, formatQuantity } from '../../../utils/format';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';

const PAGE_SIZE = 15;

// ─── Sub-components ───────────────────────────────────────────────────────────

const StockCell = ({ product }: { product: ProductItem }) => {
  const critical = product.stock === 0;
  const low = product.stock > 0 && product.stock <= product.minStock;
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`font-semibold tabular-nums ${
          critical ? 'text-red-700' : low ? 'text-amber-700' : 'text-gray-900'
        }`}
      >
        {formatQuantity(product.stock)}
      </span>
      {critical && (
        <span className="inline-flex w-fit px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
          SIN STOCK
        </span>
      )}
      {low && (
        <span className="inline-flex w-fit px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
          BAJO MÍN.
        </span>
      )}
    </div>
  );
};

// ─── Export helpers ───────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { header: 'Código',       dataKey: 'code' },
  { header: 'Producto',     dataKey: 'name' },
  { header: 'Categoría',    dataKey: 'category' },
  { header: 'Stock',        dataKey: 'stock' },
  { header: 'Stock Mínimo', dataKey: 'minStock' },
  { header: 'P. Venta',     dataKey: 'salePrice' },
  { header: 'PPP',          dataKey: 'averagePrice' },
  { header: 'Valor Stock',  dataKey: 'stockValue' },
  { header: 'Estado',       dataKey: 'status' },
];

function buildExportRows(items: ProductItem[]) {
  return items.map((p) => ({
    code:         p.code,
    name:         p.name,
    category:     p.category ?? '—',
    stock:        p.stock,
    minStock:     p.minStock,
    salePrice:    formatCurrencyCOP(p.salePrice),
    averagePrice: formatCurrencyCOP(p.averagePrice),
    stockValue:   formatCurrencyCOP(p.stock * p.averagePrice),
    status:       p.status ? 'Activo' : 'Inactivo',
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

const InventoryTable = () => {
  const [page, setPage] = useState(1);
  const [nameInput, setName] = useState('');
  const [categoryInput, setCategory] = useState('');
  const debouncedName = useDebounce(nameInput, 400);
  const debouncedCategory = useDebounce(categoryInput, 400);

  const filters = useMemo(() => ({
    ...(debouncedName.trim() ? { name: debouncedName.trim() } : {}),
    ...(debouncedCategory.trim() ? { category: debouncedCategory.trim() } : {}),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }), [debouncedName, debouncedCategory, page]);

  const client = useApolloClient();

  const { data, loading, error } = useQuery<GetProductsData, GetProductsVars>(GET_PRODUCTS, {
    variables: { filters },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const items = data?.products.items ?? [];
  const total = data?.products.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const totalValue = useMemo(
    () => items.reduce((sum, p) => sum + p.stock * p.averagePrice, 0),
    [items],
  );

  const columns = useMemo<Column<ProductItem>[]>(() => [
    {
      key: 'code',
      header: 'Código',
      render: (p) => <span className="font-mono text-sm font-semibold text-gray-800">{p.code}</span>,
    },
    {
      key: 'name',
      header: 'Producto',
      render: (p) => (
        <div>
          <p className="font-medium text-gray-900">{p.name}</p>
          {p.category && <p className="text-xs text-gray-500">{p.category}</p>}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p) => <StockCell product={p} />,
    },
    {
      key: 'minStock',
      header: 'Mín.',
      render: (p) => <span className="tabular-nums text-sm text-gray-600">{formatQuantity(p.minStock)}</span>,
    },
    {
      key: 'salePrice',
      header: 'P. Venta',
      render: (p) => <span className="tabular-nums text-sm font-medium text-gray-800">{formatCurrencyCOP(p.salePrice)}</span>,
    },
    {
      key: 'averagePrice',
      header: 'PPP',
      render: (p) => <span className="tabular-nums text-xs text-gray-500">{formatCurrencyCOP(p.averagePrice)}</span>,
    },
    {
      key: 'stockValue',
      header: 'Valor Stock',
      render: (p) => (
        <span className="tabular-nums text-sm font-semibold text-green-700">
          {formatCurrencyCOP(p.stock * p.averagePrice)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (p) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
          p.status ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'
        }`}>
          {p.status ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ], []);

  const handleExport = async (format: 'pdf' | 'excel') => {
    const result = await client.query<GetProductsData, GetProductsVars>({
      query: GET_PRODUCTS,
      fetchPolicy: 'network-only',
      variables: {
        filters: {
          ...(debouncedName.trim() ? { name: debouncedName.trim() } : {}),
          ...(debouncedCategory.trim() ? { category: debouncedCategory.trim() } : {}),
          limit: 100,
          offset: 0,
        },
      },
    });
    const exportItems = result.data?.products.items ?? items;
    const rows = buildExportRows(exportItems);
    const title = 'Reporte de Inventario Actual';
    if (format === 'pdf') {
      exportToPDF(title, EXPORT_COLUMNS, rows, 'inventario-aoa');
    } else {
      exportToExcel('Inventario', EXPORT_COLUMNS, rows, 'inventario-aoa');
    }
  };

  const hasFilters = Boolean(nameInput || categoryInput);

  return (
    <div className="space-y-4">
      {/* Value summary bar */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm text-green-700 font-medium">
            Valor del inventario (página actual, PPP):
          </span>
          <span className="font-bold text-green-800 tabular-nums text-sm">
            {formatCurrencyCOP(totalValue)}
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filters + Export */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={nameInput}
              onChange={(e) => { setName(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            type="text"
            placeholder="Categoría..."
            value={categoryInput}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="flex-1 sm:max-w-[160px] px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setName(''); setCategory(''); setPage(1); }}
              className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Limpiar
            </button>
          )}

          <div className="flex gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => void handleExport('excel')}
              title="Exportar a Excel"
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
              title="Exportar a PDF"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>

        <Table
          columns={columns}
          data={items}
          keyExtractor={(p) => p.id}
          loading={loading}
          error={error ? `Error al cargar inventario: ${error.message}` : undefined}
          emptyMessage="No se encontraron productos"
          emptyIcon={
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          pagination={{
            page,
            totalPages,
            total,
            pageSize: PAGE_SIZE,
            entityLabel: 'productos',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </div>
    </div>
  );
};

export default InventoryTable;
