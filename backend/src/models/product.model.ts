import { model, Schema, type Document, type Types } from "mongoose";

export interface IProduct extends Document {
  code: string;
  name: string;
  description?: string;
  category?: string;
  stock: number;
  minStock: number;
  salePrice: number;
  averagePrice: number;
  status: boolean;
  lastModifiedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    stock: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    averagePrice: { type: Number, default: 0, min: 0 },
    status: { type: Boolean, default: true },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

productSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: { status: true }
  }
);
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1, stock: 1 });

const Product = model<IProduct>("Product", productSchema);

export default Product;
