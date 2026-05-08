import type { Types } from "mongoose";
import User, { type IUser } from "../models/user.model";
import { buildValidationGraphQLError } from "../graphql/errors/graphql-error.factory";
import {
  createUserSchema,
  updateUserSchema,
  usersFiltersSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UsersFiltersInput
} from "../utils/validators/user.validator";
import { clampPagination } from "../utils/pagination.utils";
import { ensureValidObjectId } from "../utils/object-id.utils";

interface UserSearchResult {
  items: IUser[];
  total: number;
}

const buildNotFoundUserError = () =>
  buildValidationGraphQLError({ id: "User not found." });

const isUserActive = (user: Pick<IUser, "active">): boolean => user.active !== false;

/**
 * Prevents deactivating or demoting the only active administrator.
 */
const assertLastActiveAdminProtected = async (targetUserId: Types.ObjectId | string): Promise<void> => {
  const target = await User.findById(targetUserId);
  if (!target || target.role !== "ADMIN" || !isUserActive(target)) {
    return;
  }

  const activeAdminCount = await User.countDocuments({
    role: "ADMIN",
    active: { $ne: false }
  });

  if (activeAdminCount <= 1) {
    throw buildValidationGraphQLError({
      id: "Cannot modify or deactivate the last active administrator."
    });
  }
};

export class UserService {
  async getCurrentUser(userId?: string): Promise<IUser | null> {
    if (!userId) {
      return null;
    }

    const user = await User.findById(userId).select("-password");
    if (!user || !isUserActive(user)) {
      return null;
    }

    return user;
  }

  async searchUsers(filters: UsersFiltersInput = {}): Promise<UserSearchResult> {
    const payload = await usersFiltersSchema.validate(filters, { abortEarly: false });
    const { limit, offset } = clampPagination(payload, 10);

    const query: Record<string, unknown> = {};
    if (!payload.includeInactive) {
      query.active = { $ne: false };
    }
    if (payload.name?.trim()) {
      query.name = { $regex: payload.name.trim(), $options: "i" };
    }
    if (payload.email?.trim()) {
      query.email = { $regex: payload.email.trim().toLowerCase(), $options: "i" };
    }
    if (payload.role) {
      query.role = payload.role;
    }

    const [items, total] = await Promise.all([
      User.find(query).select("-password").sort({ createdAt: -1 }).skip(offset).limit(limit),
      User.countDocuments(query)
    ]);

    return { items, total };
  }

  async createUser(input: CreateUserInput): Promise<IUser> {
    const payload = await createUserSchema.validate(input, { abortEarly: false });
    const normalizedEmail = payload.email.trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
      active: { $ne: false }
    });

    if (existingUser) {
      throw buildValidationGraphQLError({ email: "This email is already registered." });
    }

    const created = await User.create({
      name: payload.name,
      email: normalizedEmail,
      password: payload.password,
      role: payload.role,
      active: true
    });

    const safe = await User.findById(created._id).select("-password");
    if (!safe) {
      throw buildNotFoundUserError();
    }
    return safe;
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<IUser> {
    ensureValidObjectId(userId, "id");
    const payload = await updateUserSchema.validate(input, { abortEarly: false });

    const user = await User.findById(userId);
    if (!user || !isUserActive(user)) {
      throw buildNotFoundUserError();
    }

    if (payload.role === "USER" && user.role === "ADMIN") {
      await assertLastActiveAdminProtected(user._id);
    }

    if (payload.email !== undefined) {
      const normalizedEmail = payload.email.trim().toLowerCase();
      const emailTaken = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
        active: { $ne: false }
      });
      if (emailTaken) {
        throw buildValidationGraphQLError({ email: "This email is already registered." });
      }
      user.email = normalizedEmail;
    }

    if (payload.name !== undefined) {
      user.name = payload.name;
    }
    if (payload.password !== undefined) {
      user.password = payload.password;
    }
    if (payload.role !== undefined) {
      user.role = payload.role;
    }

    await user.save();
    const fresh = await User.findById(user._id).select("-password");
    if (!fresh) {
      throw buildNotFoundUserError();
    }
    return fresh;
  }

  async deactivateUser(userId: string, requesterUserId: string): Promise<IUser> {
    ensureValidObjectId(userId, "id");
    ensureValidObjectId(requesterUserId, "id");

    if (userId === requesterUserId) {
      throw buildValidationGraphQLError({ id: "You cannot deactivate your own account." });
    }

    const user = await User.findById(userId);
    if (!user || !isUserActive(user)) {
      throw buildNotFoundUserError();
    }

    if (user.role === "ADMIN") {
      await assertLastActiveAdminProtected(user._id);
    }

    user.active = false;
    await user.save();

    const fresh = await User.findById(user._id).select("-password");
    if (!fresh) {
      throw buildNotFoundUserError();
    }
    return fresh;
  }
}
