import { Types } from "mongoose";
import Movement from "../models/movement.model";
import Product, { type IProduct } from "../models/product.model";
import { buildValidationGraphQLError } from "../graphql/errors/graphql-error.factory";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput
} from "../utils/validators/product.validator";
import { clampPagination } from "../utils/pagination.utils";
import { withTransaction } from "../utils/transaction.utils";
import { ensureValidObjectId } from "../utils/object-id.utils";

interface ProductSearchFilters {
  name?: string;
  category?: string;
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
}

interface ProductSearchResult {
  items: IProduct[];
  total: number;
}

const buildNotFoundError = () =>
  buildValidationGraphQLError({ id: "Product not found." });

export class ProductService {
  async createProduct(input: CreateProductInput, userId: string): Promise<IProduct> {
    const payload = await createProductSchema.validate(input, { abortEarly: false });
    const normalizedCode = payload.code.trim().toUpperCase();
    const userObjectId = new Types.ObjectId(userId);
    const initialStock = payload.stock ?? 0;
    const initialAveragePrice = payload.averagePrice ?? (initialStock > 0 ? payload.salePrice : 0);

    return withTransaction(async (session) => {
      const [product] = await Product.create(
        [
          {
            code: normalizedCode,
            name: payload.name,
            description: payload.description,
            category: payload.category,
            stock: initialStock,
            minStock: payload.minStock,
            salePrice: payload.salePrice,
            averagePrice: initialAveragePrice,
            status: true,
            lastModifiedBy: userObjectId
          }
        ],
        { session }
      );

      if (initialStock > 0) {
        await Movement.create(
          [
            {
              type: "IN",
              quantity: initialStock,
              previousStock: 0,
              newStock: initialStock,
              unitPrice: initialAveragePrice,
              observations: "Initial stock entry",
              productId: product._id,
              userId: userObjectId
            }
          ],
          { session }
        );
      }

      return product;
    });
  }

  async getProductById(productId: string): Promise<IProduct | null> {
    ensureValidObjectId(productId, "id");
    return Product.findById(productId).populate("lastModifiedBy");
  }

  async searchProducts(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    const { limit, offset } = clampPagination(filters, 10);

    const query: Record<string, unknown> = {};
    if (!filters.includeInactive) {
      query.status = true;
    }
    if (filters.name?.trim()) {
      query.name = { $regex: filters.name.trim(), $options: "i" };
    }
    if (filters.category?.trim()) {
      query.category = { $regex: filters.category.trim(), $options: "i" };
    }

    const [items, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).populate("lastModifiedBy"),
      Product.countDocuments(query)
    ]);

    return { items, total };
  }

  async updateProduct(productId: string, input: UpdateProductInput, userId: string): Promise<IProduct> {
    ensureValidObjectId(productId, "id");
    const payload = await updateProductSchema.validate(input, { abortEarly: false });

    const product = await Product.findById(productId);
    if (!product || !product.status) {
      throw buildNotFoundError();
    }

    if (payload.code !== undefined) {
      product.code = payload.code.trim().toUpperCase();
    }
    if (payload.name !== undefined) {
      product.name = payload.name;
    }
    if (payload.description !== undefined) {
      product.description = payload.description;
    }
    if (payload.category !== undefined) {
      product.category = payload.category;
    }
    if (payload.minStock !== undefined) {
      product.minStock = payload.minStock;
    }
    if (payload.salePrice !== undefined) {
      product.salePrice = payload.salePrice;
    }
    if (payload.status !== undefined) {
      product.status = payload.status;
    }
    product.lastModifiedBy = new Types.ObjectId(userId);

    await product.save();
    return product.populate("lastModifiedBy");
  }

  async softDeleteProduct(productId: string, userId: string): Promise<IProduct> {
    ensureValidObjectId(productId, "id");
    const product = await Product.findById(productId);
    if (!product || !product.status) {
      throw buildNotFoundError();
    }

    product.status = false;
    product.lastModifiedBy = new Types.ObjectId(userId);

    await product.save();
    return product.populate("lastModifiedBy");
  }

  async getLowStockProducts(): Promise<IProduct[]> {
    return Product.find({
      status: true,
      $expr: { $lte: ["$stock", "$minStock"] }
    })
      .sort({ stock: 1, minStock: 1 })
      .populate("lastModifiedBy");
  }

  async getInventoryTotalValue(): Promise<number> {
    const result = await Product.aggregate<{ totalValue: number }>([
      { $match: { status: true } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$stock", "$averagePrice"] } }
        }
      }
    ]);

    return result[0]?.totalValue ?? 0;
  }
}
