import { GraphQLError } from "graphql";

export const buildValidationGraphQLError = (fieldErrors: Record<string, string>): GraphQLError =>
  new GraphQLError("Validation error", {
    extensions: {
      code: "BAD_USER_INPUT",
      fieldErrors
    }
  });
