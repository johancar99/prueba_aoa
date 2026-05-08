import { movementResolvers } from "./movement.resolver";
import { productResolvers } from "./product.resolver";
import { userResolvers } from "./user.resolver";

export const resolvers = {
  Query: {
    _health: () => "ok",
    ...productResolvers.Query,
    ...movementResolvers.Query,
    ...userResolvers.Query
  },
  Mutation: {
    _empty: () => null,
    ...productResolvers.Mutation,
    ...movementResolvers.Mutation,
    ...userResolvers.Mutation
  },
  Movement: movementResolvers.Movement
};
