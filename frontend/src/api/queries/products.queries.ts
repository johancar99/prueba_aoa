import { gql } from '@apollo/client';

/** Solo el total de productos (menos datos en red). Ideal para KPIs del dashboard. */
export const PRODUCTS_SUMMARY = gql`
  query ProductsSummary($filters: ProductFiltersInput) {
    products(filters: $filters) {
      total
      items {
        id
      }
    }
  }
`;

export const INVENTORY_TOTAL_VALUE = gql`
  query InventoryTotalValue {
    inventoryTotalValue
  }
`;

export const LOW_STOCK_PRODUCTS = gql`
  query LowStockProducts {
    lowStockProducts {
      id
      code
      name
      stock
      minStock
    }
  }
`;

export const GET_PRODUCTS = gql`
  query Products($filters: ProductFiltersInput) {
    products(filters: $filters) {
      total
      items {
        id
        code
        name
        description
        category
        stock
        minStock
        salePrice
        averagePrice
        status
        createdAt
        updatedAt
      }
    }
  }
`;

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  stock: number;
  minStock: number;
  salePrice: number;
  averagePrice: number;
  status: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFiltersInput {
  name?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface GetProductsData {
  products: {
    total: number;
    items: ProductItem[];
  };
}

export interface GetProductsVars {
  filters?: ProductFiltersInput;
}

export interface LowStockProductItem {
  id: string;
  code: string;
  name: string;
  stock: number;
  minStock: number;
}

export interface ProductsSummaryData {
  products: { total: number; items: { id: string }[] };
}

export interface ProductsSummaryVars {
  filters?: ProductFiltersInput;
}

export interface InventoryTotalValueData {
  inventoryTotalValue: number;
}

export interface LowStockProductsData {
  lowStockProducts: LowStockProductItem[];
}
