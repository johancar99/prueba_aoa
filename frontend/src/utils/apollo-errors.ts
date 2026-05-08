import type { ApolloError } from '@apollo/client';

/** Mensaje legible desde errores GraphQL del backend (incl. fieldErrors en extensions). */
export function formatMutationError(error: ApolloError): string {
  const gqlErr = error.graphQLErrors[0];
  const fieldErrors = gqlErr?.extensions?.fieldErrors as Record<string, string> | undefined;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const values = Object.values(fieldErrors).filter(Boolean);
    if (values.length) return values.join(' · ');
  }
  if (gqlErr?.message) return gqlErr.message;
  if (error.networkError?.message) return error.networkError.message;
  return error.message || 'Error inesperado';
}
