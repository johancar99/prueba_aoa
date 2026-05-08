import { Types } from "mongoose";
import { buildValidationGraphQLError } from "../graphql/errors/graphql-error.factory";

/**
 * Validates and converts a string to a Mongoose ObjectId.
 * Throws a structured validation GraphQL error if invalid.
 */
export const ensureValidObjectId = (value: string, fieldName: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw buildValidationGraphQLError({ [fieldName]: `Invalid ${fieldName}.` });
  }

  return new Types.ObjectId(value);
};

/**
 * Normalizes a Mongoose ObjectId or string to a plain string.
 */
export const normalizeObjectId = (value: Types.ObjectId | string): string =>
  typeof value === "string" ? value : value.toString();
