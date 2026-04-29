import { NextResponse } from "next/server";

import { appendAuditEvent, readAuditLog } from "@/lib/audit-log.server";
import type { AuditEventInput } from "@/lib/audit-log.shared";
import { getAuthenticatedContext, verifyAdmin } from "@/lib/supabase-server";

export async function GET() {
  const auth = await verifyAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const events = await readAuditLog();
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as Partial<AuditEventInput>;
  if (!body.type || !body.action || !body.targetType || !body.targetLabel) {
    return NextResponse.json({ error: "Invalid audit event payload." }, { status: 400 });
  }

  const event = await appendAuditEvent({
    type: body.type,
    action: body.action,
    targetType: body.targetType,
    targetLabel: body.targetLabel,
    metadata: body.metadata ?? null,
    actorEmail: auth.user.email ?? null,
    actorRole: auth.profile.role ?? null,
  });

  return NextResponse.json({ event });
}
