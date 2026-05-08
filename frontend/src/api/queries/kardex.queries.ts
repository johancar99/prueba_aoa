import { gql } from '@apollo/client';

/** Historial global de movimientos (schema backend: Query.getGlobalMovements). */
export const GET_GLOBAL_MOVEMENTS = gql`
  query GetGlobalMovements($filters: GlobalMovementsFiltersInput) {
    getGlobalMovements(filters: $filters) {
      total
      items {
        id
        type
        quantity
        previousStock
        newStock
        unitPrice
        observations
        productId
        userId
        lowStockAlert
        createdAt
        product {
          id
          name
          code
          status
        }
        user {
          id
          name
        }
      }
    }
  }
`;

export type MovementType = 'IN' | 'OUT';

export interface MovementProduct {
  id: string;
  name: string;
  code: string;
  /** false o null cuando el producto fue eliminado (soft-delete). */
  status?: boolean | null;
}

export interface MovementUser {
  id: string;
  name: string;
}

export interface MovementItem {
  id: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitPrice: number | null;
  observations: string | null;
  productId: string;
  userId: string;
  lowStockAlert: boolean | null;
  createdAt: string;
  product?: MovementProduct | null;
  user?: MovementUser | null;
}

export interface GlobalMovementsFiltersInput {
  productId?: string;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface GetGlobalMovementsData {
  getGlobalMovements: {
    total: number;
    items: MovementItem[];
  };
}

export interface GetGlobalMovementsVars {
  filters?: GlobalMovementsFiltersInput;
}
