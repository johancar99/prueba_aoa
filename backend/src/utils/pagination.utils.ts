export interface PaginationParams {
  limit?: number | null;
  offset?: number | null;
}

export interface ClampedPagination {
  limit: number;
  offset: number;
}

/**
 * Clamps pagination inputs to safe, bounded values.
 * Prevents unbounded queries and negative offsets.
 */
export const clampPagination = (params: PaginationParams, defaultLimit = 20): ClampedPagination => ({
  limit: Math.max(1, Math.min(params.limit ?? defaultLimit, 100)),
  offset: Math.max(0, params.offset ?? 0)
});
