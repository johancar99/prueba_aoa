import * as yup from "yup";
import type { UserRole } from "../../models/user.model";

export const createUserSchema = yup
  .object({
    name: yup.string().required("Name is required.").trim(),
    email: yup.string().required("Email is required.").email("Email format is invalid.").lowercase().trim(),
    password: yup.string().required("Password is required.").min(8, "Password must be at least 8 characters."),
    role: yup.mixed<UserRole>().oneOf(["ADMIN", "USER"], "Role is invalid.").required("Role is required.")
  })
  .strict(true)
  .noUnknown(true, "Unknown fields are not allowed.");

export type CreateUserInput = yup.InferType<typeof createUserSchema>;

export const updateUserSchema = yup
  .object({
    name: yup.string().optional().trim(),
    email: yup.string().optional().email("Email format is invalid.").lowercase().trim(),
    password: yup.string().optional().min(8, "Password must be at least 8 characters."),
    role: yup.mixed<UserRole>().oneOf(["ADMIN", "USER"], "Role is invalid.").optional()
  })
  .test("at-least-one-field", "At least one field is required to update a user.", (value) => {
    if (!value) {
      return false;
    }
    return Object.keys(value).length > 0;
  })
  .strict(true)
  .noUnknown(true, "Unknown fields are not allowed.");

export type UpdateUserInput = yup.InferType<typeof updateUserSchema>;

export interface UsersFiltersInput {
  name?: string | null;
  email?: string | null;
  role?: UserRole | null;
  includeInactive?: boolean | null;
  limit?: number | null;
  offset?: number | null;
}

export const usersFiltersSchema: yup.ObjectSchema<UsersFiltersInput> = yup
  .object({
    name: yup.string().trim().notRequired(),
    email: yup.string().trim().notRequired(),
    role: yup.mixed<UserRole>().oneOf(["ADMIN", "USER"]).notRequired(),
    includeInactive: yup.boolean().notRequired(),
    limit: yup.number().integer().min(1).max(100).notRequired(),
    offset: yup.number().integer().min(0).notRequired()
  })
  .required();
