import { useState, useEffect } from 'react';

/**
 * Retrasa la actualización de un valor hasta que el usuario deja
 * de escribir durante `delay` ms. Ideal para búsquedas en tiempo real.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
