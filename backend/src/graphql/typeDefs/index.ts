import { gql } from "graphql-tag";
import { movementTypeDefs } from "./movement.type";
import { productTypeDefs } from "./product.type";
import { userTypeDefs } from "./user.type";

const baseTypeDefs = gql`
  type Query {
    _health: String!
  }

  type Mutation {
    _empty: String
  }
`;

export const typeDefs = [
  baseTypeDefs,
  productTypeDefs,
  movementTypeDefs,
  userTypeDefs
];
