import { model, Schema, type Document, type Types } from "mongoose";

export type MovementType = "IN" | "OUT";

export interface IMovement extends Document {
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitPrice?: number;
  observations?: string;
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const movementSchema = new Schema<IMovement>(
  {
    type: { type: String, enum: ["IN", "OUT"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, min: 0 },
    observations: { type: String, trim: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

movementSchema.index({ productId: 1, createdAt: -1 });
movementSchema.index({ type: 1, createdAt: -1 });

const Movement = model<IMovement>("Movement", movementSchema);

export default Movement;
