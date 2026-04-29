"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/components/auth-session-provider";
import { authenticatedFetchJson } from "@/lib/authenticated-fetch";
import type { AuditEvent } from "@/lib/audit-log.shared";

type AuditLogResponse = {
  events: AuditEvent[];
};

export default function ActivityPage() {
  const { role, loading: authLoading } = useAuthSession();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role !== "Superadmin") {
      return;
    }

    const load = async () => {
      try {
        const payload = await authenticatedFetchJson<AuditLogResponse>("/api/audit-log");
        setEvents(payload.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [role]);

  if (!authLoading && role !== "Superadmin") {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is only available to Superadmins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Review recent upload, user management, and business-rules changes.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Newest events appear first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 rounded-md bg-muted" />
              <div className="h-20 rounded-md bg-muted" />
              <div className="h-20 rounded-md bg-muted" />
            </div>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{event.targetLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.type.replace(/_/g, " ")} · {event.action}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <p>Actor: {event.actorEmail ?? "Unknown"}{event.actorRole ? ` (${event.actorRole})` : ""}</p>
                  <p>Target type: {event.targetType}</p>
                </div>
                {event.metadata ? (
                  <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
