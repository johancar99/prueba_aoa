import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../../types";

export type UserRole = "ADMIN" | "USER";

/**
 * Asserts the request is authenticated.
 * Returns the authenticated userId or throws UNAUTHORIZED.
 */
export const requireAuth = (context: GraphQLContext): string => {
  if (!context.userId) {
    throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
  }

  return context.userId;
};

/**
 * Asserts the request is authenticated AND the user has the required role.
 * Throws FORBIDDEN if the role doesn't match.
 */
export const requireRole = (context: GraphQLContext, role: UserRole): string => {
  const userId = requireAuth(context);

  if (context.userRole !== role) {
    throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
  }

  return userId;
};
