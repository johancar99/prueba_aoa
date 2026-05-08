import { gql } from "graphql-tag";

export const movementTypeDefs = gql`
  enum MovementType {
    IN
    OUT
  }

  type Movement {
    id: ID!
    type: MovementType!
    quantity: Float!
    previousStock: Float!
    newStock: Float!
    unitPrice: Float
    observations: String
    productId: ID!
    userId: ID!
    product: Product
    user: User
    createdAt: String!
    lowStockAlert: Boolean
  }

  type MovementSearchResult {
    items: [Movement!]!
    total: Int!
  }

  input RegisterMovementInput {
    productId: ID!
    type: MovementType!
    quantity: Float!
    unitPrice: Float
    observations: String
  }

  input GlobalMovementsFiltersInput {
    productId: ID
    type: MovementType
    startDate: String
    endDate: String
    limit: Int
    offset: Int
  }

  extend type Query {
    getKardexByProduct(productId: ID!, limit: Int, offset: Int): MovementSearchResult!
    getGlobalMovements(filters: GlobalMovementsFiltersInput): MovementSearchResult!
  }

  extend type Mutation {
    registerMovement(input: RegisterMovementInput!): Movement!
  }
`;
