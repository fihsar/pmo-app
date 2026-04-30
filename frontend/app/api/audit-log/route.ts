import { NextResponse } from "next/server";

import { appendAuditEvent, readAuditLog } from "@/lib/audit-log.server";
import type { AuditEventInput } from "@/lib/audit-log.shared";
import { getAuthenticatedContext, verifyAdmin } from "@/lib/supabase-server";
import { createRequestLogger } from "@/lib/logger";

export async function GET() {
  const { log } = createRequestLogger("GET /api/audit-log");

  const auth = await verifyAdmin();
  if ("error" in auth) {
    log.warn("unauthorized", { status: auth.status });
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const events = await readAuditLog();
    log.info("audit log fetched", { count: events.length, actorEmail: auth.user.email });
    return NextResponse.json({ events });
  } catch (err) {
    log.error("failed to read audit log", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { log } = createRequestLogger("POST /api/audit-log");

  const auth = await getAuthenticatedContext();
  if ("error" in auth) {
    log.warn("unauthenticated", { status: auth.status });
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as Partial<AuditEventInput>;
    if (!body.type || !body.action || !body.targetType || !body.targetLabel) {
      log.warn("invalid payload", { body });
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

    log.info("audit event appended", { eventId: event.id, type: event.type });
    return NextResponse.json({ event });
  } catch (err) {
    log.error("failed to append audit event", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
