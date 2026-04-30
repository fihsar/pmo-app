import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { defaultBusinessRules, normalizeBusinessRules, type BusinessRules } from "@/lib/business-rules.shared";

type BusinessRulesRow = {
  id: number;
  rules: Record<string, unknown>;
  updated_at: string;
};

// audit_log and business_rules are not in the generated database.types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function getBusinessRules(): Promise<BusinessRules> {
  const { data, error } = await db()
    .from("business_rules")
    .select("rules")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return normalizeBusinessRules(defaultBusinessRules);
  }

  return normalizeBusinessRules((data as BusinessRulesRow).rules as Partial<BusinessRules>);
}

export async function saveBusinessRules(rules: Partial<BusinessRules>): Promise<BusinessRules> {
  const normalized = normalizeBusinessRules(rules);

  const { error } = await db()
    .from("business_rules")
    .upsert(
      { id: 1, rules: normalized, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) throw new Error(`Failed to save business rules: ${error.message}`);
  return normalized;
}
