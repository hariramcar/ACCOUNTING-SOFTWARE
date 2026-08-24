import { z } from 'zod';
import { toDecimal } from './math';

// Helper to preprocess form-data string inputs into safe Decimals
const decimalPreprocess = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  return toDecimal(val).toNumber(); // We validate against the number
};

export const ZDecimal = z.preprocess(
  decimalPreprocess,
  z.number({ invalid_type_error: "Must be a valid number" })
);

export const ZDate = z.preprocess((val) => {
  if (val === null || val === undefined || val === '') return new Date();
  return new Date(val);
}, z.date({ invalid_type_error: "Must be a valid date" }));

export const ZId = z.string().uuid({ message: "Invalid ID format" });
export const ZOptionalId = z.string().uuid().optional().or(z.literal(''));

export const AddVehicleSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  registration: z.string().optional().nullable().refine(val => {
    if (!val) return true;
    return /^[A-Za-z]{2}[ -]?[0-9]{2}[ -]?[A-Za-z]{0,3}[ -]?[0-9]{4}$/.test(val.trim());
  }, { message: "Invalid Registration Number format. Example: GJ 01 BS 8801" }),
  purchasePrice: ZDecimal.refine(v => v >= 0, "Purchase price must be positive"),
  purchaseDate: ZDate.default(() => new Date()),
  isLegacy: z.boolean().default(false),
  legacyExpenses: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return 0;
    return val;
  }, ZDecimal),
});

export const SellVehicleSchema = z.object({
  vehicleId: ZId,
  salePrice: ZDecimal.refine(v => v > 0, "Sale price must be greater than zero"),
  saleDate: ZDate.default(() => new Date()),
  customerName: z.string().min(1, "Customer Name is required"),
  customerMobile: z.string().optional().nullable(),
  receivableAccountId: ZOptionalId.nullable(),
  appliedTokenId: ZOptionalId.nullable(),
});

export const AddExpenseSchema = z.object({
  amount: ZDecimal.refine(v => v > 0, "Amount must be greater than zero"),
  description: z.string().min(1, "Description is required"),
  expenseType: z.enum(['CAR_EXPENSE', 'OFFICE_EXPENSE', 'INCOME']),
  vehicleId: ZOptionalId.nullable(),
});
