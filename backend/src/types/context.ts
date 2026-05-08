import type DataLoader from "dataloader";
import type { IProduct } from "../models/product.model";
import type { IUser } from "../models/user.model";

export interface GraphQLContext {
  userId?: string;
  userEmail?: string;
  userRole?: "ADMIN" | "USER";
  loaders: {
    productByIdLoader: DataLoader<string, IProduct | null>;
    userByIdLoader: DataLoader<string, IUser | null>;
  };
}
