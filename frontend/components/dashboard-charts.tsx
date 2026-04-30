"use client";

// Recharts is ~200 KB. This file is loaded only via next/dynamic so it
// never lands in the initial page bundle.
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, DollarSign, TrendingUp, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types (duplicated from page to keep this file self-contained) ─────────────
type StatItem = { name: string; value: number };
type BudgetItem = { name: string; budget: number; usage: number };
type ProgressItem = { name: string; count: number };

export type DashboardChartsProps = {
  loading: boolean;
  pqiTimeData: StatItem[];
  pqiCostData: StatItem[];
  progressData: ProgressItem[];
  pmData: StatItem[];
  catData: StatItem[];
  budgetData: BudgetItem[];
};

const PQI_COLORS: Record<string, string> = {
  Black:  "#6b7280",
  Red:    "#ef4444",
  Yellow: "#f59e0b",
  Green:  "#16a34a",
};

const CHART_COLORS = [
  "#6366f1","#22c55e","#f59e0b","#ef4444","#3b82f6",
  "#a855f7","#14b8a6","#f97316","#ec4899","#8b5cf6",
];

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number | string; color?: string; fill?: string }[];
  label?: string;
}
const ChartTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
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
};

export function DashboardCharts({
  loading,
  pqiTimeData, pqiCostData,
  progressData, pmData, catData, budgetData,
}: DashboardChartsProps) {
  return (
    <>
      {/* PQI Time + PQI Cost */}
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
                  <Pie data={pqiTimeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pqiTimeData.map((entry) => (
                      <Cell key={entry.name} fill={PQI_COLORS[entry.name] ?? "#94a3b8"} />
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
                  <Pie data={pqiCostData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pqiCostData.map((entry) => (
                      <Cell key={entry.name} fill={PQI_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Progress Distribution + Category */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-500" /> Progress Distribution</CardTitle>
            <CardDescription>Number of projects in each completion band</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={progressData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]}>
                    {progressData.map((_, i) => (
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
                  <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                    {catData.map((_, i) => (
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

      {/* Top PMs + Budget */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Project Managers</CardTitle>
            <CardDescription>Project count per PM</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pmData} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Projects" radius={[0, 6, 6, 0]}>
                    {pmData.map((_, i) => (
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
            <CardTitle>Budget vs Usage</CardTitle>
            <CardDescription>Top 10 projects by budget (in million)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : budgetData.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No budget data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={budgetData} barSize={10}>
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
    </>
  );
}
