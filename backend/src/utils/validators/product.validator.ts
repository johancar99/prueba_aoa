import * as yup from "yup";

const alphanumericRegex = /^[a-zA-Z0-9]+$/;

export const createProductSchema = yup
  .object({
    code: yup
      .string()
      .required("Product code is required.")
      .trim()
      .matches(alphanumericRegex, "Product code must be alphanumeric."),
    name: yup.string().required("Product name is required.").trim(),
    description: yup.string().optional().trim(),
    category: yup.string().optional().trim(),
    stock: yup
      .number()
      .optional()
      .min(0, "Stock cannot be negative."),
    minStock: yup
      .number()
      .required("Minimum stock is required.")
      .moreThan(0, "Minimum stock must be a positive number."),
    salePrice: yup
      .number()
      .required("Sale price is required.")
      .moreThan(0, "Sale price must be a positive number."),
    averagePrice: yup
      .number()
      .optional()
      .min(0, "Average price cannot be negative.")
  })
  .strict(true)
  .noUnknown(true, "Unknown fields are not allowed.");

export const updateProductSchema = yup
  .object({
    code: yup.string().optional().trim().matches(alphanumericRegex, "Product code must be alphanumeric."),
    name: yup.string().optional().trim(),
    description: yup.string().optional().trim(),
    category: yup.string().optional().trim(),
    minStock: yup.number().optional().moreThan(0, "Minimum stock must be a positive number."),
    salePrice: yup.number().optional().moreThan(0, "Sale price must be a positive number."),
    status: yup.boolean().optional()
  })
  .test("at-least-one-field", "At least one field is required to update a product.", (value) => {
    if (!value) {
      return false;
    }

    return Object.keys(value).length > 0;
  })
  .strict(true)
  .noUnknown(true, "Unknown fields are not allowed.");

export type CreateProductInput = yup.InferType<typeof createProductSchema>;
export type UpdateProductInput = yup.InferType<typeof updateProductSchema>;
