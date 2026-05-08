import * as yup from "yup";

const movementTypeValues = ["IN", "OUT"] as const;

export type MovementTypeInput = (typeof movementTypeValues)[number];

export interface RegisterMovementInput {
  productId: string;
  type: MovementTypeInput;
  quantity: number;
  unitPrice?: number;
  observations?: string | null;
}

export interface GlobalMovementsFiltersInput {
  productId?: string | null;
  type?: MovementTypeInput | null;
  startDate?: string | null;
  endDate?: string | null;
  limit?: number | null;
  offset?: number | null;
}

const positiveNumberMessage = "Must be a number greater than 0.";

export const registerMovementSchema: yup.ObjectSchema<RegisterMovementInput> = yup
  .object({
    productId: yup.string().trim().required("Product is required."),
    type: yup
      .mixed<MovementTypeInput>()
      .oneOf(movementTypeValues, "Invalid movement type.")
      .required("Movement type is required."),
    quantity: yup.number().typeError(positiveNumberMessage).moreThan(0, positiveNumberMessage).required(),
    unitPrice: yup
      .number()
      .transform((value, originalValue) => (originalValue === null || originalValue === "" ? undefined : value))
      .typeError("Unit price must be a valid number.")
      .min(0, "Unit price cannot be negative.")
      .when("type", {
        is: "IN",
        then: (schema) => schema.moreThan(0, "Unit price must be greater than 0 for entries.").required(),
        otherwise: (schema) => schema.notRequired()
      }),
    observations: yup
      .string()
      .trim()
      .max(500, "Observations cannot exceed 500 characters.")
      .notRequired()
  })
  .required();

export const globalMovementsFiltersSchema: yup.ObjectSchema<GlobalMovementsFiltersInput> = yup
  .object({
    productId: yup.string().trim().notRequired(),
    type: yup.mixed<MovementTypeInput>().oneOf(movementTypeValues).notRequired(),
    startDate: yup.string().trim().notRequired(),
    endDate: yup.string().trim().notRequired(),
    limit: yup.number().integer().min(1).max(100).notRequired(),
    offset: yup.number().integer().min(0).notRequired()
  })
  .required();
