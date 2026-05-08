import { useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import InventoryTable from '../components/InventoryTable';
import LowStockPanel from '../components/LowStockPanel';
import MovementsReport from '../components/MovementsReport';
import MovementsCharts from '../components/MovementsCharts';
import {
  LOW_STOCK_PRODUCTS,
  type LowStockProductsData,
} from '../../../api/queries/products.queries';
import {
  GET_GLOBAL_MOVEMENTS,
  type GetGlobalMovementsData,
  type MovementItem,
} from '../../../api/queries/kardex.queries';
import { formatQuantity, formatDateTime } from '../../../utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'inventory' | 'lowstock' | 'movements' | 'charts';

interface TabConfig {
  id: TabId;
  label: string;
  icon: ReactNode;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Resumen',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    id: 'lowstock',
    label: 'Bajo Stock',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  {
    id: 'movements',
    label: 'Movimientos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: 'charts',
    label: 'Gráficos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

// ─── Overview sub-components ──────────────────────────────────────────────────

const OverviewRecentMovement = ({ m }: { m: MovementItem }) => {
  const isIn = m.type === 'IN';
  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 last:border-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold ${isIn ? 'bg-green-500' : 'bg-red-500'}`}>
          {isIn ? '+' : '−'}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm text-gray-800 truncate">
            {m.product?.name ?? '(Eliminado)'}
          </p>
          <p className="text-xs text-gray-400">{formatDateTime(m.createdAt)}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-bold tabular-nums text-sm ${isIn ? 'text-green-700' : 'text-red-700'}`}>
          {isIn ? '+' : '−'}{formatQuantity(m.quantity)}
        </p>
        <p className="text-xs text-gray-400 tabular-nums">→ {formatQuantity(m.newStock)}</p>
      </div>
    </div>
  );
};

// ─── Overview tab ─────────────────────────────────────────────────────────────

const OverviewTab = ({ onNavigate }: { onNavigate: (tab: TabId) => void }) => {
  const { data: lowStockData, loading: lowLoading } = useQuery<LowStockProductsData>(
    LOW_STOCK_PRODUCTS,
    { fetchPolicy: 'cache-first' },
  );

  const { data: movementsData, loading: movLoading } = useQuery<GetGlobalMovementsData>(
    GET_GLOBAL_MOVEMENTS,
    { variables: { filters: { limit: 8, offset: 0 } }, fetchPolicy: 'cache-first' },
  );

  const lowStock = lowStockData?.lowStockProducts ?? [];
  const recentMovements = movementsData?.getGlobalMovements.items ?? [];
  const totalMovements = movementsData?.getGlobalMovements.total ?? 0;

  const Skeleton = ({ h }: { h: string }) => (
    <div className={`animate-pulse bg-gray-100 rounded-lg ${h}`} />
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Low stock summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-800">Alertas de Stock</h3>
            {!lowLoading && lowStock.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {lowStock.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('lowstock')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Ver todos →
          </button>
        </div>

        <div className="p-4">
          {lowLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h="h-12" />)}</div>
          ) : lowStock.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <svg className="w-10 h-10 text-green-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-500">Inventario saludable</p>
              <p className="text-xs text-gray-400 mt-0.5">Todos los productos tienen stock suficiente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 5).map((p) => {
                const critical = p.stock === 0;
                return (
                  <div key={p.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${critical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${critical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs font-mono text-gray-400">{p.code}</p>
                      </div>
                    </div>
                    <span className={`font-bold tabular-nums text-sm shrink-0 ml-2 ${critical ? 'text-red-700' : 'text-amber-700'}`}>
                      {formatQuantity(p.stock)} / {formatQuantity(p.minStock)}
                    </span>
                  </div>
                );
              })}
              {lowStock.length > 5 && (
                <button
                  type="button"
                  onClick={() => onNavigate('lowstock')}
                  className="w-full text-xs text-center text-blue-600 hover:text-blue-800 py-1.5 transition-colors"
                >
                  +{lowStock.length - 5} productos más →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-800">Movimientos Recientes</h3>
            {!movLoading && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {totalMovements} total
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('movements')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Ver todos →
          </button>
        </div>

        <div className="px-4 pb-2">
          {movLoading ? (
            <div className="space-y-3 py-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h="h-10" />)}</div>
          ) : recentMovements.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <svg className="w-10 h-10 text-gray-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-gray-400">Aún no hay movimientos</p>
            </div>
          ) : (
            recentMovements.map((m) => <OverviewRecentMovement key={m.id} m={m} />)
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { tab: 'inventory' as TabId, label: 'Ver Inventario Completo', color: 'blue', icon: '📦' },
          { tab: 'lowstock' as TabId,  label: 'Alertas de Stock',        color: 'amber', icon: '⚠️' },
          { tab: 'movements' as TabId, label: 'Auditar Movimientos',     color: 'green', icon: '📋' },
          { tab: 'charts' as TabId,    label: 'Ver Gráficos',            color: 'purple', icon: '📊' },
        ].map(({ tab, label, icon }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onNavigate(tab)}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-center group"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Análisis, auditoría y exportación del inventario AOA
          </p>
        </div>
        <Link
          to="/kardex"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors self-start sm:self-auto shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Ir al Kardex
        </Link>
      </div>

      {/* Tab panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 shrink-0 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-3 sm:p-5">
          {activeTab === 'overview' && (
            <OverviewTab onNavigate={setActiveTab} />
          )}
          {activeTab === 'inventory' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800">Inventario Actual</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Todos los productos con su stock disponible y valor calculado por PPP
                </p>
              </div>
              <InventoryTable />
            </div>
          )}
          {activeTab === 'lowstock' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800">Productos Bajo Stock Mínimo</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Productos que requieren reabastecimiento. Haz clic en el ícono para ver su Kardex.
                </p>
              </div>
              <LowStockPanel />
            </div>
          )}
          {activeTab === 'movements' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800">Movimientos por Período</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Audita entradas y salidas del Kardex filtrando por fecha, producto o tipo
                </p>
              </div>
              <MovementsReport />
            </div>
          )}
          {activeTab === 'charts' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800">Gráficos de Movimientos</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visualiza la tendencia de entradas vs. salidas y los productos con mayor rotación
                </p>
              </div>
              <MovementsCharts />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
