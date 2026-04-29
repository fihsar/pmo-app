import { defaultBusinessRules, type BusinessRules } from "@/lib/business-rules.shared";

export type Category = "FCC" | "CSS" | "UNCLASSIFIED";

export type CategoryResult = {
  category: Category;
  category_note: "strict-override" | "col-based" | "keyword-based" | "split" | "manual-review";
};

const CATEGORY_NOTES: CategoryResult["category_note"][] = [
  "strict-override",
  "col-based",
  "keyword-based",
  "split",
  "manual-review",
];

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

function parseNumeric(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function readFirst(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return null;
}

function readNumeric(row: Record<string, unknown>, keys: string[]): number | null {
  return parseNumeric(readFirst(row, keys));
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    if (keyword === "va") {
      return /\bva\b/.test(text);
    }
    return text.includes(keyword);
  });
}

function parseCategoryNote(value: unknown): CategoryResult["category_note"] | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return CATEGORY_NOTES.includes(normalized as CategoryResult["category_note"])
    ? (normalized as CategoryResult["category_note"])
    : null;
}

export function determineCategory(row: Record<string, unknown>, rules?: BusinessRules): CategoryResult {
  const existingCategory = String(readFirst(row, ["category", "CATEGORY", "project_category"]) || "");
  const name = normalizeText(readFirst(row, ["PROJECT_NAME", "PROSPECT_NAME", "project_name", "prospect_name"]));
  const keywordRules = rules?.keywordRules ?? defaultBusinessRules.keywordRules;

  // 1. Strict Overrides (Highest priority)
  if (hasKeyword(name, keywordRules.strictFccKeywords)) {
    return { category: "FCC", category_note: "strict-override" };
  }

  if (hasKeyword(name, keywordRules.strictCssKeywords)) {
    return { category: "CSS", category_note: "strict-override" };
  }

  // 2. Trust already classified data from DB if it's not UNCLASSIFIED
  if (existingCategory === "FCC" || existingCategory === "CSS") {
    return { 
      category: existingCategory as Category, 
      category_note: parseCategoryNote(row["category_note"]) ?? "col-based",
    };
  }

  const sales3sw = readNumeric(row, ["SALES_3SW", "sales_3sw"]);
  const osvOsl = readNumeric(row, ["OSV - OSL", "SALES_OSV_OSL", "sales_osv_osl"]);
  const osvNonOsl = readNumeric(row, [
    "SALES_OSV_NonOSL",
    "SALES_OSV_NONOSL",
    "OSV - Non OSL",
    "sales_osv_nonosl",
    "osv_non_osl",
  ]);

  if ((sales3sw ?? 0) > 0 && osvNonOsl === null) {
    return { category: "CSS", category_note: "col-based" };
  }

  if ((osvOsl ?? 0) > 0 && osvNonOsl === 0) {
    return { category: "FCC", category_note: "col-based" };
  }

  const hasFcc = hasKeyword(name, keywordRules.fccKeywords);
  const hasCss = hasKeyword(name, keywordRules.cssKeywords);

  if (hasFcc && hasCss) {
    return { category: "UNCLASSIFIED", category_note: "split" };
  }

  if (hasFcc) return { category: "FCC", category_note: "keyword-based" };
  if (hasCss) return { category: "CSS", category_note: "keyword-based" };

  return { category: "UNCLASSIFIED", category_note: "manual-review" };
}
