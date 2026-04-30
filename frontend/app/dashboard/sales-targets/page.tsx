"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthSession } from "@/components/auth-session-provider";
import { authenticatedFetchJson } from "@/lib/authenticated-fetch";
import type { SalesTargets, AmTarget, CategoryTarget } from "@/lib/sales-targets.shared";

export default function SalesTargetsPage() {
  const { role, loading: authLoading } = useAuthSession();
  const [amRows, setAmRows] = useState<AmTarget[]>([]);
  const [catRows, setCatRows] = useState<CategoryTarget[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [savingAm, setSavingAm] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [amError, setAmError] = useState("");
  const [amSuccess, setAmSuccess] = useState("");
  const [catError, setCatError] = useState("");
  const [catSuccess, setCatSuccess] = useState("");

  const readOnly = useMemo(() => role !== "Superadmin", [role]);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await authenticatedFetchJson<SalesTargets>("/api/sales-targets");
        setAmRows(payload.amTargets);
        setCatRows(payload.categoryTargets);
      } catch (err) {
        setAmError(err instanceof Error ? err.message : "Failed to load sales targets.");
      } finally {
        setLoadingData(false);
      }
    };

    void load();
  }, []);

  const handleAmTargetChange = (id: number, value: string) => {
    setAmRows((prev) =>
      prev.map((am) => (am.id === id ? { ...am, annualTarget: Number(value) || 0 } : am))
    );
  };

  const handleCategoryTargetChange = (category: string, value: string) => {
    setCatRows((prev) =>
      prev.map((cat) =>
        cat.category === category ? { ...cat, target: Number(value) || 0 } : cat
      )
    );
  };

  const handleSaveAmTargets = async () => {
    setSavingAm(true);
    setAmError("");
    setAmSuccess("");

    try {
      const payload = await authenticatedFetchJson<SalesTargets>("/api/sales-targets", {
        method: "PATCH",
        body: JSON.stringify({
          amTargets: amRows.map(({ id, annualTarget }) => ({ id, annualTarget })),
        }),
      });

      setAmRows(payload.amTargets);
      setAmSuccess("AM targets saved successfully.");
    } catch (err) {
      setAmError(err instanceof Error ? err.message : "Failed to save AM targets.");
    } finally {
      setSavingAm(false);
    }
  };

  const handleSaveCategoryTargets = async () => {
    setSavingCat(true);
    setCatError("");
    setCatSuccess("");

    try {
      const payload = await authenticatedFetchJson<SalesTargets>("/api/sales-targets", {
        method: "PATCH",
        body: JSON.stringify({
          categoryTargets: catRows.map(({ category, target }) => ({ category, target })),
        }),
      });

      setCatRows(payload.categoryTargets);
      setCatSuccess("Category targets saved successfully.");
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Failed to save category targets.");
    } finally {
      setSavingCat(false);
    }
  };

  if (!authLoading && role !== "Superadmin") {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sales Targets</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is read-only for your role. Only Superadmins can change targets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Targets</h1>
          <p className="text-sm text-muted-foreground">
            Manage individual AM annual targets and category-level company targets.
          </p>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        {/* Card 1: AM Annual Targets */}
        <Card className="border shadow-sm">
          <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Account Manager Targets</CardTitle>
              <CardDescription className="mt-1">Annual sales target per AM (IDR).</CardDescription>
            </div>
            <Button onClick={handleSaveAmTargets} disabled={savingAm || loadingData || readOnly}>
              {savingAm ? "Saving..." : "Save AM Targets"}
            </Button>
          </div>
          <CardContent className="pt-6">
            {amError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">
                {amError}
              </p>
            ) : null}
            {amSuccess ? (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 mb-4">
                {amSuccess}
              </p>
            ) : null}

            {loadingData ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {amRows.filter((am) => am.isActive).map((am) => (
                  <div key={am.id} className="flex items-center gap-3">
                    <label className="flex-1 text-sm font-medium text-muted-foreground min-w-48">
                      {am.name}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={am.annualTarget}
                      onChange={(e) => handleAmTargetChange(am.id, e.target.value)}
                      disabled={readOnly}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Category Targets */}
        <Card className="border shadow-sm">
          <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Category Targets</CardTitle>
              <CardDescription className="mt-1">Company-wide annual target per category (IDR).</CardDescription>
            </div>
            <Button onClick={handleSaveCategoryTargets} disabled={savingCat || loadingData || readOnly}>
              {savingCat ? "Saving..." : "Save Category Targets"}
            </Button>
          </div>
          <CardContent className="pt-6">
            {catError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">
                {catError}
              </p>
            ) : null}
            {catSuccess ? (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 mb-4">
                {catSuccess}
              </p>
            ) : null}

            {loadingData ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {catRows.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <label className="flex-1 text-sm font-medium text-muted-foreground min-w-24">
                      {cat.category}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={cat.target}
                      onChange={(e) => handleCategoryTargetChange(cat.category, e.target.value)}
                      disabled={readOnly}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
