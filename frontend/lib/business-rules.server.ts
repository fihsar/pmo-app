import "server-only";

import { defaultBusinessRules, normalizeBusinessRules, type BusinessRules } from "@/lib/business-rules.shared";
import { readOrCreateJsonFile, writeJsonFile } from "@/lib/local-json-store.server";

const FILE_NAME = "business-rules.json";

export async function getBusinessRules(): Promise<BusinessRules> {
  const stored = await readOrCreateJsonFile<BusinessRules>(FILE_NAME, defaultBusinessRules);
  return normalizeBusinessRules(stored);
}

export async function saveBusinessRules(rules: Partial<BusinessRules>): Promise<BusinessRules> {
  const normalized = normalizeBusinessRules(rules);
  await writeJsonFile(FILE_NAME, normalized);
  return normalized;
}
