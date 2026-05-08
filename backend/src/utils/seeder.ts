import { env } from "../config/env";
import User from "../models/user.model";

export const seedAdminUser = async (): Promise<void> => {
  const adminExists = await User.exists({ role: "ADMIN", active: { $ne: false } });
  if (adminExists) {
    return;
  }

  await User.create({
    name: env.adminName,
    email: env.adminEmail.trim().toLowerCase(),
    password: env.adminPassword,
    role: "ADMIN"
  });
};
