"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, 
  ChevronRight, ChevronsLeft, ChevronsRight, Upload, 
  Download, Inbox 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatDate, parseDate, parseNumeric, parseText } from "@/lib/excel-utils";
import { cn } from "@/lib/utils";
import { determineCategory } from "@/lib/classification";

type Prospect = {
  id?: string;
  id_top_sales?: number | null;
  am_name: string | null;
  company_name: string | null;
  directorat?: string | null;
  group_name?: string | null;
  id_project: string | null;
  id_prospect_status?: number | null;
  prospect_name: string | null;
  client_name: string | null;
  status: string | null;
  term_of_payment?: string | null;
  amount: number | null;
  gp: number | null;
  amount_cl?: number | null;
  gp_cl?: number | null;
  est_prospect_close_date?: string | null;
  target_date: string | null;
  confidence_level?: number | null;
  osv_non_osl?: number | null;
  opr_del?: number | null;
  batch_number?: number;
  upload_date?: string;
  category?: string | null;
  category_note?: string | null;
};

const isMissingBatchColumnError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return msg.includes("batch_number") && msg.includes("does not exist");
};

const allowedAMs = [
  "Andrew Daniel Gunalan",
  "Elsa Yolanda Simanjuntak",
  "Graeta Venato",
  "Lizty Latifah",
  "M. Satria Manggala Yudha",
  "Merlin",
  "Pandu R Akbar"
];

const cssNameFallbackPatterns = [
  "%Managed Service%",
  "%Internet Service%",
  "%Bandwidth%",
  "%Lastmile%",
  "%Leased Line%"
];

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [totalProspectsCount, setTotalProspectsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalGP, setTotalGP] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [presetRange, setPresetRange] = useState("custom");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Prospect; direction: "asc" | "desc" } | null>({ key: "target_date", direction: "asc" });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const escapeSearch = (value: string) => value.trim().replace(/,/g, " ");

  const getProspectsOrderColumn = (key: keyof Prospect) => {
    switch (key) {
      case "id_project":
      case "client_name":
      case "prospect_name":
      case "am_name":
      case "category":
      case "status":
      case "target_date":
      case "amount":
      case "gp":
        return key;
      default:
        return "created_at";
    }
  };

  const loadProspects = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const startTime = performance.now();
    setLoading(true);

    const { data: maxBatch, error: maxBatchError } = await supabase.rpc("get_latest_batch", { p_table_id: "prospects" });
      
    if (maxBatchError) {
      console.error("Failed to fetch latest batch:", maxBatchError.message);
      setError(`Failed to load prospects: ${maxBatchError.message}`);
      setProspects([]);
      setLoading(false);
      return;
    }

    if (maxBatch > 0) {
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;
      const orderColumn = sortConfig ? getProspectsOrderColumn(sortConfig.key) : "target_date";
      const ascending = sortConfig ? sortConfig.direction === "asc" : true;

      let query = supabase
        .from("prospects")
        .select("id, id_project, am_name, company_name, client_name, prospect_name, status, amount, gp, target_date, category, category_note, batch_number, created_at", { count: "exact" })
        .eq("batch_number", maxBatch)
        .in("am_name", allowedAMs);

      if (categoryFilter !== "all") {
        if (categoryFilter === "CSS") {
          query = query.or([
            "category.eq.CSS",
            ...cssNameFallbackPatterns.map((pattern) => `prospect_name.ilike.${pattern}`),
          ].join(","));
        } else {
          query = query.eq("category", categoryFilter);
        }
      }

      if (startDate) {
        query = query.gte("target_date", startDate);
      }

      if (endDate) {
        query = query.lte("target_date", endDate);
      }

      if (debouncedSearchQuery.trim()) {
        const q = escapeSearch(debouncedSearchQuery);
        query = query.or(
          [
            `id_project.ilike.%${q}%`,
            `client_name.ilike.%${q}%`,
            `prospect_name.ilike.%${q}%`,
            `am_name.ilike.%${q}%`,
            `company_name.ilike.%${q}%`,
            `category.ilike.%${q}%`,
            `status.ilike.%${q}%`,
          ].join(",")
        );
      }

      const { data: pageData, error: pageError, count } = await query
        .order(orderColumn, { ascending })
        .order("created_at", { ascending: false })
        .range(start, end);

      if (pageError) {
        console.error("Failed to load prospects:", pageError.message);
        setError(`Failed to load prospects: ${pageError.message}`);
        setProspects([]);
        setTotalProspectsCount(0);
      } else {
        setProspects((pageData || []).map((prospect) => ({
          ...prospect,
          amount: parseNumeric(prospect.amount),
          gp: parseNumeric(prospect.gp),
        } as Prospect)));
        setTotalProspectsCount(count || 0);
      }

      // Fetch subtotals using RPC
      const { data: aggregateData, error: aggregateError } = await supabase.rpc("get_prospects_subtotals", {
        p_batch_number: maxBatch,
        p_allowed_ams: allowedAMs,
        p_search_query: debouncedSearchQuery.trim() ? escapeSearch(debouncedSearchQuery) : "",
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_category_filter: categoryFilter
      });

      if (aggregateError) {
        console.error("Failed to load prospects aggregates:", aggregateError.message);
        setTotalAmount(0);
        setTotalGP(0);
      } else {
        const stats = (Array.isArray(aggregateData) ? aggregateData[0] : aggregateData) as { sum_amount: number; sum_gp: number } | null;
        setTotalAmount(stats?.sum_amount ?? 0);
        setTotalGP(stats?.sum_gp ?? 0);
      }
    } else {
      setProspects([]);
      setTotalProspectsCount(0);
      setTotalAmount(0);
      setTotalGP(0);
    }
    
    setLoading(false);
    const endTime = performance.now();
    console.log(`[Prospects] Query latency: ${(endTime - startTime).toFixed(2)}ms`);
  }, [debouncedSearchQuery, startDate, endDate, categoryFilter, sortConfig, currentPage, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProspects();
  }, [loadProspects]);

  const handlePresetRangeSelect = (preset: string) => {
    if (preset === "custom") return;

    const now = new Date();
    const year = now.getFullYear();
    let start = "";
    let end = "";

    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${year}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    switch (preset) {
      case "q1": start = `${year}-01-01`; end = `${year}-03-31`; break;
      case "q2": start = `${year}-04-01`; end = `${year}-06-30`; break;
      case "q3": start = `${year}-07-01`; end = `${year}-09-30`; break;
      case "q4": start = `${year}-10-01`; end = `${year}-12-31`; break;
      case "1h": start = `${year}-01-01`; end = `${year}-06-30`; break;
      case "2h": start = `${year}-07-01`; end = `${year}-12-31`; break;
      case "ytd": start = `${year}-01-01`; end = todayStr; break;
      case "yte": start = todayStr; end = `${year}-12-31`; break;
      default:
        if (preset.startsWith("m")) {
          const month = parseInt(preset.substring(1));
          if (month >= 1 && month <= 12) {
            start = `${year}-${pad(month)}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const end = `${year}-${pad(month)}-${pad(lastDay)}`;
            setStartDate(start);
            setEndDate(end);
            return;
          }
        }
    }

    if (start && end) {
      setStartDate(start);
      setEndDate(end);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, sortConfig, pageSize, categoryFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as Record<string, unknown>[];
      
      const newProspects: Prospect[] = json.map((row) => {
        const categoryResult = determineCategory(row);
        return {
        id_top_sales: parseNumeric(row["ID_TOP_SALES"]),
        am_name: parseText(row["AM_NAME"]),
        company_name: parseText(row["COMPANY_NAME"]),
        directorat: parseText(row["DIRECTORAT"]),
        group_name: parseText(row["GROUP_NAME"]),
        id_project: parseText(row["ID_PROJECT"]),
        id_prospect_status: parseNumeric(row["ID_PROSPECT_STATUS"]),
        prospect_name: parseText(row["PROSPECT_NAME"]),
        client_name: parseText(row["CLIENT_NAME"]),
        status: parseText(row["STATUS"]),
        term_of_payment: parseText(row["TERM_OF_PAYMENT"]),
        amount: parseNumeric(row[" AMOUNT "] ?? row["AMOUNT"]),
        gp: parseNumeric(row[" GP "] ?? row["GP"]),
        amount_cl: parseNumeric(row[" AMOUNT_CL "] ?? row["AMOUNT_CL"]),
        gp_cl: parseNumeric(row[" GP_CL "] ?? row["GP_CL"]),
        est_prospect_close_date: parseDate(row["EST_PROSPECT_CLOSE_DATE"]),
        target_date: parseDate(row["TARGET_DATE"]),
        confidence_level: parseNumeric(row["CONFIDENCE_LEVEL"]),
        osv_non_osl: parseNumeric(row["OSV - Non OSL"]),
        opr_del: parseNumeric(row["OPR&DEL"]),
        category: categoryResult.category,
        category_note: categoryResult.category_note,
      };
      });

      if (!isSupabaseConfigured) {
        setProspects(newProspects);
        setSuccess(`Loaded from Excel locally using ${file.name} (Supabase not connected).`);
        setLoading(false);
        return;
      }

      const { data: maxBatchData, error: maxBatchError } = await supabase
        .from("prospects")
        .select("batch_number")
        .order("batch_number", { ascending: false })
        .limit(1);

      if (maxBatchError) {
        if (isMissingBatchColumnError(maxBatchError)) {
          throw new Error(
            "Upload blocked: prospects.batch_number is missing. Run backend/add_batch_columns.sql first."
          );
        }
        throw maxBatchError;
      }

      const nextBatch = (maxBatchData && maxBatchData.length > 0 ? maxBatchData[0].batch_number : 0) + 1;

      const chunkSize = 100;

      const prospectsWithBatch = newProspects.map((prospect) => ({
        ...prospect,
        batch_number: nextBatch,
      }));

      for (let i = 0; i < prospectsWithBatch.length; i += chunkSize) {
        const chunk = prospectsWithBatch.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from("prospects").insert(chunk);
        if (insertError) throw insertError;
      }

      setSuccess(`Successfully uploaded ${newProspects.length} prospects in batch ${nextBatch} using ${file.name}!`);

      await loadProspects();
    } catch (err: unknown) {
      console.error(err);
      setError(`Failed to save to database. If needed, run backend/add_batch_columns.sql to add missing fields. Details: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleExport = async () => {
    if (!isSupabaseConfigured || loading) return;
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const { data: maxBatch, error: maxBatchError } = await supabase.rpc("get_latest_batch", { p_table_id: "prospects" });
      if (maxBatchError || !maxBatch) {
        setError("No data found to export.");
        setLoading(false);
        return;
      }

      let query = supabase
        .from("prospects")
        .select("prospect_name, am_name, company_name, id_project, amount, gp, status, confidence_level, est_prospect_close_date, target_date, category, category_note")
        .eq("batch_number", maxBatch)
        .in("am_name", allowedAMs);

      if (debouncedSearchQuery.trim()) {
        const q = escapeSearch(debouncedSearchQuery);
        query = query.or(
          [
            `id_project.ilike.%${q}%`,
            `client_name.ilike.%${q}%`,
            `prospect_name.ilike.%${q}%`,
            `am_name.ilike.%${q}%`,
            `company_name.ilike.%${q}%`,
            `category.ilike.%${q}%`,
            `status.ilike.%${q}%`,
          ].join(",")
        );
      }

      if (categoryFilter !== "all") {
        if (categoryFilter === "CSS") {
          query = query.or([
            "category.eq.CSS",
            ...cssNameFallbackPatterns.map((pattern) => `prospect_name.ilike.${pattern}`),
          ].join(","));
        } else if (categoryFilter === "UNCLASSIFIED") {
          query = query.or("category.eq.UNCLASSIFIED,category.is.null,category.eq.");
        } else {
          query = query.eq("category", categoryFilter);
        }
      }

      if (startDate) query = query.gte("target_date", startDate);
      if (endDate) query = query.lte("target_date", endDate);

      console.log("[Prospects] Starting export query...");
      const { data, error: exportError } = await query.order("prospect_name", { ascending: true });
      if (exportError) {
        console.error("[Prospects] Export query failed:", exportError);
        throw exportError;
      }

      if (!data || data.length === 0) {
        setError("No matching data found to export.");
        setLoading(false);
        return;
      }

      const exportData = data.map(p => ({
        'PROSPECT_NAME': p.prospect_name,
        'AM_NAME': p.am_name,
        'COMPANY_NAME': p.company_name,
        'ID_PROJECT': p.id_project,
        'AMOUNT': p.amount,
        'GP': p.gp,
        'STATUS': p.status,
        'CONFIDENCE_LEVEL': p.confidence_level,
        'EST_PROSPECT_CLOSE_DATE': p.est_prospect_close_date,
        'TARGET_DATE': p.target_date,
        'CATEGORY': p.category,
        'CATEGORY_NOTE': p.category_note
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Prospects");
      XLSX.writeFile(wb, `Prospects_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      setSuccess(`Successfully exported ${data.length} prospects!`);
    } catch (err: unknown) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof Prospect) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(totalProspectsCount / pageSize);


  const renderSortableHeader = (label: React.ReactNode, key: keyof Prospect, title?: string, align: "left" | "center" = "left", className?: string) => {
    const isActive = sortConfig?.key === key;
    return (
      <th 
        className={cn(
          "py-2 pr-3 font-medium cursor-pointer hover:text-foreground select-none group",
          align === "center" && "text-center pr-0",
          className
        )}
        onClick={() => handleSort(key)}
        title={title}
      >
        <div className={cn("flex items-center gap-1", align === "center" && "justify-center")}>
          {align === "center" && <div className="w-3.5" />} {/* Spacer to balance sort icon */}
          {label}
          {isActive ? (
            sortConfig.direction === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">List of Prospects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prospecting pipeline and targets tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild disabled={loading}>
            <label className="cursor-pointer flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Excel
              <input
                type="file"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
            </label>
          </Button>
          <Button 
            variant="default" 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={handleExport}
            disabled={loading || totalProspectsCount === 0}
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle>All Prospects</CardTitle>
            <CardDescription>
              {error && <span className="text-destructive font-medium block mt-1">{error}</span>}
              {success && <span className="text-green-600 dark:text-green-400 font-medium block mt-1">{success}</span>}
              {totalProspectsCount > 0 && <span className="block mt-1">Showing {prospects.length} of {totalProspectsCount} prospects</span>}
            </CardDescription>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="FCC">FCC</SelectItem>
                  <SelectItem value="CSS">CSS</SelectItem>
                  <SelectItem value="UNCLASSIFIED">Unclassified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={presetRange} onValueChange={(val) => {
                setPresetRange(val);
                if (val === "custom") { setStartDate(""); setEndDate(""); }
                else handlePresetRangeSelect(val);
              }}>
                <SelectTrigger className="w-[100px] h-9 text-xs">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">All Periods</SelectItem>
                  <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30">Quarterly</div>
                  <SelectItem value="q1">Q1</SelectItem>
                  <SelectItem value="q2">Q2</SelectItem>
                  <SelectItem value="q3">Q3</SelectItem>
                  <SelectItem value="q4">Q4</SelectItem>
                  <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30 border-t">Monthly</div>
                  <SelectItem value="m1">January</SelectItem>
                  <SelectItem value="m2">February</SelectItem>
                  <SelectItem value="m3">March</SelectItem>
                  <SelectItem value="m4">April</SelectItem>
                  <SelectItem value="m5">May</SelectItem>
                  <SelectItem value="m6">June</SelectItem>
                  <SelectItem value="m7">July</SelectItem>
                  <SelectItem value="m8">August</SelectItem>
                  <SelectItem value="m9">September</SelectItem>
                  <SelectItem value="m10">October</SelectItem>
                  <SelectItem value="m11">November</SelectItem>
                  <SelectItem value="m12">December</SelectItem>
                  <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30 border-t">Semiannual & Year</div>
                  <SelectItem value="1h">1H</SelectItem>
                  <SelectItem value="2h">2H</SelectItem>
                  <SelectItem value="ytd">YTD</SelectItem>
                  <SelectItem value="yte">YTE</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="w-[125px] h-9 text-xs text-muted-foreground"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPresetRange("custom");
                }}
                title="Start Target Date"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                className="w-[125px] h-9 text-xs text-muted-foreground"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPresetRange("custom");
                }}
                title="End Target Date"
              />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prospects..."
                  className="w-full sm:w-[220px] pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground whitespace-nowrap">
                  {renderSortableHeader("PID", "id_project")}
                  {renderSortableHeader("Client", "client_name")}
                  {renderSortableHeader("Prospect Name", "prospect_name")}
                  {renderSortableHeader("Account Manager", "am_name")}
                  {renderSortableHeader("Category", "category", undefined, "center")}
                  {renderSortableHeader("Status", "status")}
                  {renderSortableHeader("Revenue", "amount")}
                  {renderSortableHeader("Gross Profit", "gp")}
                  {renderSortableHeader("Target Date", "target_date")}
                </tr>
              </thead>
              <tbody>
                {loading && prospects.length === 0 ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="py-4 pr-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : prospects.length === 0 ? (
                  <tr>
                    <td className="py-24 text-center text-muted-foreground" colSpan={9}>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-muted p-4">
                          <Inbox className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">No prospects found</p>
                          <p className="text-xs">Upload a prospect report to get started.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : totalProspectsCount === 0 ? (
                  <tr>
                    <td className="py-24 text-center text-muted-foreground" colSpan={9}>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-muted p-4">
                          <Search className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">No matches found</p>
                          <p className="text-xs">Try adjusting your filters or search query.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  prospects.map((p, idx) => {
                    return (
                      <tr key={p.id || idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors whitespace-nowrap">
                        <td className="py-2 pr-3 font-medium">{p.id_project || "-"}</td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[150px] truncate" title={p.client_name || ""}>{p.client_name || "-"}</td>
                        <td className="py-2 pr-3 font-medium max-w-[200px] truncate" title={p.prospect_name || ""}>{p.prospect_name || "-"}</td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[150px] truncate" title={p.am_name || ""}>{p.am_name || "-"}</td>
                        <td className="py-2 text-center">
                          <div className="flex justify-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
                              p.category === "FCC" && "bg-blue-100 text-blue-700 border-blue-200",
                              p.category === "CSS" && "bg-purple-100 text-purple-700 border-purple-200",
                              p.category === "UNCLASSIFIED" && "bg-slate-100 text-slate-700 border-slate-200"
                            )} title={p.category_note || ""}>
                              {p.category || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                            p.status?.toLowerCase().includes("win") ? "bg-green-100 text-green-700 border-green-200" :
                            p.status?.toLowerCase().includes("identifying") ? "bg-blue-100 text-blue-700 border-blue-200" :
                            "bg-gray-100 text-gray-700 border-gray-200"
                          )}>
                            {p.status || "-"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-medium text-foreground">
                          {p.amount != null ? `Rp ${p.amount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}` : "-"}
                        </td>
                        <td className="py-2 pr-3 font-medium text-foreground">
                          {p.gp != null ? `Rp ${p.gp.toLocaleString('id-ID', { maximumFractionDigits: 0 })}` : "-"}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{formatDate(p.target_date)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {totalProspectsCount > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-muted-foreground/20 text-foreground font-semibold whitespace-nowrap bg-muted/10">
                    <td colSpan={6} className="py-3 pr-3 text-right">SUBTOTAL</td>
                    <td className="py-3 pr-3">
                      Rp {totalAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 pr-3">
                      Rp {totalGP.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 pr-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Footer */}
          {totalProspectsCount > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
