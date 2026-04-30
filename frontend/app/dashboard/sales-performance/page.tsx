"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, Search, Target, Activity, Wallet, Building2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { authenticatedFetchJson } from "@/lib/authenticated-fetch";
import type { Database } from "@/lib/database.types";

// --- Types ---
type SalesPerformance = Database["public"]["Functions"]["get_sales_performance_summary"]["Returns"][0];

export default function SalesPerformancePage() {
  const [data, setData] = useState<SalesPerformance[]>([]);
  const [companyTarget, setCompanyTarget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [presetRange, setPresetRange] = useState("all");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const startTime = performance.now();
    setLoading(true);
    setError("");

    try {
      const [rpcResult, rulesResult] = await Promise.all([
        supabase.rpc("get_sales_performance_summary", {
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        }),
        authenticatedFetchJson<{ rules: { targetGrossProfit: number } }>("/api/business-rules").catch(() => null),
      ]);

      const { data: rpcData, error: rpcError } = rpcResult;
      if (rpcError) throw rpcError;

      if (rpcData) {
        const sorted = (rpcData as SalesPerformance[]).sort((a, b) => b.total_opportunity - a.total_opportunity);
        setData(sorted);
      }

      if (rulesResult) {
        setCompanyTarget(rulesResult.rules.targetGrossProfit);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to load sales performance:", message);
      setError("Failed to load performance data. Ensure SQL migrations are applied.");
    } finally {
      setLoading(false);
      const endTime = performance.now();
      console.log(`[SalesPerformance] Query latency: ${(endTime - startTime).toFixed(2)}ms`);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const handlePresetRangeSelect = (preset: string) => {
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    let start = "";
    let end = "";

    switch (preset) {
      case "q1":
        start = `${year}-01-01`;
        end = `${year}-03-31`;
        break;
      case "q2":
        start = `${year}-04-01`;
        end = `${year}-06-30`;
        break;
      case "q3":
        start = `${year}-07-01`;
        end = `${year}-09-30`;
        break;
      case "q4":
        start = `${year}-10-01`;
        end = `${year}-12-31`;
        break;
      case "1h":
        start = `${year}-01-01`;
        end = `${year}-06-30`;
        break;
      case "2h":
        start = `${year}-07-01`;
        end = `${year}-12-31`;
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
  };

  // Filtered data for AM breakdown, sorted by top achievement
  const filteredData = useMemo(() => {
    return data
      .filter((item) => item.sales_person.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
      .sort((a, b) => b.achievement_percent - a.achievement_percent);
  }, [data, debouncedSearchQuery]);

  // Aggregated totals for KPI cards
  const totals = useMemo(() => {
    return data.reduce((acc, curr) => ({
      backlog: acc.backlog + curr.backlog,
      pipeline: acc.pipeline + curr.prospect_pipeline,
      opportunity: acc.opportunity + curr.total_opportunity,
    }), { backlog: 0, pipeline: 0, opportunity: 0 });
  }, [data]);

  const handleExport = () => {
    const exportData = filteredData.map(item => ({
      'Account Manager': item.sales_person,
      'AM Target': Math.round(item.am_target),
      'Total Backlog (GP)': Math.round(item.backlog),
      'Prospect Pipeline': Math.round(item.prospect_pipeline),
      'Total Opportunity': Math.round(item.total_opportunity),
      'Achievement (%)': item.achievement_percent.toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesPerformance");
    XLSX.writeFile(wb, `Sales_Performance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const chartData = useMemo(() => {
    return filteredData
      .slice(0, 10)
      .map(item => ({
        name: item.sales_person,
        achievement: Math.round(item.achievement_percent),
        pipeline: Math.round(item.prospect_pipeline / 1_000_000),
        backlog: Math.round(item.backlog / 1_000_000)
      }));
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified view of AM achievement (Total GP) against individual targets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="default" 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={handleExport}
            disabled={loading || filteredData.length === 0}
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Company Target"
          value={companyTarget !== null ? `Rp ${(companyTarget / 1_000_000_000).toFixed(1)}B` : "—"}
          icon={Building2}
          color="bg-slate-900"
          loading={loading}
        />
        <KpiCard
          label="Total Backlog"
          value={`Rp ${(totals.backlog / 1_000_000_000).toFixed(1)}B`}
          icon={Target}
          color="bg-indigo-600"
          loading={loading}
          sub={companyTarget !== null && companyTarget > 0 ? `${((totals.backlog / companyTarget) * 100).toFixed(1)}% of company goal` : undefined}
        />
        <KpiCard 
          label="Prospect Pipeline" 
          value={`Rp ${(totals.pipeline / 1_000_000_000).toFixed(1)}B`} 
          icon={Activity} 
          color="bg-amber-500" 
          loading={loading} 
        />
        <KpiCard 
          label="Total Opportunity" 
          value={`Rp ${(totals.opportunity / 1_000_000_000).toFixed(1)}B`} 
          icon={Wallet} 
          color="bg-violet-500" 
          loading={loading} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sales Achievement (%)</CardTitle>
            <CardDescription>Total Backlog vs Sales Target</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" unit="%" />
                  <YAxis type="category" dataKey="name" fontSize={10} width={100} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Achievement']} />
                  <Bar dataKey="achievement" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.achievement >= 100 ? '#10b981' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Backlog vs Pipeline (Top 10)</CardTitle>
            <CardDescription>Total Backlog vs Prospect Pipeline (Future)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="backlog" name="Total Backlog (GP)" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pipeline" name="Prospect Pipeline" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle>AM Performance Breakdown</CardTitle>
            <CardDescription>
              {error ? <span className="text-destructive font-medium">{error}</span> : 
               `Tracking total GP achievement for ${filteredData.length} active AMs.`}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Select
              value={presetRange}
              onValueChange={(val) => {
                setPresetRange(val);
                handlePresetRangeSelect(val);
              }}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30">Quarterly</div>
                <SelectItem value="q1">Q1</SelectItem>
                <SelectItem value="q2">Q2</SelectItem>
                <SelectItem value="q3">Q3</SelectItem>
                <SelectItem value="q4">Q4</SelectItem>
                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30 border-t">Half Year</div>
                <SelectItem value="1h">1H</SelectItem>
                <SelectItem value="2h">2H</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search AM name..."
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-medium whitespace-nowrap">
                  <th className="py-3 px-4 text-left">Account Manager</th>
                  <th className="py-3 px-4 text-right">Sales Target</th>
                  <th className="py-3 px-4 text-right">Total Backlog (GP)</th>
                  <th className="py-3 px-4 text-right">Prospect Pipeline</th>
                  <th className="py-3 px-4 text-right">Total Opportunity</th>
                  <th className="py-3 px-4 text-center">Achievement %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td colSpan={6} className="p-4"><Skeleton className="h-4 w-full" /></td>
                    </tr>
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      No sales performance data found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/10 transition-colors whitespace-nowrap">
                      <td className="py-3 px-4 font-medium">{item.sales_person}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        Rp {Math.round(item.am_target).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-indigo-600 dark:text-indigo-400">
                        Rp {Math.round(item.backlog).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        Rp {Math.round(item.prospect_pipeline).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        Rp {Math.round(item.total_opportunity).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold border inline-block min-w-[50px]",
                          item.achievement_percent >= 100 ? "bg-green-100 text-green-700 border-green-200" :
                          item.achievement_percent >= 50 ? "bg-blue-100 text-blue-700 border-blue-200" :
                          "bg-slate-100 text-slate-700 border-slate-200"
                        )}>
                          {item.achievement_percent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
  sub?: string;
}

function KpiCard({ label, value, icon: Icon, color, loading, sub }: KpiCardProps) {
  return (
    <Card className="border shadow-sm relative overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            {loading ? <Skeleton className="h-7 w-24" /> : (
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            )}
          </div>
          <div className={cn("rounded-xl p-2.5 text-white shadow-sm transition-transform group-hover:scale-110", color)}>
            <Icon size={20} />
          </div>
        </div>
        {sub && !loading && (
          <p className="mt-2 text-sm text-muted-foreground font-semibold uppercase tracking-tight">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
