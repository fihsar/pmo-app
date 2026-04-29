"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { authenticatedFetchJson } from "@/lib/authenticated-fetch";

type DatasetId = "projects" | "prospects" | "targets";

type BatchSummary = {
  datasetId: DatasetId;
  label: string;
  batchNumber: number;
  rowCount: number;
  totalValue: number;
  totalGrossProfit: number;
};

type DatasetSummary = {
  datasetId: DatasetId;
  label: string;
  batches: BatchSummary[];
};

type PortfolioInsightsResponse = {
  datasets: DatasetSummary[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function TrendsPage() {
  const [data, setData] = useState<PortfolioInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [datasetId, setDatasetId] = useState<DatasetId>("projects");

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await authenticatedFetchJson<PortfolioInsightsResponse>("/api/portfolio-insights");
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trends.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const activeDataset = useMemo(
    () => data?.datasets.find((dataset) => dataset.datasetId === datasetId) ?? null,
    [data, datasetId]
  );

  const chartData = useMemo(
    () =>
      (activeDataset?.batches ?? [])
        .slice()
        .sort((a, b) => a.batchNumber - b.batchNumber)
        .map((batch) => ({
          batch: `#${batch.batchNumber}`,
          rows: batch.rowCount,
          value: batch.totalValue,
          gp: batch.totalGrossProfit,
        })),
    [activeDataset]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trend Analytics</h1>
          <p className="text-sm text-muted-foreground">
            See how row counts, value, and gross profit move across recent batches.
          </p>
        </div>
        <div className="w-full md:w-52">
          <Select value={datasetId} onValueChange={(value) => setDatasetId(value as DatasetId)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="prospects">Prospects</SelectItem>
              <SelectItem value="targets">Backlog</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Recent Batches</CardTitle>
            <CardDescription>{activeDataset?.label ?? "Dataset"} upload count in view</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-full" /> : <div className="text-3xl font-bold">{chartData.length}</div>}
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Latest Rows</CardTitle>
            <CardDescription>Rows in the newest batch</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-full" /> : <div className="text-3xl font-bold">{formatNumber(chartData[chartData.length - 1]?.rows ?? 0)}</div>}
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Latest Gross Profit</CardTitle>
            <CardDescription>Gross profit in the newest batch</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-10 w-full" /> : <div className="text-3xl font-bold">{formatNumber(chartData[chartData.length - 1]?.gp ?? 0)}</div>}
          </CardContent>
        </Card>
      </section>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Batch Trend</CardTitle>
          <CardDescription>Rows, value, and gross profit across recent uploads.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-80 w-full" />
          ) : chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No trend data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="batch" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                <Legend />
                <Line type="monotone" dataKey="rows" stroke="#3b82f6" strokeWidth={2} name="Rows" />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} name="Value" />
                <Line type="monotone" dataKey="gp" stroke="#16a34a" strokeWidth={2} name="Gross Profit" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
