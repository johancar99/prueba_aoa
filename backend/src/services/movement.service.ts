import mongoose from "mongoose";
import Movement, { type IMovement } from "../models/movement.model";
import Product from "../models/product.model";
import { buildValidationGraphQLError } from "../graphql/errors/graphql-error.factory";
import {
  globalMovementsFiltersSchema,
  registerMovementSchema,
  type GlobalMovementsFiltersInput,
  type RegisterMovementInput
} from "../utils/validators/movement.validator";
import { clampPagination } from "../utils/pagination.utils";
import { parseOptionalDate } from "../utils/date.utils";
import { withTransaction } from "../utils/transaction.utils";
import { ensureValidObjectId } from "../utils/object-id.utils";

export interface CreateMovementResult {
  movement: IMovement;
  lowStockAlert: boolean;
}

interface MovementSearchResult {
  items: IMovement[];
  total: number;
}

const buildNotFoundProductError = () =>
  buildValidationGraphQLError({ productId: "Product not found." });

const buildInsufficientStockError = () =>
  buildValidationGraphQLError({ quantity: "Insufficient stock for this output movement." });

export class MovementService {
  async createMovement(input: RegisterMovementInput, userId: string): Promise<CreateMovementResult> {
    const payload = await registerMovementSchema.validate(input, { abortEarly: false });
    const productObjectId = ensureValidObjectId(payload.productId, "productId");
    const userObjectId = ensureValidObjectId(userId, "userId");

    return withTransaction(async (session) => {
      const product = await Product.findById(productObjectId).session(session);
      if (!product || !product.status) {
        throw buildNotFoundProductError();
      }

      const previousStock = product.stock;
      if (payload.type === "OUT" && previousStock < payload.quantity) {
        throw buildInsufficientStockError();
      }

      const newStock =
        payload.type === "IN" ? previousStock + payload.quantity : previousStock - payload.quantity;

      if (newStock < 0) {
        throw buildInsufficientStockError();
      }

      if (payload.type === "IN") {
        const incomingPrice = payload.unitPrice ?? 0;
        const totalCurrentValue = previousStock * product.averagePrice;
        const totalIncomingValue = payload.quantity * incomingPrice;
        product.averagePrice = (totalCurrentValue + totalIncomingValue) / newStock;
      }

      product.stock = newStock;
      product.lastModifiedBy = userObjectId;
      await product.save({ session });

      const [movement] = await Movement.create(
        [
          {
            type: payload.type,
            quantity: payload.quantity,
            previousStock,
            newStock,
            unitPrice: payload.unitPrice ?? product.averagePrice,
            observations: payload.observations,
            productId: productObjectId,
            userId: userObjectId
          }
        ],
        { session }
      );

      return {
        movement,
        lowStockAlert: newStock <= product.minStock
      };
    });
  }

  async getKardexByProduct(
    productId: string,
    params: { limit?: number; offset?: number }
  ): Promise<MovementSearchResult> {
    const productObjectId = ensureValidObjectId(productId, "productId");
    const { limit, offset } = clampPagination(params);

    const [items, total] = await Promise.all([
      Movement.find({ productId: productObjectId }).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Movement.countDocuments({ productId: productObjectId })
    ]);

    return { items, total };
  }

  async getGlobalMovements(filters: GlobalMovementsFiltersInput): Promise<MovementSearchResult> {
    const payload = await globalMovementsFiltersSchema.validate(filters, { abortEarly: false });
    const { limit, offset } = clampPagination(payload);

    const query: {
      productId?: import("mongoose").Types.ObjectId;
      type?: "IN" | "OUT";
      createdAt?: { $gte?: Date; $lte?: Date };
    } = {};

    if (payload.productId?.trim()) {
      query.productId = ensureValidObjectId(payload.productId.trim(), "productId");
    }

    if (payload.type) {
      query.type = payload.type;
    }

    const startDate = parseOptionalDate(payload.startDate);
    const endDate = parseOptionalDate(payload.endDate);

    if (payload.startDate && !startDate) {
      throw buildValidationGraphQLError({ startDate: "Invalid startDate format." });
    }
    if (payload.endDate && !endDate) {
      throw buildValidationGraphQLError({ endDate: "Invalid endDate format." });
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [items, total] = await Promise.all([
      Movement.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Movement.countDocuments(query)
    ]);

    return { items, total };
  }
}
