import { Types } from "mongoose";
import { requireAuth } from "../guards/auth.guard";
import { MovementService } from "../../services/movement.service";
import type { GraphQLContext } from "../../types";
import type {
  GlobalMovementsFiltersInput,
  RegisterMovementInput
} from "../../utils/validators/movement.validator";
import { normalizeObjectId } from "../../utils/object-id.utils";

const movementService = new MovementService();

interface RegisterMovementArgs {
  input: RegisterMovementInput;
}

interface KardexByProductArgs {
  productId: string;
  limit?: number;
  offset?: number;
}

interface GlobalMovementsArgs {
  filters?: GlobalMovementsFiltersInput;
}

interface MovementParent {
  productId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
}

export const movementResolvers = {
  Query: {
    getKardexByProduct: async (_parent: unknown, args: KardexByProductArgs, context: GraphQLContext) => {
      requireAuth(context);
      return movementService.getKardexByProduct(args.productId, {
        limit: args.limit,
        offset: args.offset
      });
    },
    getGlobalMovements: async (_parent: unknown, args: GlobalMovementsArgs, context: GraphQLContext) => {
      requireAuth(context);
      return movementService.getGlobalMovements(args.filters ?? {});
    }
  },
  Mutation: {
    registerMovement: async (
      _parent: unknown,
      args: RegisterMovementArgs,
      context: GraphQLContext
    ) => {
      const userId = requireAuth(context);
      const { movement, lowStockAlert } = await movementService.createMovement(args.input, userId);
      return Object.assign(movement, { lowStockAlert });
    }
  },
  Movement: {
    product: async (parent: MovementParent, _args: unknown, context: GraphQLContext) =>
      context.loaders.productByIdLoader.load(normalizeObjectId(parent.productId)),
    user: async (parent: MovementParent, _args: unknown, context: GraphQLContext) =>
      context.loaders.userByIdLoader.load(normalizeObjectId(parent.userId))
  }
};
