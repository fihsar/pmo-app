"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FolderKanban, TrendingUp, Clock, DollarSign, UploadCloud,
  Activity
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type Project = {
  pqi_time: number | null;
  pqi_cost: number | null;
  percentage_progress: number | null;
  schedule_health: string | null;
  financial_health: string | null;
  project_manager: string | null;
  project_category: string | null;
  total_budget: number | null;
  budget_usage: number | null;
};


type DashboardStatItem = { name: string; value: number };
type DashboardBudgetItem = { name: string; budget: number; usage: number };

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

const TARGET_GROSS_PROFIT = 36_000_000_000;

type DashboardSummaryRow = {
  total: number | string | null;
  avg_progress: number | string | null;
  avg_pqi_time: number | string | null;
  avg_pqi_cost: number | string | null;
  pqi_time_data: DashboardStatItem[] | null;
  pqi_cost_data: DashboardStatItem[] | null;
  sched_data: DashboardStatItem[] | null;
  fin_data: DashboardStatItem[] | null;
  progress_data: Array<{ name: string; count: number }> | null;
  pm_data: DashboardStatItem[] | null;
  cat_data: DashboardStatItem[] | null;
  budget_data: DashboardBudgetItem[] | null;
  total_gross_profit: number | string | null;
};


// ── Color helpers ──────────────────────────────────────────────────────────────
const PQI_COLORS = {
  Black:  "#6b7280",
  Red:    "#ef4444",
  Yellow: "#f59e0b",
  Green:  "#16a34a",
};

const getPqiBucket = (val: number | null) => {
  if (val === null) return "No Data";
  if (val < 1)  return "Black";
  if (val <= 70) return "Red";
  if (val < 91) return "Yellow";
  return "Green";
};

const CHART_COLORS = [
  "#6366f1","#22c55e","#f59e0b","#ef4444","#3b82f6",
  "#a855f7","#14b8a6","#f97316","#ec4899","#8b5cf6",
];

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

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [summaryStats, setSummaryStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured) { setLoading(false); return; }

      let rpcSummary: DashboardSummaryRow | null = null;

      try {
        const { data: summaryData, error: summaryError } = await supabase.rpc("get_dashboard_summary");
        if (!summaryError && summaryData) {
          const row = Array.isArray(summaryData) ? summaryData[0] : summaryData;
          if (row) {
            rpcSummary = row as DashboardSummaryRow;
          }
        }
      } catch (err) {
        console.error("RPC failed, falling back to manual computation:", err);
      }

      if (rpcSummary) {
        setSummaryStats(mapDashboardSummary(rpcSummary));
      } else {
        // Fetch Projects only when RPC is unavailable and we must compute fallback stats.
        const { data: maxProjBatchData } = await supabase
          .from("projects")
          .select("batch_number")
          .order("batch_number", { ascending: false })
          .limit(1);

        const maxProjBatch = maxProjBatchData && maxProjBatchData.length > 0 ? maxProjBatchData[0].batch_number : null;

        if (maxProjBatch !== null) {
          const { data: projData } = await supabase
            .from("projects")
            .select("pqi_time, pqi_cost, percentage_progress, schedule_health, financial_health, project_manager, project_category, total_budget, budget_usage")
            .eq("batch_number", maxProjBatch);
          if (projData) setProjects(projData as Project[]);
        }

        setSummaryStats(null);
      }

      setLoading(false);
    };
    void fetchData();
  }, []);

  // ── Computed Stats ─────────────────────────────────────────────────────────
  const fallbackStats = useMemo(() => {
    const total = projects.length;
    if (total === 0) return null;

    const avg = (arr: (number | null)[]) => {
      const vals = arr.filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    // KPI averages: exclude maintenance projects AND only include specific PMs
    const KPI_PMS = [
      "yohanes ivan enda",
      "khoirul tasya",
      "mahendra gati",
      "tasya tamaraputri",
    ];

    const kpiProjects = projects.filter(
      p =>
        p.project_category?.toLowerCase() !== "maintenance" &&
        KPI_PMS.includes(p.project_manager?.toLowerCase() ?? "")
    );

    const avgProgress = avg(kpiProjects.map(p => p.percentage_progress));
    const avgPqiTime  = avg(kpiProjects.map(p => p.pqi_time));
    const avgPqiCost  = avg(kpiProjects.map(p => p.pqi_cost));

    // PQI Time Health buckets (only specific PMs, no maintenance)
    const pqiBuckets: Record<string, number> = { Black: 0, Red: 0, Yellow: 0, Green: 0 };
    kpiProjects.forEach(p => { pqiBuckets[getPqiBucket(p.pqi_time)]++; });
    const pqiTimeData = Object.entries(pqiBuckets)
      .filter(([,v]) => v > 0)
      .map(([name, value]) => ({ name, value }));

    // PQI Cost Health buckets (only specific PMs, no maintenance)
    const pqiCostBuckets: Record<string, number> = { Black: 0, Red: 0, Yellow: 0, Green: 0 };
    kpiProjects.forEach(p => { pqiCostBuckets[getPqiBucket(p.pqi_cost)]++; });
    const pqiCostData = Object.entries(pqiCostBuckets)
      .filter(([,v]) => v > 0)
      .map(([name, value]) => ({ name, value }));

    // Progress buckets
    const progBands = [
      { name: "0–25%",   range: [0, 25] },
      { name: "26–50%",  range: [26, 50] },
      { name: "51–75%",  range: [51, 75] },
      { name: "76–100%", range: [76, 100] },
    ];
    const progressData = progBands.map(b => ({
      name: b.name,
      count: kpiProjects.filter(p => {
        const v = p.percentage_progress ?? 0;
        return v >= b.range[0] && v <= b.range[1];
      }).length,
    }));

    // Top PMs
    const pmMap: Record<string, number> = {};
    projects.forEach(p => {
      const k = p.project_manager || "Unknown";
      pmMap[k] = (pmMap[k] || 0) + 1;
    });
    const pmData = Object.entries(pmMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Category
    const catMap: Record<string, number> = {};
    projects.forEach(p => {
      const k = p.project_category || "Unknown";
      catMap[k] = (catMap[k] || 0) + 1;
    });
    const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    // Budget top 10 (only projects with data)
    const budgetData = projects
      .filter(p => p.total_budget && p.total_budget > 0)
      .sort((a, b) => (b.total_budget ?? 0) - (a.total_budget ?? 0))
      .slice(0, 10)
      .map((p, i) => ({
        name: `P${i + 1}`,
        budget: Math.round((p.total_budget ?? 0) / 1_000_000),
        usage:  Math.round((p.budget_usage  ?? 0) / 1_000_000),
      }));


    const totalGrossProfit = 0;

    return {
      total, avgProgress, avgPqiTime, avgPqiCost,
      pqiTimeData, pqiCostData,
      progressData, pmData, catData, budgetData, totalGrossProfit,
    };
  }, [projects]);

  const stats = summaryStats ?? fallbackStats;

  // ── Empty State ────────────────────────────────────────────────────────────
  const isEmpty = !loading && (!stats || stats.total === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Project Dashboard</h1>
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
          <KpiCard label="GP Achievement" value={loading ? "–" : `${((stats!.totalGrossProfit / TARGET_GROSS_PROFIT) * 100).toFixed(1)}%`} icon={Activity} color="bg-emerald-500" loading={loading} sub="total gross profit / target gross profit" />
          <KpiCard label="Avg PQI Time"      value={loading ? "–" : `${stats!.avgPqiTime.toFixed(1)}%`}       icon={Clock}        color="bg-amber-500"    loading={loading} sub="schedule performance" />
          <KpiCard label="Avg PQI Cost"      value={loading ? "–" : `${stats!.avgPqiCost.toFixed(1)}%`}       icon={DollarSign}   color="bg-rose-500"     loading={loading} sub="cost performance" />
        </section>
      )}



      {/* Row 3: PQI Time + PQI Cost */}
      {(loading || stats) && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> PQI Time Health</CardTitle>
              <CardDescription>Project count by schedule performance bucket</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats!.pqiTimeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {stats!.pqiTimeData.map((entry) => (
                        <Cell key={entry.name} fill={PQI_COLORS[entry.name as keyof typeof PQI_COLORS] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-rose-500" /> PQI Cost Health</CardTitle>
              <CardDescription>Project count by cost performance bucket</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats!.pqiCostData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {stats!.pqiCostData.map((entry) => (
                        <Cell key={entry.name} fill={PQI_COLORS[entry.name as keyof typeof PQI_COLORS] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Row 3: Progress Distribution + Category */}
      {(loading || stats) && (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-500" /> Progress Distribution</CardTitle>
              <CardDescription>Number of projects in each completion band</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats!.progressData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]}>
                      {stats!.progressData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-violet-500" /> By Category</CardTitle>
              <CardDescription>Project count per category</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats!.catData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {stats!.catData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Row 4: Top PMs */}
      {(loading || stats) && (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle>Top 10 Project Managers</CardTitle>
              <CardDescription>Project count per PM</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats!.pmData} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Projects" radius={[0, 6, 6, 0]}>
                      {stats!.pmData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>


          {/* Budget Overview */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Budget vs Usage</CardTitle>
              <CardDescription>Top 10 projects by budget (in million)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64 w-full" /> : stats!.budgetData.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No budget data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats!.budgetData} barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="budget" name="Budget (M)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="usage"  name="Usage (M)"  fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
