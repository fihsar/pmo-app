"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthSession } from "@/components/auth-session-provider";
import { authenticatedFetchJson } from "@/lib/authenticated-fetch";
import { defaultBusinessRules, splitMultilineInput, type BusinessRules } from "@/lib/business-rules.shared";

type RulesResponse = {
  rules: BusinessRules;
  message?: string;
};

function listToMultiline(values: string[]) {
  return values.join("\n");
}

export default function BusinessRulesPage() {
  const { role, loading: authLoading } = useAuthSession();
  const [rules, setRules] = useState<BusinessRules>(defaultBusinessRules);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [targetGrossProfit, setTargetGrossProfit] = useState(String(defaultBusinessRules.targetGrossProfit));
  const [allowedAccountManagers, setAllowedAccountManagers] = useState(listToMultiline(defaultBusinessRules.allowedAccountManagers));
  const [kpiProjectManagers, setKpiProjectManagers] = useState(listToMultiline(defaultBusinessRules.kpiProjectManagers));
  const [strictFccKeywords, setStrictFccKeywords] = useState(listToMultiline(defaultBusinessRules.keywordRules.strictFccKeywords));
  const [strictCssKeywords, setStrictCssKeywords] = useState(listToMultiline(defaultBusinessRules.keywordRules.strictCssKeywords));
  const [fccKeywords, setFccKeywords] = useState(listToMultiline(defaultBusinessRules.keywordRules.fccKeywords));
  const [cssKeywords, setCssKeywords] = useState(listToMultiline(defaultBusinessRules.keywordRules.cssKeywords));

  const readOnly = useMemo(() => role !== "Superadmin", [role]);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await authenticatedFetchJson<RulesResponse>("/api/business-rules");
        setRules(payload.rules);
        setTargetGrossProfit(String(payload.rules.targetGrossProfit));
        setAllowedAccountManagers(listToMultiline(payload.rules.allowedAccountManagers));
        setKpiProjectManagers(listToMultiline(payload.rules.kpiProjectManagers));
        setStrictFccKeywords(listToMultiline(payload.rules.keywordRules.strictFccKeywords));
        setStrictCssKeywords(listToMultiline(payload.rules.keywordRules.strictCssKeywords));
        setFccKeywords(listToMultiline(payload.rules.keywordRules.fccKeywords));
        setCssKeywords(listToMultiline(payload.rules.keywordRules.cssKeywords));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load business rules.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = await authenticatedFetchJson<RulesResponse>("/api/business-rules", {
        method: "PATCH",
        body: JSON.stringify({
          targetGrossProfit: Number(targetGrossProfit) || defaultBusinessRules.targetGrossProfit,
          allowedAccountManagers: splitMultilineInput(allowedAccountManagers),
          kpiProjectManagers: splitMultilineInput(kpiProjectManagers, true),
          keywordRules: {
            strictFccKeywords: splitMultilineInput(strictFccKeywords, true),
            strictCssKeywords: splitMultilineInput(strictCssKeywords, true),
            fccKeywords: splitMultilineInput(fccKeywords, true),
            cssKeywords: splitMultilineInput(cssKeywords, true),
          },
        }),
      });

      setRules(payload.rules);
      setSuccess(payload.message ?? "Rules saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save business rules.");
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && role !== "Superadmin") {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Business Rules</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is read-only for your role. Only Superadmins can change the rules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Rules</h1>
          <p className="text-sm text-muted-foreground">
            Manage the business settings that drive uploads, filtering, and dashboard KPIs.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading || readOnly}>
          {saving ? "Saving..." : "Save Rules"}
        </Button>
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {success ? <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Core Settings</CardTitle>
            <CardDescription>Control the main portfolio KPI target and people lists.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <div className="h-10 rounded-md bg-muted" />
                <div className="h-28 rounded-md bg-muted" />
                <div className="h-28 rounded-md bg-muted" />
              </div>
            ) : (
              <>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Target Gross Profit</span>
                  <Input value={targetGrossProfit} onChange={(e) => setTargetGrossProfit(e.target.value)} disabled={readOnly} />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Allowed Account Managers</span>
                  <textarea className="min-h-32 w-full rounded-md border bg-background px-3 py-2" value={allowedAccountManagers} onChange={(e) => setAllowedAccountManagers(e.target.value)} disabled={readOnly} />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">KPI Project Managers</span>
                  <textarea className="min-h-32 w-full rounded-md border bg-background px-3 py-2" value={kpiProjectManagers} onChange={(e) => setKpiProjectManagers(e.target.value)} disabled={readOnly} />
                </label>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Classification Keywords</CardTitle>
            <CardDescription>Update the keyword lists that guide FCC and CSS classification.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <>
                <div className="h-32 rounded-md bg-muted" />
                <div className="h-32 rounded-md bg-muted" />
                <div className="h-32 rounded-md bg-muted" />
                <div className="h-32 rounded-md bg-muted" />
              </>
            ) : (
              <>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Strict FCC Keywords</span>
                  <textarea className="min-h-36 w-full rounded-md border bg-background px-3 py-2" value={strictFccKeywords} onChange={(e) => setStrictFccKeywords(e.target.value)} disabled={readOnly} />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Strict CSS Keywords</span>
                  <textarea className="min-h-36 w-full rounded-md border bg-background px-3 py-2" value={strictCssKeywords} onChange={(e) => setStrictCssKeywords(e.target.value)} disabled={readOnly} />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">FCC Keywords</span>
                  <textarea className="min-h-36 w-full rounded-md border bg-background px-3 py-2" value={fccKeywords} onChange={(e) => setFccKeywords(e.target.value)} disabled={readOnly} />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">CSS Keywords</span>
                  <textarea className="min-h-36 w-full rounded-md border bg-background px-3 py-2" value={cssKeywords} onChange={(e) => setCssKeywords(e.target.value)} disabled={readOnly} />
                </label>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {!loading ? (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Current Snapshot</CardTitle>
            <CardDescription>Quick summary of the active rules.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Target GP</p>
              <p className="text-2xl font-semibold">{Number(rules.targetGrossProfit).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Allowed AMs</p>
              <p className="text-2xl font-semibold">{rules.allowedAccountManagers.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">KPI PMs</p>
              <p className="text-2xl font-semibold">{rules.kpiProjectManagers.length}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
