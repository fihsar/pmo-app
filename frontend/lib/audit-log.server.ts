import "server-only";

import { randomUUID } from "node:crypto";

import { readOrCreateJsonFile, writeJsonFile } from "@/lib/local-json-store.server";
import type { AuditEvent, AuditEventInput } from "@/lib/audit-log.shared";

const FILE_NAME = "audit-log.json";
const MAX_EVENTS = 500;

export async function readAuditLog(): Promise<AuditEvent[]> {
  const events = await readOrCreateJsonFile<AuditEvent[]>(FILE_NAME, []);
  return [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function appendAuditEvent(input: AuditEventInput): Promise<AuditEvent> {
  const events = await readOrCreateJsonFile<AuditEvent[]>(FILE_NAME, []);
  const event: AuditEvent = {
    id: randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input,
  };

  await writeJsonFile(FILE_NAME, [event, ...events].slice(0, MAX_EVENTS));
  return event;
}
