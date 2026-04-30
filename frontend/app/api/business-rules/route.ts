import { NextResponse } from "next/server";

import { appendAuditEvent } from "@/lib/audit-log.server";
import { getBusinessRules, saveBusinessRules } from "@/lib/business-rules.server";
import type { BusinessRules } from "@/lib/business-rules.shared";
import { getAuthenticatedContext, verifyAdmin } from "@/lib/supabase-server";
import { createRequestLogger } from "@/lib/logger";

export async function GET() {
  const { log } = createRequestLogger("GET /api/business-rules");

  const auth = await getAuthenticatedContext();
  if ("error" in auth) {
    log.warn("unauthenticated request", { status: auth.status });
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rules = await getBusinessRules();
  log.info("rules fetched", { actorEmail: auth.user.email });
  return NextResponse.json({ rules });
}

export async function PATCH(request: Request) {
  const { log } = createRequestLogger("PATCH /api/business-rules");

  const auth = await verifyAdmin();
  if ("error" in auth) {
    log.warn("unauthorized patch attempt", { status: auth.status });
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as Partial<BusinessRules>;
    const rules = await saveBusinessRules(body);

    await appendAuditEvent({
      type: "business_rules",
      action: "updated",
      actorEmail: auth.user.email ?? null,
      actorRole: auth.profile.role ?? null,
      targetType: "business_rules",
      targetLabel: "Business Rules",
      metadata: {
        allowedAccountManagers: rules.allowedAccountManagers.length,
        kpiProjectManagers: rules.kpiProjectManagers.length,
        targetGrossProfit: rules.targetGrossProfit,
      },
    });

    log.info("rules updated", { actorEmail: auth.user.email });
    return NextResponse.json({ rules, message: "Business rules saved successfully." });
  } catch (err) {
    log.error("failed to save rules", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
