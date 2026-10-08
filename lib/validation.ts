import { z } from "zod";

// Whole number, at least 1. Rejects negatives, decimals, text, empty.
const positiveInt = (label: string) =>
  z
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .positive(`${label} must be greater than 0`);

// Whole number, 0 or more (a counted shortage can be 0).
const nonNegativeInt = (label: string) =>
  z
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} cannot be negative`);

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const createOrderSchema = z.object({
  recipeId: z.string().min(1, "Select a recipe"),
  targetQty: positiveInt("Batch quantity").max(100000, "Batch quantity is too large"),
  fabricRollId: z.string().trim().min(1, "Fabric roll ID is required").max(50),
  // Yards may have decimals (e.g. 92.5) but must be positive, max 2 decimals.
  actualFabricYds: z
    .number({ invalid_type_error: "Fabric used must be a number" })
    .positive("Fabric used must be greater than 0")
    .max(1000000, "Fabric used is too large")
    .refine((v) => Math.round(v * 100) / 100 === v, "Use at most 2 decimal places"),
});

export const submitCountsSchema = z.object({
  counts: z
    .array(
      z.object({
        componentId: z.string().min(1),
        actualQty: nonNegativeInt("Counted quantity"),
      })
    )
    .min(1, "Enter at least one count"),
});

export const rejectSchema = z.object({
  note: z
    .string()
    .trim()
    .min(5, "Rejection reason must be at least 5 characters")
    .max(500, "Rejection reason is too long"),
});