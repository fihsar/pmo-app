import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { defaultBusinessRules, normalizeBusinessRules, type BusinessRules } from "@/lib/business-rules.shared";
import type { Database } from "@/lib/database.types";

type BusinessRulesRow = Database["public"]["Tables"]["business_rules"]["Row"];

export async function getBusinessRules(): Promise<BusinessRules> {
  const { data, error } = await getSupabaseAdmin()
    .from("business_rules")
    .select("rules")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return normalizeBusinessRules(defaultBusinessRules);
  }

  return normalizeBusinessRules(data.rules as Partial<BusinessRules>);
}

export async function saveBusinessRules(rules: Partial<BusinessRules>): Promise<BusinessRules> {
  const normalized = normalizeBusinessRules(rules);

  const { error } = await getSupabaseAdmin()
    .from("business_rules")
    .upsert(
      { id: 1, rules: normalized as unknown as Database["public"]["Tables"]["business_rules"]["Insert"]["rules"], updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) throw new Error(`Failed to save business rules: ${error.message}`);
  return normalized;
}
