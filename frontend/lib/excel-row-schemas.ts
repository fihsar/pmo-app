import { z } from "zod";

// ── Coercion helpers ──────────────────────────────────────────────────────────
// Excel cells arrive as string | number | null | undefined from sheet_to_json.
// These coercions mirror the parseNumeric / parseDate helpers already in use.

const nullableNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const s = String(v).trim().replace(/%/g, "");
    const normalized = s.includes(",") && !s.includes(".") ? s.replace(/,/g, ".") : s.replace(/,/g, "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  })
  .nullable();

const nullableText = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined ? null : String(v).trim() || null))
  .nullable();

// ── Project row (from Projects Excel) ────────────────────────────────────────
export const projectRowSchema = z.object({
  PROJECT_ID:           nullableText,
  CUSTOMER:             nullableText,
  PROJECT_NAME:         nullableText,
  PROJECT_MANAGER:      nullableText,
  ACCOUNT_MANAGER:      nullableText,
  PROJECT_CATEGORY:     nullableText,
  SCHEDULE_HEALTH:      nullableText,
  FINANCIAL_HEALTH:     nullableText,
  CURRENT_STAGE:        nullableText,
  // Required KPI fields — warn if these are missing on a row
  PERCENTAGE_PROGRESS:  nullableNumber,
  PQI_TIME:             nullableNumber,
  PQI_COST:             nullableNumber,
  // Everything else is optional
  PCS_STATUS:           nullableText.optional(),
  PROJECT_REFERENCE:    nullableText.optional(),
  TOTAL_SALES:          nullableNumber.optional(),
  GROSS_PROFIT:         nullableNumber.optional(),
  NPP:                  nullableNumber.optional(),
  TOTAL_BUDGET:         nullableNumber.optional(),
  BUDGET_USAGE:         nullableNumber.optional(),
}).passthrough(); // allow unknown columns so new Excel versions don't hard-fail

export type ProjectRow = z.infer<typeof projectRowSchema>;

// ── Prospect row (from Prospects Excel) ──────────────────────────────────────
export const prospectRowSchema = z.object({
  AM_NAME:              nullableText,
  COMPANY_NAME:         nullableText,
  PROSPECT_NAME:        nullableText,
  CLIENT_NAME:          nullableText,
  STATUS:               nullableText,
  AMOUNT:               nullableNumber,
  GP:                   nullableNumber,
  // Optional
  ID_PROJECT:           nullableText.optional(),
  TERM_OF_PAYMENT:      nullableText.optional(),
  CONFIDENCE_LEVEL:     nullableNumber.optional(),
  OSV_NON_OSL:          nullableNumber.optional(),
  OPR_DEL:              nullableNumber.optional(),
}).passthrough();

export type ProspectRow = z.infer<typeof prospectRowSchema>;

// ── Validation helper ─────────────────────────────────────────────────────────
export type RowValidationResult<T> = {
  valid: T[];
  invalidCount: number;
  firstErrors: string[]; // first few error messages, for user display
};

export function validateRows<T>(
  schema: z.ZodSchema<T>,
  rows: Record<string, unknown>[],
  maxErrors = 5
): RowValidationResult<T> {
  const valid: T[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const result = schema.safeParse(rows[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      const issues = result.error.issues.map((iss) => `Row ${i + 2}: ${iss.path.join(".")} — ${iss.message}`);
      errors.push(...issues);
    }
  }

  return {
    valid,
    invalidCount: rows.length - valid.length,
    firstErrors: errors.slice(0, maxErrors),
  };
}
