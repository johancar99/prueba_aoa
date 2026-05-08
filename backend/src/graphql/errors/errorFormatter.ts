import { GraphQLError, type GraphQLFormattedError } from "graphql";
import { env } from "../../config/env";

interface FieldValidationError {
  path?: string;
  message: string;
}

interface ValidationOriginalError extends Error {
  name: string;
  path?: string;
  inner?: FieldValidationError[];
  code?: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
}

interface TechnicalErrorClassification {
  code: string;
  message: string;
}

const INPUT_ERROR_CODES = new Set(["BAD_USER_INPUT", "GRAPHQL_VALIDATION_FAILED"]);

const extractFieldErrorsFromGraphQLMessage = (message: string): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};
  const missingFieldMatch = message.match(/Field "([^"]+)" of required type "[^"]+" was not provided/i);

  if (missingFieldMatch?.[1]) {
    const fieldName = missingFieldMatch[1];
    fieldErrors[fieldName] = "This field is required.";
  }

  return fieldErrors;
};

const extractFieldErrorsFromExtensions = (extensions: Record<string, unknown>): Record<string, string> => {
  const rawFieldErrors = extensions.fieldErrors;

  if (!rawFieldErrors || typeof rawFieldErrors !== "object" || Array.isArray(rawFieldErrors)) {
    return {};
  }

  const fieldErrors: Record<string, string> = {};
  for (const [field, fieldMessage] of Object.entries(rawFieldErrors)) {
    if (typeof fieldMessage === "string") {
      fieldErrors[field] = fieldMessage;
    }
  }

  return fieldErrors;
};

const classifyTechnicalError = (error: GraphQLError): TechnicalErrorClassification => {
  const rawMessage = error.message.toLowerCase();
  const originalName = error.originalError?.name?.toLowerCase() ?? "";
  const extensionCode = typeof error.extensions?.code === "string" ? error.extensions.code : "";

  const isTimeoutError =
    rawMessage.includes("timeout") || originalName.includes("timeout") || extensionCode === "TIMEOUT";
  if (isTimeoutError) {
    return {
      code: "TIMEOUT_ERROR",
      message: "The operation took too long to respond. Please try again."
    };
  }

  const isDatabaseConnectionError =
    originalName.includes("mongoose") ||
    rawMessage.includes("mongodb") ||
    rawMessage.includes("econnrefused") ||
    rawMessage.includes("server selection") ||
    extensionCode === "DB_CONNECTION_ERROR";
  if (isDatabaseConnectionError) {
    return {
      code: "DB_CONNECTION_ERROR",
      message: "Unable to connect to the database at the moment."
    };
  }

  const isServiceUnavailableError =
    rawMessage.includes("service unavailable") ||
    rawMessage.includes("network") ||
    rawMessage.includes("fetch failed") ||
    extensionCode === "SERVICE_UNAVAILABLE";
  if (isServiceUnavailableError) {
    return {
      code: "SERVICE_UNAVAILABLE",
      message: "The service is temporarily unavailable. Please try again."
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "An internal error occurred. Please try again in a few minutes."
  };
};

const formatFieldValidationErrors = (validationError: ValidationOriginalError): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(validationError.inner) && validationError.inner.length > 0) {
    for (const item of validationError.inner) {
      if (item.path && !fieldErrors[item.path]) {
        fieldErrors[item.path] = item.message;
      }
    }
  }

  if (validationError.path && !fieldErrors[validationError.path]) {
    fieldErrors[validationError.path] = validationError.message;
  }

  return fieldErrors;
};

const formatError = (error: GraphQLError): GraphQLFormattedError => {
  const originalError = error.originalError as ValidationOriginalError | undefined;
  const isProduction = env.nodeEnv === "production";

  if (!isProduction) {
    // eslint-disable-next-line no-console
    console.error("[GraphQL Error]", {
      message: error.message,
      extensions: error.extensions,
      originalErrorName: originalError?.name,
      originalErrorCode: originalError?.code,
      originalErrorMessage: originalError?.message
    });
  }

  if (originalError?.name === "ValidationError") {
    return {
      message: "The submitted data is invalid. Please review the fields and try again.",
      extensions: {
        code: "VALIDATION_ERROR",
        fieldErrors: formatFieldValidationErrors(originalError)
      }
    };
  }

  if (originalError?.code === 11000) {
    const duplicatedField = Object.keys(originalError.keyPattern ?? {})[0] ?? "field";
    const duplicatedValue = originalError.keyValue?.[duplicatedField];
    const valueLabel =
      typeof duplicatedValue === "string" || typeof duplicatedValue === "number"
        ? `"${duplicatedValue}"`
        : "provided value";

    return {
      message: "The request contains invalid data. Please review the fields and try again.",
      extensions: {
        code: "VALIDATION_ERROR",
        fieldErrors: {
          [duplicatedField]: `${duplicatedField} ${valueLabel} is already registered.`
        }
      }
    };
  }

  let message = error.message;
  let code = typeof error.extensions?.code === "string" ? error.extensions.code : "INTERNAL_SERVER_ERROR";
  let fieldErrors: Record<string, string> | undefined;

  if (INPUT_ERROR_CODES.has(code)) {
    message = "The request contains invalid data. Please review the fields and try again.";
    code = "VALIDATION_ERROR";
    fieldErrors = extractFieldErrorsFromExtensions(error.extensions ?? {});

    if (Object.keys(fieldErrors).length === 0) {
      fieldErrors = extractFieldErrorsFromGraphQLMessage(error.message);
    }
  } else if (code === "INTERNAL_SERVER_ERROR") {
    const technicalError = classifyTechnicalError(error);
    code = technicalError.code;
    message = technicalError.message;
  }

  const safeExtensions: Record<string, unknown> = { code };
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    safeExtensions.fieldErrors = fieldErrors;
  }

  return {
    message,
    extensions: safeExtensions
  };
};

/**
 * Apollo Server v4 formatError hook.
 * The second argument is the original error thrown (GraphQLError or unknown).
 */
export const formatGraphQLError = (
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError => {
  const graphqlError =
    error instanceof GraphQLError
      ? error
      : new GraphQLError(formattedError.message ?? "Unknown error");

  return formatError(graphqlError);
};
