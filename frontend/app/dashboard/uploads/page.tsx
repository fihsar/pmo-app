"use client";

import { useEffect, useMemo, useState } from "react";
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
  uploadedAt: string | null;
  totalValue: number;
  totalGrossProfit: number;
  fileName: string | null;
  actorEmail: string | null;
  warnings: string[];
};

type DatasetSummary = {
  datasetId: DatasetId;
  label: string;
  batches: BatchSummary[];
  comparison: {
    latestBatchNumber: number;
    previousBatchNumber: number | null;
    rowDelta: number;
    valueDelta: number;
    grossProfitDelta: number;
  } | null;
};

type PortfolioInsightsResponse = {
  generatedAt: string;
  datasets: DatasetSummary[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export default function UploadHistoryPage() {
  const [data, setData] = useState<PortfolioInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [datasetFilter, setDatasetFilter] = useState<"all" | DatasetId>("all");

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await authenticatedFetchJson<PortfolioInsightsResponse>("/api/portfolio-insights");
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load upload history.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const datasets = useMemo(() => {
    if (!data) return [];
    return datasetFilter === "all"
      ? data.datasets
      : data.datasets.filter((dataset) => dataset.datasetId === datasetFilter);
  }, [data, datasetFilter]);

  const rows = useMemo(
    () =>
      datasets
        .flatMap((dataset) => dataset.batches)
        .sort((a, b) => {
          if (a.uploadedAt && b.uploadedAt) {
            return b.uploadedAt.localeCompare(a.uploadedAt);
          }
          return b.batchNumber - a.batchNumber;
        }),
    [datasets]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload History</h1>
          <p className="text-sm text-muted-foreground">
            Review recent batches, compare them with the previous upload, and track who uploaded what.
          </p>
        </div>
        <div className="w-full md:w-52">
          <Select value={datasetFilter} onValueChange={(value) => setDatasetFilter(value as "all" | DatasetId)}>
            <SelectTrigger>
              <SelectValue placeholder="All datasets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All datasets</SelectItem>
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

      <section className="grid gap-4 xl:grid-cols-3">
        {loading
          ? [1, 2, 3].map((index) => (
              <Card key={index} className="border shadow-sm">
                <CardHeader>
                  <CardTitle>Loading...</CardTitle>
                  <CardDescription>Latest upload vs previous batch</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          : datasets.map((dataset) => (
              <Card key={dataset.datasetId} className="border shadow-sm">
                <CardHeader>
                  <CardTitle>{dataset.label}</CardTitle>
                  <CardDescription>Latest upload vs previous batch</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {dataset.comparison ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Latest batch</span>
                        <span className="font-medium">#{dataset.comparison.latestBatchNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Rows change</span>
                        <span className="font-medium">{dataset.comparison.rowDelta >= 0 ? "+" : ""}{dataset.comparison.rowDelta}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Value change</span>
                        <span className="font-medium">{dataset.comparison.valueDelta >= 0 ? "+" : ""}{formatCurrency(dataset.comparison.valueDelta)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">GP change</span>
                        <span className="font-medium">{dataset.comparison.grossProfitDelta >= 0 ? "+" : ""}{formatCurrency(dataset.comparison.grossProfitDelta)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No uploads recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            ))}
      </section>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Recent Batches</CardTitle>
          <CardDescription>Latest recorded uploads across the portfolio.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No upload history available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Dataset</th>
                    <th className="px-3 py-2 font-medium">Batch</th>
                    <th className="px-3 py-2 font-medium">Uploaded</th>
                    <th className="px-3 py-2 font-medium">File</th>
                    <th className="px-3 py-2 font-medium">Rows</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="px-3 py-2 font-medium">Gross Profit</th>
                    <th className="px-3 py-2 font-medium">Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.datasetId}-${row.batchNumber}`} className="border-b last:border-b-0">
                      <td className="px-3 py-3">{row.label}</td>
                      <td className="px-3 py-3 font-medium">#{row.batchNumber}</td>
                      <td className="px-3 py-3">{formatDateTime(row.uploadedAt)}</td>
                      <td className="px-3 py-3">{row.fileName ?? "Unknown"}</td>
                      <td className="px-3 py-3">{row.rowCount.toLocaleString()}</td>
                      <td className="px-3 py-3">{formatCurrency(row.totalValue)}</td>
                      <td className="px-3 py-3">{formatCurrency(row.totalGrossProfit)}</td>
                      <td className="px-3 py-3">{row.actorEmail ?? "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
