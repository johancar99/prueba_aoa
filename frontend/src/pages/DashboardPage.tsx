import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import {
  PRODUCTS_SUMMARY,
  INVENTORY_TOTAL_VALUE,
  LOW_STOCK_PRODUCTS,
  type ProductsSummaryData,
  type ProductsSummaryVars,
  type InventoryTotalValueData,
  type LowStockProductsData,
  type LowStockProductItem,
} from '../api/queries/products.queries';
import {
  GET_GLOBAL_MOVEMENTS,
  type GetGlobalMovementsData,
  type GetGlobalMovementsVars,
  type MovementItem,
} from '../api/queries/kardex.queries';
import { formatCurrencyCOP, formatQuantity, formatDateTime } from '../utils/format';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red';
}

const colorMap: Record<KpiCardProps['color'], { bg: string; icon: string; text: string }> = {
  blue:  { bg: 'bg-blue-50',  icon: 'bg-blue-100 text-blue-600',  text: 'text-blue-700' },
  green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-700' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700' },
  red:   { bg: 'bg-red-50',   icon: 'bg-red-100 text-red-600',     text: 'text-red-700' },
};

const KpiCard = ({ label, value, sub, icon, color }: KpiCardProps) => {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} rounded-xl p-5 border border-white shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`mt-1 text-lg sm:text-2xl font-bold ${c.text} tabular-nums truncate`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </div>
        <div className={`${c.icon} p-2.5 rounded-lg shrink-0`}>{icon}</div>
      </div>
    </div>
  );
};

const LowStockRow = ({ product }: { product: LowStockProductItem }) => {
  const critical = product.stock === 0;
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-0 px-3 sm:px-4 py-3 rounded-lg border text-sm
        ${critical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${critical ? 'bg-red-500' : 'bg-amber-500'}`} />
        <div className="min-w-0">
          <span className="font-medium text-gray-800 truncate block">{product.name}</span>
          <span className="font-mono text-xs text-gray-400">{product.code}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 ml-4 sm:ml-0 shrink-0">
        <div>
          <span className={`font-bold tabular-nums ${critical ? 'text-red-700' : 'text-amber-700'}`}>
            {formatQuantity(product.stock)}
          </span>
          <span className="text-gray-400 text-xs ml-1">/ mín {formatQuantity(product.minStock)}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap
            ${critical ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
          {critical ? 'SIN STOCK' : 'BAJO MÍN.'}
        </span>
      </div>
    </div>
  );
};

const RecentMovementRow = ({ movement }: { movement: MovementItem }) => {
  const name = movement.product?.name ?? movement.productId;
  const isIn = movement.type === 'IN';

  return (
    <div className="flex items-center justify-between py-3 px-1 border-b border-gray-100 last:border-0 text-sm gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold
            ${isIn ? 'bg-green-500' : 'bg-red-500'}`}
        >
          {isIn ? '+' : '−'}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-gray-800 truncate">{name}</p>
          <p className="text-xs text-gray-400">{formatDateTime(movement.createdAt)}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`font-bold tabular-nums ${isIn ? 'text-green-700' : 'text-red-700'}`}
        >
          {isIn ? '+' : '−'}{formatQuantity(movement.quantity)}
        </p>
        <p className="text-xs text-gray-400 tabular-nums">
          Stock: {formatQuantity(movement.newStock)}
        </p>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { data: summaryData, loading: summaryLoading } = useQuery<
    ProductsSummaryData,
    ProductsSummaryVars
  >(PRODUCTS_SUMMARY, {
    variables: { filters: { limit: 1, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  });

  const { data: inventoryData, loading: inventoryLoading } = useQuery<InventoryTotalValueData>(
    INVENTORY_TOTAL_VALUE,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data: lowStockData, loading: lowStockLoading } = useQuery<LowStockProductsData>(
    LOW_STOCK_PRODUCTS,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data: movementsData, loading: movementsLoading } = useQuery<
    GetGlobalMovementsData,
    GetGlobalMovementsVars
  >(GET_GLOBAL_MOVEMENTS, {
    variables: { filters: { limit: 10, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  });

  const lowStock = lowStockData?.lowStockProducts ?? [];
  const movements = movementsData?.getGlobalMovements.items ?? [];

  const totalMovementsRegistered = movementsData?.getGlobalMovements.total ?? 0;

  const kpiReady = !(summaryLoading || inventoryLoading || lowStockLoading || movementsLoading);

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  );

  const alertsLoading = lowStockLoading;
  const lowStockDisplayed = useMemo(() => lowStock.slice(0, 8), [lowStock]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Resumen general del inventario AOA</p>
      </div>

      {!kpiReady ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Productos (catálogo)"
            value={summaryData?.products.total ?? 0}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="blue"
          />
          <KpiCard
            label="Valor del inventario"
            value={formatCurrencyCOP(inventoryData?.inventoryTotalValue ?? 0)}
            sub="PPP (backend)"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
          <KpiCard
            label="Bajo stock mínimo"
            value={lowStock.length}
            sub={lowStock.length > 0 ? 'Requieren atención' : 'Todo en orden'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
            color={lowStock.length > 0 ? 'amber' : 'green'}
          />
          <KpiCard
            label="Movimientos registrados"
            value={totalMovementsRegistered}
            sub="Total en Kardex"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="blue"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-amber-500"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-sm font-semibold text-gray-800">Alertas de Stock</h2>
              {lowStock.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {lowStock.length}
                </span>
              )}
            </div>
            <Link
              to="/productos"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Ver inventario →
            </Link>
          </div>

          <div className="p-4">
            {alertsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : lowStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg
                  className="w-10 h-10 text-green-300 mb-2"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-500">Todos los productos tienen stock suficiente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockDisplayed.map((p) => (
                  <LowStockRow key={p.id} product={p} />
                ))}
                {lowStock.length > 8 && (
                  <p className="text-xs text-center text-gray-400 pt-1">
                    +{lowStock.length - 8} productos más con stock bajo
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-500"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm font-semibold text-gray-800">Movimientos Recientes</h2>
            </div>
            <Link
              to="/kardex"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Ver todos →
            </Link>
          </div>

          <div className="px-4 pb-2">
            {movementsLoading ? (
              <div className="space-y-3 py-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg
                  className="w-10 h-10 text-gray-200 mb-2"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gray-400">Aún no hay movimientos registrados</p>
              </div>
            ) : (
              movements.map((m) => (
                <RecentMovementRow key={m.id} movement={m} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
