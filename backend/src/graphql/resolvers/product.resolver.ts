import { requireAuth } from "../guards/auth.guard";
import { ProductService } from "../../services/product.service";
import type { GraphQLContext } from "../../types";
import type { CreateProductInput, UpdateProductInput } from "../../utils/validators/product.validator";

const productService = new ProductService();

interface CreateProductArgs {
  input: CreateProductInput;
}

interface UpdateProductArgs {
  id: string;
  input: UpdateProductInput;
}

interface SearchProductsArgs {
  filters?: {
    name?: string;
    category?: string;
    limit?: number;
    offset?: number;
  };
}

interface ProductByIdArgs {
  id: string;
}

export const productResolvers = {
  Query: {
    products: async (_parent: unknown, args: SearchProductsArgs, context: GraphQLContext) => {
      requireAuth(context);
      return productService.searchProducts({
        name: args.filters?.name,
        category: args.filters?.category,
        limit: args.filters?.limit,
        offset: args.filters?.offset
      });
    },
    product: async (_parent: unknown, args: ProductByIdArgs, context: GraphQLContext) => {
      requireAuth(context);
      return productService.getProductById(args.id);
    },
    lowStockProducts: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireAuth(context);
      return productService.getLowStockProducts();
    },
    inventoryTotalValue: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireAuth(context);
      return productService.getInventoryTotalValue();
    }
  },
  Mutation: {
    createProduct: async (_parent: unknown, args: CreateProductArgs, context: GraphQLContext) => {
      const userId = requireAuth(context);
      return productService.createProduct(args.input, userId);
    },
    updateProduct: async (_parent: unknown, args: UpdateProductArgs, context: GraphQLContext) => {
      const userId = requireAuth(context);
      return productService.updateProduct(args.id, args.input, userId);
    },
    deleteProduct: async (_parent: unknown, args: ProductByIdArgs, context: GraphQLContext) => {
      const userId = requireAuth(context);
      return productService.softDeleteProduct(args.id, userId);
    }
  }
};
