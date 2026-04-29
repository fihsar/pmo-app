import { NextResponse } from "next/server";

import { appendAuditEvent } from "@/lib/audit-log.server";
import { getBusinessRules, saveBusinessRules } from "@/lib/business-rules.server";
import type { BusinessRules } from "@/lib/business-rules.shared";
import { verifyAdmin } from "@/lib/supabase-server";

export async function GET() {
  const rules = await getBusinessRules();
  return NextResponse.json({ rules });
}

export async function PATCH(request: Request) {
  const auth = await verifyAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

  return NextResponse.json({ rules, message: "Business rules saved successfully." });
}
