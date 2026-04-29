import type { Json } from "@/lib/database.types";

export type AuditEventType = "upload" | "user_management" | "business_rules";

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  action: string;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string;
  targetLabel: string;
  metadata: Json;
  createdAt: string;
};

export type AuditEventInput = Omit<AuditEvent, "id" | "createdAt"> & {
  createdAt?: string;
};
