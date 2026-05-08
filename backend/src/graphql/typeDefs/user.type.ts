import { gql } from "graphql-tag";

export const userTypeDefs = gql`
  enum UserRole {
    ADMIN
    USER
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    active: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    role: UserRole!
  }

  input UpdateUserInput {
    name: String
    email: String
    password: String
    role: UserRole
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type UserSearchResult {
    items: [User!]!
    total: Int!
  }

  input UserFiltersInput {
    name: String
    email: String
    role: UserRole
    includeInactive: Boolean
    limit: Int
    offset: Int
  }

  extend type Query {
    me: User
    users(filters: UserFiltersInput): UserSearchResult!
  }

  extend type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): User!
    login(email: String!, password: String!): AuthPayload!
  }
`;
