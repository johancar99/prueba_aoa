import DataLoader from "dataloader";
import Product, { type IProduct } from "../../models/product.model";
import User, { type IUser } from "../../models/user.model";

export interface MovementLoaders {
  productByIdLoader: DataLoader<string, IProduct | null>;
  userByIdLoader: DataLoader<string, IUser | null>;
}

const batchLoadProducts = async (keys: readonly string[]): Promise<(IProduct | null)[]> => {
  const products = await Product.find({ _id: { $in: [...keys] } });
  const productMap = new Map<string, IProduct>(products.map((p) => [p.id as string, p]));
  return keys.map((key) => productMap.get(key) ?? null);
};

const batchLoadUsers = async (keys: readonly string[]): Promise<(IUser | null)[]> => {
  const users = await User.find({ _id: { $in: [...keys] } });
  const userMap = new Map<string, IUser>(users.map((u) => [u.id as string, u]));
  return keys.map((key) => userMap.get(key) ?? null);
};

export const createMovementLoaders = (): MovementLoaders => ({
  productByIdLoader: new DataLoader<string, IProduct | null>(batchLoadProducts),
  userByIdLoader: new DataLoader<string, IUser | null>(batchLoadUsers)
});
