import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log.server";
import { getSalesTargets, saveAmTargets, saveCategoryTargets } from "@/lib/sales-targets.server";
import { getAuthenticatedContext, verifyAdmin } from "@/lib/supabase-server";
import { createRequestLogger } from "@/lib/logger";

export async function GET() {
  const { log } = createRequestLogger("GET /api/sales-targets");
  const auth = await getAuthenticatedContext();
  if ("error" in auth) {
    log.warn("unauthenticated request", { status: auth.status });
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const targets = await getSalesTargets();
  log.info("sales targets fetched", { actorEmail: auth.user.email });
  return NextResponse.json(targets);
}

export async function PATCH(request: Request) {
  const { log } = createRequestLogger("PATCH /api/sales-targets");
  const auth = await verifyAdmin();
  if ("error" in auth) {
    log.warn("unauthorized patch attempt", { status: auth.status });
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as {
      amTargets?: { id: number; annualTarget: number }[];
      categoryTargets?: { category: string; target: number }[];
    };

    // Validate amTargets
    if (body.amTargets !== undefined) {
      if (!Array.isArray(body.amTargets)) {
        return NextResponse.json({ error: "amTargets must be an array." }, { status: 400 });
      }
      for (const entry of body.amTargets) {
        if (
          typeof entry.id !== "number" ||
          typeof entry.annualTarget !== "number" ||
          entry.annualTarget < 0
        ) {
          return NextResponse.json(
            {
              error:
                "Each amTarget must have a numeric id and a non-negative annualTarget.",
            },
            { status: 400 }
          );
        }
      }
      await saveAmTargets(body.amTargets);
    }

    // Validate categoryTargets
    const VALID_CATEGORIES = new Set(["CSS", "FCC", "UNCLASSIFIED"]);
    if (body.categoryTargets !== undefined) {
      if (!Array.isArray(body.categoryTargets)) {
        return NextResponse.json({ error: "categoryTargets must be an array." }, { status: 400 });
      }
      for (const entry of body.categoryTargets) {
        if (!VALID_CATEGORIES.has(entry.category) || typeof entry.target !== "number" || entry.target < 0) {
          return NextResponse.json(
            { error: `Invalid category or target value for ${entry.category}.` },
            { status: 400 }
          );
        }
      }
      await saveCategoryTargets(body.categoryTargets);
    }

    await appendAuditEvent({
      type: "sales_targets",
      action: "updated",
      actorEmail: auth.user.email ?? null,
      actorRole: auth.profile.role ?? null,
      targetType: "sales_targets",
      targetLabel: "Sales Targets",
      metadata: {
        amTargetsCount: body.amTargets?.length ?? 0,
        categoryTargetsCount: body.categoryTargets?.length ?? 0,
      },
    });

    const targets = await getSalesTargets();
    log.info("sales targets updated", { actorEmail: auth.user.email });
    return NextResponse.json({ ...targets, message: "Sales targets saved successfully." });
  } catch (err) {
    log.error("failed to save sales targets", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
