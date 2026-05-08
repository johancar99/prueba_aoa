import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  GET_GLOBAL_MOVEMENTS,
  type GetGlobalMovementsData,
  type GetGlobalMovementsVars,
  type MovementItem,
} from '../../../api/queries/kardex.queries';
import { formatQuantity } from '../../../utils/format';

// Convierte "YYYY-MM-DD" → ISO inicio/fin de día en UTC
function toISOStart(date: string) { return date ? `${date}T00:00:00.000Z` : undefined; }
function toISOEnd(date: string)   { return date ? `${date}T23:59:59.999Z` : undefined; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCreatedAt(createdAt: string): Date {
  return /^\d+$/.test(createdAt) ? new Date(Number(createdAt)) : new Date(createdAt);
}

function getDateKey(createdAt: string): string {
  const d = parseCreatedAt(createdAt);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDayLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
}

// ─── Data processing hooks ────────────────────────────────────────────────────

interface DayData {
  date: string;
  label: string;
  entradas: number;
  salidas: number;
  neto: number;
}

interface ProductRotation {
  name: string;
  movimientos: number;
  entradas: number;
  salidas: number;
}

function useTrendData(items: MovementItem[]): DayData[] {
  return useMemo(() => {
    const map: Record<string, DayData> = {};
    items.forEach((m) => {
      const key = getDateKey(m.createdAt);
      if (!map[key]) {
        map[key] = { date: key, label: formatDayLabel(key), entradas: 0, salidas: 0, neto: 0 };
      }
      if (m.type === 'IN') map[key].entradas += m.quantity;
      else map[key].salidas += m.quantity;
    });
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, neto: d.entradas - d.salidas }));
  }, [items]);
}

function useRotationData(items: MovementItem[]): ProductRotation[] {
  return useMemo(() => {
    const map: Record<string, ProductRotation> = {};
    items.forEach((m) => {
      // Solo productos activos y no eliminados
      if (!m.product || m.product.status === false) return;

      const id = m.productId;
      if (!map[id]) map[id] = { name: m.product.name, movimientos: 0, entradas: 0, salidas: 0 };
      map[id].movimientos += 1;
      if (m.type === 'IN') map[id].entradas += m.quantity;
      else map[id].salidas += m.quantity;
    });
    return Object.values(map)
      .sort((a, b) => b.movimientos - a.movimientos)
      .slice(0, 10);
  }, [items]);
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

const TrendTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: entry.color }} />
          <span className="text-gray-500 capitalize">{entry.name}:</span>
          <span className="font-bold tabular-nums">{formatQuantity(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const RotationTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-700 mb-1.5 truncate">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: entry.color }} />
          <span className="text-gray-500 capitalize">{entry.name}:</span>
          <span className="font-bold tabular-nums">{formatQuantity(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ChartSkeleton = ({ height = 280 }: { height?: number }) => (
  <div className="animate-pulse bg-gray-100 rounded-xl border border-gray-200" style={{ height }} />
);

// ─── Rotation bar colors ──────────────────────────────────────────────────────

const ROTATION_COLORS = [
  '#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#9333ea', '#0284c7', '#16a34a', '#ca8a04',
];

// ─── Component ────────────────────────────────────────────────────────────────

const MovementsCharts = () => {
  const currentYear = new Date().getFullYear();

  // Rango por defecto: año en curso completo (garantiza encontrar datos)
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate,   setEndDate]   = useState(`${currentYear}-12-31`);

  const vars = useMemo<GetGlobalMovementsVars>(() => ({
    filters: {
      limit: 100,
      offset: 0,
      ...(startDate ? { startDate: toISOStart(startDate) } : {}),
      ...(endDate   ? { endDate:   toISOEnd(endDate)     } : {}),
    },
  }), [startDate, endDate]);

  const { data, loading, error } = useQuery<GetGlobalMovementsData, GetGlobalMovementsVars>(
    GET_GLOBAL_MOVEMENTS,
    { variables: vars, fetchPolicy: 'network-only' },
  );

  const items = data?.getGlobalMovements.items ?? [];
  const trendData = useTrendData(items);
  const rotationData = useRotationData(items);

  const totalEntradas = useMemo(() => items.filter((m) => m.type === 'IN').reduce((s, m) => s + m.quantity, 0), [items]);
  const totalSalidas  = useMemo(() => items.filter((m) => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0), [items]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Error al cargar datos: {error.message}
        </div>
      )}

      {/* Date range controls */}
      <div className="flex flex-wrap items-start sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap w-10 sm:w-auto">Desde:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap w-10 sm:w-auto">Hasta:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!loading && items.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-3 sm:ml-auto text-sm">
            <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium text-xs sm:text-sm">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 shrink-0" />
              +{formatQuantity(totalEntradas)} entradas
            </span>
            <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium text-xs sm:text-sm">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />
              −{formatQuantity(totalSalidas)} salidas
            </span>
          </div>
        )}
      </div>

      {/* Chart 1: Trend (entries vs exits by day) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Tendencia de Movimientos por Día</h3>
          <p className="text-xs text-gray-500 mt-0.5">Entradas vs. Salidas en unidades por día</p>
        </div>

        {loading ? (
          <ChartSkeleton height={280} />
        ) : trendData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Sin datos en el período seleccionado</p>
            <p className="text-xs mt-0.5">Ajusta el rango de fechas para ver la tendencia</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatQuantity(v as number)}
              />
              <Tooltip content={<TrendTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => <span style={{ color: '#374151', textTransform: 'capitalize' }}>{value}</span>}
              />
              <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="salidas"  name="Salidas"  fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 2: Top products by rotation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Productos con Mayor Rotación</h3>
          <p className="text-xs text-gray-500 mt-0.5">Top 10 productos por número de movimientos registrados</p>
        </div>

        {loading ? (
          <ChartSkeleton height={320} />
        ) : rotationData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Sin datos en el período seleccionado</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(280, rotationData.length * 44)}>
            <BarChart
              data={rotationData}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
              barCategoryGap="25%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(v) => formatQuantity(v as number)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11, fill: '#374151' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.length > 18 ? `${v.slice(0, 17)}…` : v}
              />
              <Tooltip content={<RotationTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => <span style={{ color: '#374151', textTransform: 'capitalize' }}>{value}</span>}
              />
              <Bar dataKey="movimientos" name="Movimientos" maxBarSize={28} radius={[0, 4, 4, 0]}>
                {rotationData.map((_, i) => (
                  <Cell key={i} fill={ROTATION_COLORS[i % ROTATION_COLORS.length]} />
                ))}
              </Bar>
              <Bar dataKey="entradas" name="Entradas (uds.)" fill="#22c55e" maxBarSize={28} radius={[0, 4, 4, 0]} />
              <Bar dataKey="salidas"  name="Salidas (uds.)"  fill="#ef4444" maxBarSize={28} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default MovementsCharts;
