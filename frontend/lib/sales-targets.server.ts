import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AmTarget, CategoryTarget, SalesTargets } from "./sales-targets.shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function getSalesTargets(): Promise<SalesTargets> {
  const [amResult, catResult] = await Promise.all([
    db().from("am_master").select("id, name, is_active, annual_target").order("name"),
    db().from("category_targets").select("category, target").order("category"),
  ]);

  const amTargets: AmTarget[] = (amResult.data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    isActive: r.is_active,
    annualTarget: Number(r.annual_target ?? 0),
  }));

  const categoryTargets: CategoryTarget[] = (catResult.data ?? []).map((r: any) => ({
    category: r.category,
    target: Number(r.target ?? 0),
  }));

  return { amTargets, categoryTargets };
}

export type SaveAmTargetsInput = { id: number; annualTarget: number }[];
export type SaveCategoryTargetsInput = { category: string; target: number }[];

export async function saveAmTargets(inputs: SaveAmTargetsInput): Promise<void> {
  for (const { id, annualTarget } of inputs) {
    const { error } = await db()
      .from("am_master")
      .update({ annual_target: annualTarget })
      .eq("id", id);
    if (error) throw new Error(`Failed to update AM ${id}: ${error.message}`);
  }
}

export async function saveCategoryTargets(inputs: SaveCategoryTargetsInput): Promise<void> {
  for (const { category, target } of inputs) {
    const { error } = await db()
      .from("category_targets")
      .update({ target, updated_at: new Date().toISOString() })
      .eq("category", category);
    if (error) throw new Error(`Failed to update category ${category}: ${error.message}`);
  }
}
