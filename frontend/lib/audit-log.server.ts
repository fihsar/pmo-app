import "server-only";

import { randomUUID } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AuditEvent, AuditEventInput } from "@/lib/audit-log.shared";
import type { Database } from "@/lib/database.types";

type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];

function rowToEvent(row: AuditLogRow): AuditEvent {
  return {
    id: row.id,
    type: row.type as AuditEvent["type"],
    action: row.action,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    targetType: row.target_type,
    targetLabel: row.target_label,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function readAuditLog(): Promise<AuditEvent[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(`Failed to read audit log: ${error.message}`);
  return (data ?? []).map(rowToEvent);
}

export async function appendAuditEvent(input: AuditEventInput): Promise<AuditEvent> {
  const row: Database["public"]["Tables"]["audit_log"]["Insert"] = {
    id: randomUUID(),
    type: input.type,
    action: input.action,
    actor_email: input.actorEmail,
    actor_role: input.actorRole,
    target_type: input.targetType,
    target_label: input.targetLabel,
    metadata: (input.metadata ?? {}) as Database["public"]["Tables"]["audit_log"]["Insert"]["metadata"],
    created_at: input.createdAt ?? new Date().toISOString(),
  };

  const { data, error } = await getSupabaseAdmin()
    .from("audit_log")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Failed to append audit event: ${error.message}`);
  return rowToEvent(data);
}
