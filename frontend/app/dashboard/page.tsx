"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FolderKanban, Clock, DollarSign, UploadCloud, Activity
} from "lucide-react";

// Recharts (~200 KB) loaded only after KPI cards render
const DashboardCharts = dynamic(
  () => import("@/components/dashboard-charts").then((m) => m.DashboardCharts),
  { ssr: false, loading: () => <div className="space-y-4"><div className="h-56 animate-pulse rounded-2xl bg-muted" /><div className="h-56 animate-pulse rounded-2xl bg-muted" /></div> }
);
import { defaultBusinessRules, type BusinessRules } from "@/lib/business-rules.shared";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Database, Tables } from "@/lib/database.types";

// ── Types ─────────────────────────────────────────────────────────────────────
type Project = Pick<Tables<"projects">,
  "pqi_time" | "pqi_cost" | "percentage_progress" | "schedule_health" |
  "financial_health" | "project_manager" | "project_category" |
  "total_budget" | "budget_usage"
>;

type DashboardStatItem = Database["public"]["Functions"]["get_dashboard_summary"]["Returns"][0]["pqi_time_data"] extends (infer U)[] | null ? U : never;
type DashboardBudgetItem = Database["public"]["Functions"]["get_dashboard_summary"]["Returns"][0]["budget_data"] extends (infer U)[] | null ? U : never;
type DashboardSummaryRow = Database["public"]["Functions"]["get_dashboard_summary"]["Returns"][0];

type DashboardStats = {
  total: number;
  avgProgress: number;
  avgPqiTime: number;
  avgPqiCost: number;
  pqiTimeData: DashboardStatItem[];
  pqiCostData: DashboardStatItem[];
  progressData: Array<{ name: string; count: number }>;
  pmData: DashboardStatItem[];
  catData: DashboardStatItem[];
  budgetData: DashboardBudgetItem[];
  totalGrossProfit: number;
};

const getPqiBucket = (val: number | null) => {
  if (val === null) return "No Data";
  if (val < 1)  return "Black";
  if (val <= 70) return "Red";
  if (val < 91) return "Yellow";
  return "Green";
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color, loading,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; loading: boolean;
}) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">{label}</CardDescription>
        <div className={cn("rounded-lg p-2", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-1" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Custom Tooltip (kept for KpiCard — charts use their own copy in dashboard-charts) ──
interface ChartTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number | string; color?: string; fill?: string }[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border-0 bg-foreground px-3 py-2 text-xs text-background shadow-lg">
        {label && <p className="font-semibold mb-1">{label}</p>}
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-background/70">{p.name}:</span>
            <span className="font-medium">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const mapDashboardSummary = (row: DashboardSummaryRow): DashboardStats => {
  const toNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return {
    total: toNumber(row.total),
    avgProgress: toNumber(row.avg_progress),
    avgPqiTime: toNumber(row.avg_pqi_time),
    avgPqiCost: toNumber(row.avg_pqi_cost),
    pqiTimeData: row.pqi_time_data ?? [],
    pqiCostData: row.pqi_cost_data ?? [],
    progressData: row.progress_data ?? [],
    pmData: row.pm_data ?? [],
    catData: row.cat_data ?? [],
    budgetData: row.budget_data ?? [],
    totalGrossProfit: toNumber(row.total_gross_profit),
  };
};

// ── Data fetchers ──────────────────────────────────────────────────────────────
async function fetchBusinessRules(): Promise<BusinessRules> {
  const res = await fetch("/api/business-rules");
  if (!res.ok) return defaultBusinessRules;
  const payload = (await res.json()) as { rules?: BusinessRules };
  return payload.rules ?? defaultBusinessRules;
}

async function fetchDashboardSummary(): Promise<DashboardSummaryRow | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc("get_dashboard_summary");
  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data;
    return (row as DashboardSummaryRow) ?? null;
  }
  return null;
}

async function fetchFallbackProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured) return [];

  const { data: batchData } = await supabase
    .from("projects")
    .select("batch_number")
    .order("batch_number", { ascending: false })
    .limit(1);

  const maxBatch = batchData?.[0]?.batch_number;
  if (maxBatch == null) return [];

  const { data } = await supabase
    .from("projects")
    .select("pqi_time, pqi_cost, percentage_progress, schedule_health, financial_health, project_manager, project_category, total_budget, budget_usage")
    .eq("batch_number", maxBatch);

  return (data ?? []) as Project[];
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: businessRules = defaultBusinessRules } = useQuery({
    queryKey: ["business-rules"],
    queryFn: fetchBusinessRules,
    staleTime: 10 * 60 * 1000, // 10 minutes — rarely changes
  });

  const { data: rpcSummary, isLoading: rpcLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    staleTime: 2 * 60 * 1000,
    enabled: isSupabaseConfigured,
  });

  // Only fetch raw projects when the RPC returned null (server-side function unavailable)
  const { data: fallbackProjects = [], isLoading: fallbackLoading } = useQuery({
    queryKey: ["dashboard-fallback-projects"],
    queryFn: fetchFallbackProjects,
    staleTime: 2 * 60 * 1000,
    enabled: isSupabaseConfigured && rpcSummary === null && !rpcLoading,
  });

  const loading = rpcLoading || (rpcSummary === null && fallbackLoading);

  // ── Fallback computation ───────────────────────────────────────────────────
  const fallbackStats = useMemo<DashboardStats | null>(() => {
    if (fallbackProjects.length === 0) return null;

    const avg = (arr: (number | null)[]) => {
      const vals = arr.filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const kpiProjects = fallbackProjects.filter(
      p =>
        p.project_category?.toLowerCase() !== "maintenance" &&
        businessRules.kpiProjectManagers.includes(p.project_manager?.toLowerCase() ?? "")
    );

    const avgProgress = avg(kpiProjects.map(p => p.percentage_progress));
    const avgPqiTime  = avg(kpiProjects.map(p => p.pqi_time));
    const avgPqiCost  = avg(kpiProjects.map(p => p.pqi_cost));

    const pqiBuckets: Record<string, number> = { Black: 0, Red: 0, Yellow: 0, Green: 0 };
    const pqiCostBuckets: Record<string, number> = { Black: 0, Red: 0, Yellow: 0, Green: 0 };
    const pmMap: Record<string, number> = {};
    const catMap: Record<string, number> = {};

    for (const p of kpiProjects) {
      pqiBuckets[getPqiBucket(p.pqi_time)]++;
      pqiCostBuckets[getPqiBucket(p.pqi_cost)]++;
    }
    for (const p of fallbackProjects) {
      pmMap[p.project_manager || "Unknown"] = (pmMap[p.project_manager || "Unknown"] || 0) + 1;
      catMap[p.project_category || "Unknown"] = (catMap[p.project_category || "Unknown"] || 0) + 1;
    }

    const progressData = [
      { name: "0–25%",   range: [0, 25] },
      { name: "26–50%",  range: [26, 50] },
      { name: "51–75%",  range: [51, 75] },
      { name: "76–100%", range: [76, 100] },
    ].map(b => ({
      name: b.name,
      count: kpiProjects.filter(p => {
        const v = p.percentage_progress ?? 0;
        return v >= b.range[0] && v <= b.range[1];
      }).length,
    }));

    return {
      total: fallbackProjects.length,
      avgProgress, avgPqiTime, avgPqiCost,
      pqiTimeData: Object.entries(pqiBuckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })),
      pqiCostData: Object.entries(pqiCostBuckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })),
      progressData,
      pmData: Object.entries(pmMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })),
      catData: Object.entries(catMap).map(([name, value]) => ({ name, value })),
      budgetData: fallbackProjects
        .filter(p => p.total_budget && p.total_budget > 0)
        .sort((a, b) => (b.total_budget ?? 0) - (a.total_budget ?? 0))
        .slice(0, 10)
        .map((p, i) => ({
          name: `P${i + 1}`,
          budget: Math.round((p.total_budget ?? 0) / 1_000_000),
          usage: Math.round((p.budget_usage ?? 0) / 1_000_000),
        })),
      totalGrossProfit: 0,
    };
  }, [businessRules.kpiProjectManagers, fallbackProjects]);

  const stats = rpcSummary ? mapDashboardSummary(rpcSummary) : fallbackStats;
  const isEmpty = !loading && (!stats || stats.total === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Project Performance</h1>
        <p className="text-sm text-muted-foreground">
          Real-time overview of project health, performance, and portfolio metrics.
        </p>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card p-16 text-center shadow-sm">
          <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No Project Data Yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">
            Upload your Excel file to see your live PMO dashboard with charts and KPIs.
          </p>
          <Link
            href="/dashboard/projects"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to List of Projects →
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      {(loading || stats) && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Projects"    value={loading ? "–" : stats!.total}                             icon={FolderKanban} color="bg-indigo-500"   loading={loading} />
          <KpiCard label="GP Achievement" value={loading ? "–" : `${((stats!.totalGrossProfit / businessRules.targetGrossProfit) * 100).toFixed(1)}%`} icon={Activity} color="bg-emerald-500" loading={loading} sub="total gross profit / target gross profit" />
          <KpiCard label="Avg PQI Time"      value={loading ? "–" : `${stats!.avgPqiTime.toFixed(1)}%`}       icon={Clock}        color="bg-amber-500"    loading={loading} sub="schedule performance" />
          <KpiCard label="Avg PQI Cost"      value={loading ? "–" : `${stats!.avgPqiCost.toFixed(1)}%`}       icon={DollarSign}   color="bg-rose-500"     loading={loading} sub="cost performance" />
        </section>
      )}

      {(loading || stats) && (
        <DashboardCharts
          loading={loading}
          pqiTimeData={(stats?.pqiTimeData ?? []) as { name: string; value: number }[]}
          pqiCostData={(stats?.pqiCostData ?? []) as { name: string; value: number }[]}
          progressData={(stats?.progressData ?? []) as { name: string; count: number }[]}
          pmData={(stats?.pmData ?? []) as { name: string; value: number }[]}
          catData={(stats?.catData ?? []) as { name: string; value: number }[]}
          budgetData={(stats?.budgetData ?? []) as { name: string; budget: number; usage: number }[]}
        />
      )}
    </div>
  );
}
