"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, 
  ChevronRight, ChevronsLeft, ChevronsRight, Upload, Download, Inbox 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { determineCategory } from "@/lib/classification";

type ProjectTarget = {
  id?: string;
  target_id: number | null;
  company_name: string | null;
  project_id: string | null;
  customer: string | null;
  project_name: string | null;
  project_manager: string | null;
  account_manager: string | null;
  group_am?: string | null;
  is_po?: string | null;
  is_contract?: string | null;
  term_of_payment_sales: string | null;
  invoice_status: string | null;
  project_category: string | null;
  project_tracking: string | null;
  total: number | null;
  gp_acc: number | null;
  net_profit_project?: number | null;
  npp_actual?: number | null;
  client_po_date: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  payment_date: string | null;
  target_date: string | null;
  target_invoice_r0: string | null;
  aging_invoice: number | null;
  count_target_change: number | null;
  history_update_target_date?: string | null;
  last_update: string | null;
  reason_update?: string | null;
  batch_number?: number;
  upload_date?: string;
  status?: string | null;
  category?: string | null;
  category_note?: string | null;
};

// Helpers for robust parsing
const parseDate = (value: unknown): string | null => {
  if (!value) return null;
  // Handle Excel serial number (no timezone issues)
  if (typeof value === "number") {
    const utcDays = Math.floor(value) - 25569;
    const ms = utcDays * 86400 * 1000;
    const d = new Date(ms);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  // Handle Date object (fallback)
  if (value instanceof Date) {
    const yyyy = value.getUTCFullYear();
    const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(value.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  // Handle string dates
  if (typeof value === "string" && value.trim()) {
    return value.trim().split("T")[0];
  }
  return null;
};

const parseNumeric = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

const parseText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

// Classification logic is now imported from @/lib/classification

export default function ProjectTargetPage() {
  const [targets, setTargets] = useState<ProjectTarget[]>([]);
  const [totalTargetsCount, setTotalTargetsCount] = useState(0);
  const [subtotalTotal, setSubtotalTotal] = useState(0);
  const [subtotalGrossProfit, setSubtotalGrossProfit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [presetRange, setPresetRange] = useState("custom");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [invoiceDateEmpty, setInvoiceDateEmpty] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProjectTarget; direction: "asc" | "desc" } | null>({ key: "target_date", direction: "asc" });
  
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

  const getTargetsOrderColumn = (key: keyof ProjectTarget) => {
    switch (key) {
      case "project_id":
      case "customer":
      case "project_name":
      case "project_manager":
      case "account_manager":
      case "term_of_payment_sales":
      case "category":
      case "status":
      case "target_date":
      case "invoice_date":
      case "total":
      case "gp_acc":
        return key;
      default:
        return "created_at";
    }
  };

  const loadTargets = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const startTime = performance.now();
    setLoading(true);
    
    const { data: maxBatch, error: maxBatchError } = await supabase.rpc("get_latest_batch", { p_table_id: "targets" });
      
    if (maxBatchError) {
      console.error("Failed to fetch latest batch:", maxBatchError.message);
      setLoading(false);
      return;
    }
    
    if (maxBatch > 0) {
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;
      const orderColumn = sortConfig ? getTargetsOrderColumn(sortConfig.key) : "target_date";
      const ascending = sortConfig ? sortConfig.direction === "asc" : true;

      let query = supabase
        .from("project_targets")
        .select("id, target_id, company_name, project_id, customer, project_name, project_manager, account_manager, term_of_payment_sales, invoice_status, project_category, project_tracking, total, gp_acc, client_po_date, invoice_number, invoice_date, payment_date, target_date, target_invoice_r0, aging_invoice, count_target_change, last_update, status, category, category_note, batch_number, created_at", { count: "exact" })
        .eq("batch_number", maxBatch)
        .or("invoice_date.is.null,invoice_date.lt.2025-01-01,invoice_date.gte.2026-01-01");

      if (debouncedSearchQuery.trim()) {
        const q = escapeSearch(debouncedSearchQuery);
        query = query.or(
          [
            `project_id.ilike.%${q}%`,
            `customer.ilike.%${q}%`,
            `project_name.ilike.%${q}%`,
            `project_manager.ilike.%${q}%`,
            `account_manager.ilike.%${q}%`,
            `term_of_payment_sales.ilike.%${q}%`,
            `category.ilike.%${q}%`,
            `status.ilike.%${q}%`,
          ].join(",")
        );
      }

      if (startDate) {
        query = query.gte("target_date", startDate);
      }

      if (endDate) {
        query = query.lte("target_date", endDate);
      }

      if (invoiceDateEmpty) {
        query = query.is("invoice_date", null);
      }

      if (categoryFilter !== "all") {
        if (categoryFilter === "CSS") {
          query = query.eq("category", "CSS");
        } else if (categoryFilter === "FCC") {
          query = query.eq("category", "FCC");
        } else if (categoryFilter === "UNCLASSIFIED") {
          query = query.or("category.eq.UNCLASSIFIED,category.is.null,category.eq.");
        } else {
          query = query.eq("category", categoryFilter);
        }
      }

      const { data, error, count } = await query
        .order(orderColumn, { ascending })
        .order("created_at", { ascending: false })
        .range(start, end);

      // Fetch subtotals using RPC instead of manual reduction of all rows
      const { data: aggregateData, error: aggregateError } = await supabase.rpc("get_backlog_subtotals", {
        p_batch_number: maxBatch,
        p_search_query: debouncedSearchQuery.trim() ? escapeSearch(debouncedSearchQuery) : "",
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_invoice_date_empty: invoiceDateEmpty,
        p_category_filter: categoryFilter
      });
        
      if (error) {
        console.error("Failed to load project targets:", error.message);
        setTargets([]);
        setTotalTargetsCount(0);
        setSubtotalTotal(0);
        setSubtotalGrossProfit(0);
      } else if (aggregateError) {
        console.error("Failed to load target aggregates:", aggregateError.message);
        setTargets((data || []).map((target) => ({
          ...target,
          total: parseNumeric(target.total),
          gp_acc: parseNumeric(target.gp_acc),
        })));
        setTotalTargetsCount(count || 0);
        setSubtotalTotal(0);
        setSubtotalGrossProfit(0);
      } else {
        setTargets((data || []).map((target) => ({
          ...target,
          total: parseNumeric(target.total),
          gp_acc: parseNumeric(target.gp_acc),
        })));
        setTotalTargetsCount(count || 0);
        const stats = (Array.isArray(aggregateData) ? aggregateData[0] : aggregateData) as { sum_total: number; sum_gp_acc: number } | null;
        setSubtotalTotal(stats?.sum_total ?? 0);
        setSubtotalGrossProfit(stats?.sum_gp_acc ?? 0);
      }
    } else {
      setTargets([]);
      setTotalTargetsCount(0);
      setSubtotalTotal(0);
      setSubtotalGrossProfit(0);
    }
    
    setLoading(false);
    const endTime = performance.now();
    console.log(`[Backlog] Query latency: ${(endTime - startTime).toFixed(2)}ms`);
  }, [debouncedSearchQuery, startDate, endDate, invoiceDateEmpty, sortConfig, pageSize, currentPage, categoryFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTargets();
  }, [loadTargets]);

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
        // Handle monthly presets (m1 - m12)
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
  }, [searchQuery, startDate, endDate, invoiceDateEmpty, sortConfig, pageSize, categoryFilter]);

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
      
      const newTargets: ProjectTarget[] = json.map((row) => ({
        target_id: parseNumeric(row["ID"]),
        company_name: parseText(row["COMPANY_NAME"]),
        project_id: parseText(row["PROJECT_ID"]),
        customer: parseText(row["CUSTOMER"]),
        project_name: parseText(row["PROJECT_NAME"]),
        project_manager: parseText(row["PROJECT_MANAGER"]),
        account_manager: parseText(row["ACCOUNT_MANAGER"]),
        group_am: parseText(row["GROUP_AM"]),
        is_po: parseText(row["IS_PO"]),
        is_contract: parseText(row["IS_CONTRACT"]),
        term_of_payment_sales: parseText(row["TERM_OF_PAYMENT_SALES"]),
        invoice_status: parseText(row["INVOICE_STATUS"]),
        project_category: parseText(row["PROJECT_CATEGORY"]),
        project_tracking: parseText(row["PROJECT_TRACKING"]),
        total: parseNumeric(row["TOTAL"]),
        gp_acc: parseNumeric(row["GP_ACC"]),
        net_profit_project: parseNumeric(row["NET_PROFIT_PROJECT"]),
        npp_actual: parseNumeric(row["NPP_ACTUAL"]),
        client_po_date: parseDate(row["CLIENT_PO_DATE"]),
        invoice_number: parseText(row["INVOICE_NUMBER"]),
        invoice_date: parseDate(row["INVOICE_DATE"]),
        payment_date: parseDate(row["PAYMENT_DATE"]),
        target_date: parseDate(row["TARGET_DATE"]),
        target_invoice_r0: parseDate(row["TARGET_INVOICE_R0"]),
        aging_invoice: parseNumeric(row["AGING_INVOICE"]),
        count_target_change: parseNumeric(row["COUNT_TARGET_CHANGE"]),
        history_update_target_date: parseText(row["HISTORY_UPDATE_TARGET_DATE"]),
        last_update: parseDate(row["LAST_UPDATE"]),
        reason_update: parseText(row["REASON_UPDATE"]),
        category: determineCategory(row).category,
        category_note: determineCategory(row).category_note,
      }));

      if (!isSupabaseConfigured) {
        setTargets(newTargets);
        setSuccess(`Loaded from Excel locally using ${file.name} (Supabase not connected).`);
        setLoading(false);
        return;
      }

      // Get max batch number to determine next batch
      const { data: maxBatchData } = await supabase
        .from("project_targets")
        .select("batch_number")
        .order("batch_number", { ascending: false })
        .limit(1);
        
      const nextBatch = (maxBatchData && maxBatchData.length > 0 ? maxBatchData[0].batch_number : 0) + 1;
      
      const newTargetsWithBatch = newTargets.map(target => ({
        ...target,
        batch_number: nextBatch,
        status: "On Track"
      }));

      const chunkSize = 100;
      for (let i = 0; i < newTargetsWithBatch.length; i += chunkSize) {
        const chunk = newTargetsWithBatch.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from("project_targets").insert(chunk);
        if (insertError) throw insertError;
      }

      setSuccess(`Successfully uploaded ${newTargets.length} project targets using ${file.name}!`);
      await loadTargets();
    } catch (err: unknown) {
      console.error(err);
      setError(`Failed to save to database. Note: You need to run the updated SQL script to create the 'project_targets' table first! Details: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleExport = async () => {
    if (!isSupabaseConfigured || loading) return;
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Fetch current max batch
      const { data: maxBatchData } = await supabase
        .from("project_targets")
        .select("batch_number")
        .order("batch_number", { ascending: false })
        .limit(1);
        
      const maxBatch = maxBatchData && maxBatchData.length > 0 ? maxBatchData[0].batch_number : 0;
      
      if (maxBatch === 0) {
        setError("No data found to export.");
        setLoading(false);
        return;
      }

      // Fetch all targets for the current filters (without pagination)
      let query = supabase
        .from("project_targets")
        .select("*")
        .eq("batch_number", maxBatch)
        .or("invoice_date.is.null,invoice_date.lt.2025-01-01,invoice_date.gte.2026-01-01");

      // Apply search/filters
      if (debouncedSearchQuery.trim()) {
        const q = escapeSearch(debouncedSearchQuery);
        query = query.or(
          [
            `project_id.ilike.%${q}%`,
            `customer.ilike.%${q}%`,
            `project_name.ilike.%${q}%`,
            `project_manager.ilike.%${q}%`,
            `account_manager.ilike.%${q}%`,
            `term_of_payment_sales.ilike.%${q}%`,
            `category.ilike.%${q}%`,
            `status.ilike.%${q}%`,
          ].join(",")
        );
      }

      if (startDate) query = query.gte("target_date", startDate);
      if (endDate) query = query.lte("target_date", endDate);
      if (invoiceDateEmpty) query = query.is("invoice_date", null);

      if (categoryFilter !== "all") {
        if (categoryFilter === "CSS") query = query.eq("category", "CSS");
        else if (categoryFilter === "FCC") query = query.eq("category", "FCC");
        else if (categoryFilter === "UNCLASSIFIED") query = query.or("category.eq.UNCLASSIFIED,category.is.null,category.eq.");
        else query = query.eq("category", categoryFilter);
      }

      const { data, error: exportError } = await query.order("target_date", { ascending: true });

      if (exportError) throw exportError;

      if (!data || data.length === 0) {
        setError("No matching data found to export.");
        setLoading(false);
        return;
      }

      // Map to Excel rows with requested headers
      const exportData = data.map(t => ({
        'PROJECT_ID': t.project_id,
        'CUSTOMER': t.customer,
        'PROJECT_NAME': t.project_name,
        'PROJECT_MANAGER': t.project_manager,
        'ACCOUNT_MANAGER': t.account_manager,
        'TERM_OF_PAYMENT_SALES': t.term_of_payment_sales,
        'PROJECT_CATEGORY': t.project_category,
        'PROJECT_TRACKING': t.project_tracking,
        'TOTAL': t.total,
        'GP_ACC': t.gp_acc,
        'INVOICE_NUMBER': t.invoice_number,
        'INVOICE_DATE': t.invoice_date,
        'PAYMENT_DATE': t.payment_date,
        'TARGET_DATE': t.target_date,
        'CATEGORY': t.category,
        'STATUS': t.status || 'On Track'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Backlog");
      XLSX.writeFile(wb, `Backlog_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setSuccess(`Successfully exported ${data.length} records to Excel!`);
    } catch (err: unknown) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string | undefined, newStatus: string) => {
    if (!id || !isSupabaseConfigured) return;
    setTargets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from("project_targets").update({ status: newStatus }).eq("id", id);
    if (error) console.error("Failed to update status:", error.message);
  };

  const handleSort = (key: keyof ProjectTarget) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(totalTargetsCount / pageSize);

  const renderSortableHeader = (label: React.ReactNode, key: keyof ProjectTarget, title?: string, align: "left" | "center" = "left") => {
    const isActive = sortConfig?.key === key;
    return (
      <th 
        className={cn(
          "py-2 pr-3 font-medium cursor-pointer hover:text-foreground select-none group",
          align === "center" && "text-center pr-0"
        )} 
        onClick={() => handleSort(key)}
        title={title}
      >
        <div className={cn("flex items-center gap-1", align === "center" && "justify-center")}>
          {align === "center" && <div className="w-3.5" />} {/* Spacer for balance */}
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
          <h1 className="text-2xl font-semibold tracking-tight">Backlog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Term of payment targets for each project.
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
            disabled={loading || totalTargetsCount === 0}
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle>All Backlog</CardTitle>
            <CardDescription>
              {error && <span className="text-destructive font-medium block mt-1">{error}</span>}
              {success && <span className="text-green-600 dark:text-green-400 font-medium block mt-1">{success}</span>}
              {totalTargetsCount > 0 && <span className="block mt-1">Showing {targets.length} of {totalTargetsCount} targets</span>}
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
              <div className="flex items-center space-x-2 ml-1">
                <Checkbox 
                  id="invoice-empty" 
                  checked={invoiceDateEmpty} 
                  onCheckedChange={(checked) => setInvoiceDateEmpty(checked as boolean)} 
                />
                <label 
                  htmlFor="invoice-empty" 
                  className="text-xs font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap"
                >
                  Invoice Date Empty
                </label>
              </div>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="w-full sm:w-[220px] pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground whitespace-nowrap">
                  {renderSortableHeader("PID", "project_id")}
                  {renderSortableHeader("Customer", "customer")}
                  {renderSortableHeader("Project Name", "project_name")}
                  {renderSortableHeader("Project Manager", "project_manager")}
                  {renderSortableHeader("Account Manager", "account_manager")}
                  {renderSortableHeader("Term of Payment", "term_of_payment_sales")}
                  {renderSortableHeader("Revenue", "total")}
                  {renderSortableHeader("Gross Profit", "gp_acc")}
                  {renderSortableHeader("Target Date", "target_date")}
                  {renderSortableHeader("Category", "category", undefined, "center")}
                  {renderSortableHeader("Status", "status", undefined, "center")}
                </tr>
              </thead>
              <tbody>
                {loading && targets.length === 0 ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className="py-4 pr-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : targets.length === 0 ? (
                  <tr>
                    <td className="py-24 text-center text-muted-foreground" colSpan={11}>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-muted p-4">
                          <Inbox className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">No backlog found</p>
                          <p className="text-xs">Upload a project target file to get started.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : totalTargetsCount === 0 ? (
                  <tr>
                    <td className="py-24 text-center text-muted-foreground" colSpan={11}>
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
                  targets.map((target, idx) => {
                    return (
                      <tr key={target.id || idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors whitespace-nowrap">
                        <td className="py-2 pr-3 font-medium">{target.project_id || "-"}</td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[150px] truncate" title={target.customer || ""}>{target.customer || "-"}</td>
                        <td className="py-2 pr-3 font-medium max-w-[200px] truncate" title={target.project_name || ""}>{target.project_name || "-"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{target.project_manager || "-"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{target.account_manager || "-"}</td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[200px] truncate" title={target.term_of_payment_sales || ""}>{target.term_of_payment_sales || "-"}</td>
                        <td className="py-2 pr-3 font-medium text-foreground">
                          {target.total != null ? `Rp ${target.total.toLocaleString('id-ID', { maximumFractionDigits: 0 })}` : "-"}
                        </td>
                        <td className="py-2 pr-3 font-medium text-foreground">
                          {target.gp_acc != null ? `Rp ${target.gp_acc.toLocaleString('id-ID', { maximumFractionDigits: 0 })}` : "-"}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{formatDate(target.target_date)}</td>
                        <td className="py-2 text-center">
                          <div className="flex justify-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
                              target.category === "FCC" && "bg-blue-100 text-blue-700 border-blue-200",
                              target.category === "CSS" && "bg-purple-100 text-purple-700 border-purple-200",
                              target.category === "UNCLASSIFIED" && "bg-slate-100 text-slate-700 border-slate-200"
                            )} title={target.category_note || ""}>
                              {target.category || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          <div className="flex justify-center">
                            <Select 
                              value={target.status || "On Track"} 
                              onValueChange={(val) => updateStatus(target.id, val)}
                            >
                              <SelectTrigger className={cn(
                                "!h-auto !py-0.5 !px-2 !rounded-full !justify-center text-[10px] font-medium border shadow-none w-fit whitespace-nowrap focus:ring-0 focus:ring-offset-0 hover:opacity-80 transition-opacity [&>svg]:hidden",
                                (!target.status || target.status === "On Track") && "bg-green-100 text-green-700 border-green-200",
                                target.status === "At Risk" && "bg-amber-100 text-amber-700 border-amber-200",
                                target.status === "Delayed" && "bg-red-100 text-red-700 border-red-200"
                              )}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="On Track" className="text-green-600 font-medium text-xs">On Track</SelectItem>
                                <SelectItem value="At Risk" className="text-amber-600 font-medium text-xs">At Risk</SelectItem>
                                <SelectItem value="Delayed" className="text-red-600 font-medium text-xs">Delayed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {totalTargetsCount > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-muted-foreground/20 text-foreground font-semibold whitespace-nowrap bg-muted/10">
                    <td colSpan={6} className="py-3 pr-3 text-right">SUBTOTAL</td>
                    <td className="py-3 pr-3">
                      Rp {subtotalTotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 pr-3">
                      Rp {subtotalGrossProfit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 pr-3"></td>
                    <td className="py-3 pr-3"></td>
                    <td className="py-3 pr-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Footer */}
          {totalTargetsCount > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
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
                <span>rows per page</span>
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
