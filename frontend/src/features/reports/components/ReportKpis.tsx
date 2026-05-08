import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import {
  PRODUCTS_SUMMARY,
  INVENTORY_TOTAL_VALUE,
  LOW_STOCK_PRODUCTS,
  type ProductsSummaryData,
  type InventoryTotalValueData,
  type LowStockProductsData,
} from '../../../api/queries/products.queries';
import {
  GET_GLOBAL_MOVEMENTS,
  type GetGlobalMovementsData,
} from '../../../api/queries/kardex.queries';
import { formatCurrencyCOP } from '../../../utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

type KpiColor = 'blue' | 'green' | 'amber' | 'red' | 'purple';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  color: KpiColor;
}

// ─── Color map ────────────────────────────────────────────────────────────────

const colorMap: Record<KpiColor, { bg: string; icon: string; text: string }> = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',    text: 'text-blue-700'   },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  text: 'text-green-700'  },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',  text: 'text-amber-700'  },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',      text: 'text-red-700'    },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, icon, color }: KpiCardProps) => {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} rounded-xl p-5 border border-white shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${c.text} tabular-nums truncate`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </div>
        <div className={`${c.icon} p-2.5 rounded-lg shrink-0`}>{icon}</div>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const KpiSkeleton = () => (
  <div className="animate-pulse bg-gray-100 rounded-xl h-[88px] border border-gray-200" />
);

// ─── Component ────────────────────────────────────────────────────────────────

export const ReportKpis = () => {
  const { data: summaryData, loading: l1 } = useQuery<ProductsSummaryData>(PRODUCTS_SUMMARY, {
    variables: { filters: { limit: 1, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  });

  const { data: inventoryData, loading: l2 } = useQuery<InventoryTotalValueData>(
    INVENTORY_TOTAL_VALUE,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data: lowStockData, loading: l3 } = useQuery<LowStockProductsData>(
    LOW_STOCK_PRODUCTS,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data: movementsData, loading: l4 } = useQuery<GetGlobalMovementsData>(
    GET_GLOBAL_MOVEMENTS,
    { variables: { filters: { limit: 1, offset: 0 } }, fetchPolicy: 'cache-and-network' },
  );

  if (l1 || l2 || l3 || l4) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    );
  }

  const lowCount = lowStockData?.lowStockProducts.length ?? 0;
  const inventoryValue = inventoryData?.inventoryTotalValue ?? 0;
  const totalProducts = summaryData?.products.total ?? 0;
  const totalMovements = movementsData?.getGlobalMovements.total ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Total Productos"
        value={totalProducts}
        sub="Catálogo activo"
        color="blue"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
      />

      <KpiCard
        label="Valor Inventario"
        value={formatCurrencyCOP(inventoryValue)}
        sub="Precio Promedio Ponderado"
        color="green"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      <KpiCard
        label="Bajo Stock Mínimo"
        value={lowCount}
        sub={lowCount > 0 ? 'Requieren atención' : 'Todo en orden'}
        color={lowCount > 0 ? 'amber' : 'green'}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        }
      />

      <KpiCard
        label="Total Movimientos"
        value={totalMovements}
        sub="Kardex acumulado"
        color="purple"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
      />
    </div>
  );
};
