import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import {
  LOW_STOCK_PRODUCTS,
  type LowStockProductsData,
  type LowStockProductItem,
} from '../../../api/queries/products.queries';
import { formatQuantity } from '../../../utils/format';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';

// ─── Export helpers ───────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { header: 'Código',       dataKey: 'code' },
  { header: 'Producto',     dataKey: 'name' },
  { header: 'Stock Actual', dataKey: 'stock' },
  { header: 'Stock Mínimo', dataKey: 'minStock' },
  { header: 'Déficit',      dataKey: 'deficit' },
  { header: 'Estado',       dataKey: 'status' },
];

function buildExportRows(items: LowStockProductItem[]) {
  return items.map((p) => ({
    code:    p.code,
    name:    p.name,
    stock:   p.stock,
    minStock: p.minStock,
    deficit: p.minStock - p.stock,
    status:  p.stock === 0 ? 'SIN STOCK' : 'BAJO MÍNIMO',
  }));
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

const AlertRow = ({ product }: { product: LowStockProductItem }) => {
  const critical = product.stock === 0;
  const pct = product.minStock > 0 ? Math.round((product.stock / product.minStock) * 100) : 0;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-lg border ${
      critical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${critical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">{product.name}</span>
            <span className="font-mono text-xs text-gray-400">{product.code}</span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-1.5 w-full max-w-[200px]">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  critical ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-yellow-400'
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{pct}% del mínimo requerido</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 ml-5 sm:ml-0">
        <div className="text-right">
          <p className={`font-bold tabular-nums text-base ${critical ? 'text-red-700' : 'text-amber-700'}`}>
            {formatQuantity(product.stock)}
          </p>
          <p className="text-xs text-gray-500">mín. {formatQuantity(product.minStock)}</p>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
          critical ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {critical ? 'SIN STOCK' : 'BAJO MÍN.'}
        </span>

        <Link
          to={`/kardex?productId=${product.id}`}
          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Ver movimientos en Kardex"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const AlertSkeleton = () => (
  <div className="animate-pulse h-16 bg-gray-100 rounded-lg border border-gray-200" />
);

// ─── Component ────────────────────────────────────────────────────────────────

const LowStockPanel = () => {
  const { data, loading, error } = useQuery<LowStockProductsData>(LOW_STOCK_PRODUCTS, {
    fetchPolicy: 'cache-and-network',
  });

  const items = data?.lowStockProducts ?? [];
  const critical = items.filter((p) => p.stock === 0);
  const low = items.filter((p) => p.stock > 0);

  const handleExport = (format: 'pdf' | 'excel') => {
    const rows = buildExportRows(items);
    const title = 'Reporte de Productos Bajo Stock Mínimo';
    if (format === 'pdf') {
      exportToPDF(title, EXPORT_COLUMNS, rows, 'bajo-stock-aoa');
    } else {
      exportToExcel('Bajo Stock', EXPORT_COLUMNS, rows, 'bajo-stock-aoa');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {!loading && items.length > 0 && (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {critical.length} sin stock
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {low.length} bajo mínimo
              </span>
            </>
          )}
        </div>

        {!loading && items.length > 0 && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExport('excel')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Error al cargar datos: {error.message}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <AlertSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-600">¡Inventario saludable!</p>
          <p className="text-sm text-gray-400 mt-1">Todos los productos tienen stock suficiente.</p>
        </div>
      )}

      {/* Critical section */}
      {!loading && critical.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Sin stock ({critical.length})
          </p>
          <div className="space-y-2">
            {critical.map((p) => <AlertRow key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* Low stock section */}
      {!loading && low.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Bajo mínimo ({low.length})
          </p>
          <div className="space-y-2">
            {low.map((p) => <AlertRow key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStockPanel;
