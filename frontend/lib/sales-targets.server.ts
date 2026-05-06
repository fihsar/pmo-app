import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AmTarget, CategoryTarget, SalesTargets } from "./sales-targets.shared";
import type { Database } from "@/lib/database.types";

export async function getSalesTargets(): Promise<SalesTargets> {
  const [amResult, catResult] = await Promise.all([
    getSupabaseAdmin().from("am_master").select("id, name, is_active, annual_target").order("name"),
    getSupabaseAdmin().from("category_targets").select("category, target").order("category"),
  ]);

  const amTargets: AmTarget[] = (amResult.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    isActive: r.is_active,
    annualTarget: Number(r.annual_target ?? 0),
  }));

  const categoryTargets: CategoryTarget[] = (catResult.data ?? []).map((r) => ({
    category: r.category as CategoryTarget["category"],
    target: Number(r.target ?? 0),
  }));

  return { amTargets, categoryTargets };
}

export type SaveAmTargetsInput = { id: number; annualTarget: number }[];
export type SaveCategoryTargetsInput = { category: string; target: number }[];

export async function saveAmTargets(inputs: SaveAmTargetsInput): Promise<void> {
  for (const { id, annualTarget } of inputs) {
    const { error } = await getSupabaseAdmin()
      .from("am_master")
      .update({ annual_target: annualTarget })
      .eq("id", id);
    if (error) throw new Error(`Failed to update AM ${id}: ${error.message}`);
  }
}

export async function saveCategoryTargets(inputs: SaveCategoryTargetsInput): Promise<void> {
  for (const { category, target } of inputs) {
    const { error } = await getSupabaseAdmin()
      .from("category_targets")
      .update({ target, updated_at: new Date().toISOString() })
      .eq("category", category);
    if (error) throw new Error(`Failed to update category ${category}: ${error.message}`);
  }
}
