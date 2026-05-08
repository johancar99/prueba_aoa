import { gql } from "graphql-tag";

export const productTypeDefs = gql`
  type Product {
    id: ID!
    code: String!
    name: String!
    description: String
    category: String
    stock: Float!
    minStock: Float!
    salePrice: Float!
    averagePrice: Float!
    status: Boolean!
    lastModifiedBy: User
    createdAt: String!
    updatedAt: String!
  }

  type ProductSearchResult {
    items: [Product!]!
    total: Int!
  }

  input ProductFiltersInput {
    name: String
    category: String
    limit: Int
    offset: Int
  }

  input CreateProductInput {
    code: String!
    name: String!
    description: String
    category: String
    stock: Float
    minStock: Float!
    salePrice: Float!
    averagePrice: Float
  }

  input UpdateProductInput {
    code: String
    name: String
    description: String
    category: String
    minStock: Float
    salePrice: Float
    status: Boolean
  }

  extend type Query {
    products(filters: ProductFiltersInput): ProductSearchResult!
    product(id: ID!): Product
    lowStockProducts: [Product!]!
    inventoryTotalValue: Float!
  }

  extend type Mutation {
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Product!
  }
`;
