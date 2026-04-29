import { NextResponse } from "next/server";

import { readAuditLog } from "@/lib/audit-log.server";
import { getBusinessRules } from "@/lib/business-rules.server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { getAuthenticatedContext } from "@/lib/supabase-server";
import type { Tables } from "@/lib/database.types";

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

const DATASET_LABELS: Record<DatasetId, string> = {
  projects: "Projects",
  prospects: "Prospects",
  targets: "Backlog",
};

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function aggregateBatches(
  datasetId: DatasetId,
  rows: Array<{
    batch_number: number | null;
    upload_date: string | null;
    value: number | null;
    profit: number | null;
  }>,
  auditIndex: Map<string, { fileName: string | null; actorEmail: string | null; warnings: string[] }>
): DatasetSummary {
  const grouped = new Map<number, BatchSummary>();

  for (const row of rows) {
    if (row.batch_number === null) continue;

    const existing = grouped.get(row.batch_number) ?? {
      datasetId,
      label: DATASET_LABELS[datasetId],
      batchNumber: row.batch_number,
      rowCount: 0,
      uploadedAt: row.upload_date,
      totalValue: 0,
      totalGrossProfit: 0,
      fileName: null,
      actorEmail: null,
      warnings: [],
    };

    existing.rowCount += 1;
    existing.totalValue += toNumber(row.value);
    existing.totalGrossProfit += toNumber(row.profit);

    if (!existing.uploadedAt || (row.upload_date && row.upload_date > existing.uploadedAt)) {
      existing.uploadedAt = row.upload_date;
    }

    grouped.set(row.batch_number, existing);
  }

  const batches = Array.from(grouped.values())
    .sort((a, b) => b.batchNumber - a.batchNumber)
    .map((batch) => {
      const audit = auditIndex.get(`${datasetId}:${batch.batchNumber}`);
      return {
        ...batch,
        fileName: audit?.fileName ?? null,
        actorEmail: audit?.actorEmail ?? null,
        warnings: audit?.warnings ?? [],
      };
    });

  const latest = batches[0];
  const previous = batches[1];

  return {
    datasetId,
    label: DATASET_LABELS[datasetId],
    batches,
    comparison: latest
      ? {
          latestBatchNumber: latest.batchNumber,
          previousBatchNumber: previous?.batchNumber ?? null,
          rowDelta: latest.rowCount - (previous?.rowCount ?? 0),
          valueDelta: latest.totalValue - (previous?.totalValue ?? 0),
          grossProfitDelta: latest.totalGrossProfit - (previous?.totalGrossProfit ?? 0),
        }
      : null,
  };
}

export async function GET() {
  const auth = await getAuthenticatedContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Server is missing admin Supabase configuration." }, { status: 500 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const rules = await getBusinessRules();
  const auditLog = await readAuditLog();
  const uploadAuditIndex = new Map(
    auditLog
      .filter((event) => event.type === "upload")
      .map((event) => {
        const metadata = event.metadata as { datasetId?: DatasetId; batchNumber?: number; fileName?: string | null; warnings?: string[] } | null;
        return [
          `${metadata?.datasetId}:${metadata?.batchNumber}`,
          {
            fileName: metadata?.fileName ?? null,
            actorEmail: event.actorEmail,
            warnings: Array.isArray(metadata?.warnings) ? metadata.warnings : [],
          },
        ] as const;
      })
  );

  const latestProjectsBatch = (await supabaseAdmin.rpc("get_latest_batch", { p_table_id: "projects" })).data ?? 0;
  const latestProspectsBatch = (await supabaseAdmin.rpc("get_latest_batch", { p_table_id: "prospects" })).data ?? 0;
  const latestTargetsBatch = (await supabaseAdmin.rpc("get_latest_batch", { p_table_id: "targets" })).data ?? 0;
  const historyDepth = 8;

  const [{ data: projectRows }, { data: prospectRows }, { data: targetRows }] = await Promise.all([
    latestProjectsBatch > 0
      ? supabaseAdmin
          .from("projects")
          .select("batch_number, upload_date, total_sales, gross_profit")
          .gte("batch_number", Math.max(1, latestProjectsBatch - historyDepth + 1))
      : Promise.resolve({ data: [] as Pick<Tables<"projects">, "batch_number" | "upload_date" | "total_sales" | "gross_profit">[] }),
    latestProspectsBatch > 0
      ? supabaseAdmin
          .from("prospects")
          .select("batch_number, upload_date, amount, gp, am_name")
          .gte("batch_number", Math.max(1, latestProspectsBatch - historyDepth + 1))
          .in("am_name", rules.allowedAccountManagers)
      : Promise.resolve({ data: [] as Pick<Tables<"prospects">, "batch_number" | "upload_date" | "amount" | "gp" | "am_name">[] }),
    latestTargetsBatch > 0
      ? supabaseAdmin
          .from("project_targets")
          .select("batch_number, upload_date, total, gp_acc")
          .gte("batch_number", Math.max(1, latestTargetsBatch - historyDepth + 1))
      : Promise.resolve({ data: [] as Pick<Tables<"project_targets">, "batch_number" | "upload_date" | "total" | "gp_acc">[] }),
  ]);

  const datasets = [
    aggregateBatches(
      "projects",
      (projectRows ?? []).map((row) => ({
        batch_number: row.batch_number,
        upload_date: row.upload_date,
        value: row.total_sales,
        profit: row.gross_profit,
      })),
      uploadAuditIndex
    ),
    aggregateBatches(
      "prospects",
      (prospectRows ?? []).map((row) => ({
        batch_number: row.batch_number,
        upload_date: row.upload_date,
        value: row.amount,
        profit: row.gp,
      })),
      uploadAuditIndex
    ),
    aggregateBatches(
      "targets",
      (targetRows ?? []).map((row) => ({
        batch_number: row.batch_number,
        upload_date: row.upload_date,
        value: row.total,
        profit: row.gp_acc,
      })),
      uploadAuditIndex
    ),
  ];

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    datasets,
    rulesSummary: {
      targetGrossProfit: rules.targetGrossProfit,
      allowedAccountManagers: rules.allowedAccountManagers.length,
      kpiProjectManagers: rules.kpiProjectManagers.length,
    },
  });
}
