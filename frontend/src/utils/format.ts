/** Formato de moneda para Colombia (COP), locale es-CO. */
export function formatCurrencyCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Cantidades / stock con separadores locales (sin símbolo de moneda). */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatea un timestamp Unix (en ms como string o number) a fecha local.
 * Acepta ISO strings también.
 */
export function formatDate(value: string | number): string {
  const ms = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

export function formatDateTime(value: string | number): string {
  const ms = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}
