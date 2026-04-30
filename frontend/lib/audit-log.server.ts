import "server-only";

import { randomUUID } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AuditEvent, AuditEventInput } from "@/lib/audit-log.shared";

type AuditLogRow = {
  id: string;
  type: string;
  action: string;
  actor_email: string | null;
  actor_role: string | null;
  target_type: string;
  target_label: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function rowToEvent(row: AuditLogRow): AuditEvent {
  return {
    id: row.id,
    type: row.type as AuditEvent["type"],
    action: row.action,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    targetType: row.target_type,
    targetLabel: row.target_label,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: row.metadata as any,
    createdAt: row.created_at,
  };
}

// audit_log and business_rules are not in the generated database.types yet.
// Cast the admin client to `any` for these two tables only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function readAuditLog(): Promise<AuditEvent[]> {
  const { data, error } = await db()
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(`Failed to read audit log: ${error.message}`);
  return ((data ?? []) as AuditLogRow[]).map(rowToEvent);
}

export async function appendAuditEvent(input: AuditEventInput): Promise<AuditEvent> {
  const row: AuditLogRow = {
    id: randomUUID(),
    type: input.type,
    action: input.action,
    actor_email: input.actorEmail,
    actor_role: input.actorRole,
    target_type: input.targetType,
    target_label: input.targetLabel,
    metadata: (input.metadata ?? {}) as Record<string, unknown>,
    created_at: input.createdAt ?? new Date().toISOString(),
  };

  const { data, error } = await db()
    .from("audit_log")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Failed to append audit event: ${error.message}`);
  return rowToEvent(data as AuditLogRow);
}
