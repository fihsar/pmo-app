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
// xlsx is ~400 KB — loaded only when the user uploads or exports
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { defaultBusinessRules, type BusinessRules } from "@/lib/business-rules.shared";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { determineCategory } from "@/lib/classification";
import { projectRowSchema, validateRows } from "@/lib/excel-row-schemas";
import { parseXlsxInWorker } from "@/lib/use-xlsx-parser";
import type { Tables, Database } from "@/lib/database.types";

type Project = Tables<"projects">;

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
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Accept common Excel/user formatting like "75%", "1,234.56", or "75,5"
    const withoutPercent = trimmed.replace(/%/g, "");
    const normalized = withoutPercent.includes(",") && !withoutPercent.includes(".")
      ? withoutPercent.replace(/,/g, ".")
      : withoutPercent.replace(/,/g, "");

    const num = Number(normalized);
    return isNaN(num) ? null : num;
  }

  const num = Number(value);
  return isNaN(num) ? null : num;
};

const pickNumeric = (obj: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      const parsed = parseNumeric(obj[key]);
      if (parsed !== null) return parsed;
    }
  }
  return null;
};

const normalizeProject = (project: Record<string, unknown>): Project => {
  const normalized = {
    ...project,
    percentage_progress: pickNumeric(project, [
      "percentage_progress",
      "PERCENTAGE_PROGRESS",
      "Percentage Progress",
    ]),
    pqi_time: pickNumeric(project, [
      "pqi_time",
      "PQI_TIME",
      "PQI Time",
    ]),
    pqi_cost: pickNumeric(project, [
      "pqi_cost",
      "PQI_COST",
      "PQI Cost",
    ]),
  };

  return normalized as Project;
};

const isMissingBatchColumnError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return msg.includes("batch_number") && msg.includes("does not exist");
};

const getPqiTimeConfig = (val: number | null) => {
  if (val === null) return { color: "bg-muted", textColor: "text-muted-foreground" };
  if (val < 1) return { color: "bg-foreground", textColor: "text-foreground" };
  if (val <= 70) return { color: "bg-red-500", textColor: "text-red-600 dark:text-red-500" };
  if (val < 91) return { color: "bg-yellow-500", textColor: "text-yellow-600 dark:text-yellow-500" };
  return { color: "bg-green-600", textColor: "text-green-600 dark:text-green-500" };
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalProjectsCount, setTotalProjectsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [businessRules, setBusinessRules] = useState<BusinessRules>(defaultBusinessRules);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Project; direction: "asc" | "desc" } | null>(null);
  
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

  useEffect(() => {
    const loadRules = async () => {
      try {
        const response = await fetch("/api/business-rules");
        const payload = (await response.json()) as { rules?: BusinessRules };
        if (response.ok && payload.rules) {
          setBusinessRules(payload.rules);
        }
      } catch {
        // Keep defaults.
      }
    };

    void loadRules();
  }, []);

  const escapeSearch = (value: string) => value.trim().replace(/,/g, " ");

  const getProjectsOrderColumn = (key: keyof Project) => {
    switch (key) {
      case "project_id":
      case "project_name":
      case "customer":
      case "project_manager":
      case "category":
        return key;
      case "percentage_progress":
        return "percentage_progress";
      case "pqi_time":
        return "pqi_time";
      case "pqi_cost":
        return "pqi_cost";
      default:
        return "created_at";
    }
  };

  const loadProjects = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const startTime = performance.now();
    setLoading(true);
    
    const { data: maxBatch, error: maxBatchError } = await supabase.rpc("get_latest_batch", { p_table_id: "projects" });
      
    if (maxBatchError) {
      console.error("Failed to fetch latest batch:", maxBatchError.message);
      setError(`Failed to load projects: ${maxBatchError.message}`);
      setProjects([]);
      setLoading(false);
      return;
    }

    if (maxBatch > 0) {
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;
      const orderColumn = sortConfig ? getProjectsOrderColumn(sortConfig.key) : "created_at";
      const ascending = sortConfig ? sortConfig.direction === "asc" : false;

      let query = supabase
        .from("projects")
        .select("*", { count: "exact" })
        .eq("batch_number", maxBatch);

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (debouncedSearchQuery.trim()) {
        const q = escapeSearch(debouncedSearchQuery);
        query = query.or(
          [
            `project_id.ilike.%${q}%`,
            `project_name.ilike.%${q}%`,
            `customer.ilike.%${q}%`,
            `project_manager.ilike.%${q}%`,
            `category.ilike.%${q}%`,
          ].join(",")
        );
      }

      const { data, error, count } = await query
        .order(orderColumn, { ascending })
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) {
        console.error("Failed to load projects:", error.message);
        setError(`Failed to load projects: ${error.message}`);
        setProjects([]);
        setTotalProjectsCount(0);
      } else {
        setProjects((data || []).map((project) => normalizeProject(project)));
        setTotalProjectsCount(count || 0);
      }
    } else {
      setProjects([]);
      setTotalProjectsCount(0);
    }
    
    setLoading(false);
    const endTime = performance.now();
    console.log(`[Projects] Query latency: ${(endTime - startTime).toFixed(2)}ms`);
  }, [debouncedSearchQuery, sortConfig, currentPage, pageSize, categoryFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProjects();
  }, [loadProjects]);

  // Reset pagination if search or sort changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchQuery, sortConfig, pageSize, categoryFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const buffer = await file.arrayBuffer();
      const json = await parseXlsxInWorker(buffer);

      if (json.length === 0) {
        throw new Error("Invalid Projects template: file is empty or has no data rows.");
      }

      const headers = Object.keys(json[0]).map((h) => h.trim().toUpperCase());
      const requiredProjectHeaders = ["PERCENTAGE_PROGRESS", "PQI_TIME", "PQI_COST"];
      const missingProjectHeaders = requiredProjectHeaders.filter((h) => !headers.includes(h));

      if (missingProjectHeaders.length > 0) {
        const looksLikeProjectTargetTemplate = ["TARGET_DATE", "GP_ACC", "INVOICE_DATE"].every((h) => headers.includes(h));
        const looksLikeProspectsTemplate = ["AM_NAME", "PROSPECT_NAME", "CLIENT_NAME", "STATUS"].every((h) => headers.includes(h));

        if (looksLikeProjectTargetTemplate) {
          throw new Error(
            "Wrong template: this looks like Project_Target*.xlsx (Backlog data). Upload this file in Backlog page, not Projects page."
          );
        }

        if (looksLikeProspectsTemplate) {
          throw new Error(
            "Wrong template: this looks like Prospects data. Upload this file on the Prospects page."
          );
        }

        throw new Error(
          `Invalid Projects template. Missing required columns: ${missingProjectHeaders.join(", ")}`
        );
      }

      // Per-row Zod validation — catches silently-missing columns and type mismatches
      const normalizedJson = json.map((r) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim().toUpperCase(), v]))
      );
      const { invalidCount, firstErrors } = validateRows(projectRowSchema, normalizedJson);
      if (invalidCount > 0) {
        console.warn(`[Projects] ${invalidCount} row(s) failed validation:`, firstErrors);
        // Surface as a non-blocking warning rather than an error — partial data is still useful
        setSuccess(`Warning: ${invalidCount} row(s) had unexpected values and were coerced to null. First issues: ${firstErrors.slice(0, 2).join("; ")}`);
      }

      const newProjects: Database["public"]["Tables"]["projects"]["Insert"][] = json.map((row) => {
        const categoryResult = determineCategory(row as Record<string, unknown>, businessRules);
        return normalizeProject({
          project_id: row["PROJECT_ID"] || null,
          customer: row["CUSTOMER"] || null,
          project_name: row["PROJECT_NAME"] || null,
          project_reference: row["PROJECT_REFERENCE"] || null,
          project_manager: row["PROJECT_MANAGER"] || null,
          account_manager: row["ACCOUNT_MANAGER"] || null,
          pcs_status: row["PCS_STATUS"] || null,
          project_category: row["PROJECT_CATEGORY"] || null,
          client_po_date: parseDate(row["CLIENT_PO_DATE"]),
          contract_date: parseDate(row["CONTRACT_DATE"]),
          first_issued_date: parseDate(row["FIRST_ISSUED_DATE"]),
          project_start_date: parseDate(row["PROJECT_START_DATE"]),
          project_end_date: parseDate(row["PROJECT_END_DATE"]),
          golive_date: parseDate(row["GOLIVE_DATE"]),
          actual_golive_date: parseDate(row["ACTUAL_GOLIVE_DATE"]),
          warranty_end_date: parseDate(row["WARRANTY_END_DATE"]),
          actual_warranty_end_date: parseDate(row["ACTUAL_WARRANTY_END_DATE"]),
          maintenance_end_date: parseDate(row["MAINTENANCE_END_DATE"]),
          main_delivery_team: row["MAIN_DELIVERY_TEAM"] || null,
          pqi_time: parseNumeric(row["PQI_TIME"]),
          pqi_time_r_0: parseNumeric(row["PQI_TIME_R_0"]),
          pqi_cost: parseNumeric(row["PQI_COST"]),
          pqi_cost_r_0: parseNumeric(row["PQI_COST_R_0"]),
          pqi: parseNumeric(row["PQI"]),
          pqi_r0: parseNumeric(row["PQI_R0"]),
          schedule_health: row["SCHEDULE_HEALTH"] || null,
          financial_health: row["FINANCIAL_HEALTH"] || null,
          total_sales: parseNumeric(row["TOTAL_SALES"]),
          gross_profit: parseNumeric(row["GROSS_PROFIT"]),
          npp: parseNumeric(row["NPP"]),
          npp_actual: parseNumeric(row["NPP_ACTUAL"]),
          budget_by_progress: parseNumeric(row["BUDGET_BY_PROGRESS"]),
          total_budget: parseNumeric(row["TOTAL_BUDGET"]),
          budget_usage: parseNumeric(row["BUDGET_USAGE"]),
          variance_budget_usage: parseNumeric(row["VARIANCE_BUDGET_USAGE"]),
          modified_date: parseDate(row["MODIFIED_DATE"]),
          progress_date: parseDate(row["PROGRESS_DATE"]),
          percentage_progress: parseNumeric(row["PERCENTAGE_PROGRESS"]),
          current_stage: row["CURRENT_STAGE"] || null,
          progress_note: row["PROGRESS_NOTE"] || null,
          sales_osl: parseNumeric(row["SALES_OSL"]),
          sales_3sw: parseNumeric(row["SALES_3SW"]),
          sales_3sv: parseNumeric(row["SALES_3SV"]),
          sales_3hw: parseNumeric(row["SALES_3HW"]),
          sales_osv_osl: parseNumeric(row["SALES_OSV_OSL"]),
          sales_osv_nonosl: parseNumeric(row["SALES_OSV_NonOSL"]),
          sales_need_invoice_as_june_2020: parseNumeric(row["SALES_NEED_INVOICE_AS_JUNE_2020"]),
          gp_osl: parseNumeric(row["GP_OSL"]),
          gp_3sw: parseNumeric(row["GP_3SW"]),
          gp_3sv: parseNumeric(row["GP_3SV"]),
          gp_3hw: parseNumeric(row["GP_3HW"]),
          gp_osv_osl: parseNumeric(row["GP_OSV_OSL"]),
          gp_osv_nonosl: parseNumeric(row["GP_OSV_NonOSL"]),
          gp_need_invoice_as_june_2020: parseNumeric(row["GP_NEED_INVOICE_AS_JUNE_2020"]),
          category: categoryResult.category,
          category_note: categoryResult.category_note,
        });
      });

      if (newProjects.length === 0) {
        throw new Error("No valid data found in Excel sheet.");
      }

      // If Supabase is configured, try to save to DB
      if (isSupabaseConfigured) {
        const { data: maxBatchData, error: maxBatchError } = await supabase
          .from("projects")
          .select("batch_number")
          .order("batch_number", { ascending: false })
          .limit(1);

        if (maxBatchError) {
          if (isMissingBatchColumnError(maxBatchError)) {
            throw new Error(
              "Upload blocked: projects.batch_number is missing. Run backend/add_batch_columns.sql first."
            );
          }
          throw maxBatchError;
        }

        const nextBatch = (maxBatchData && maxBatchData.length > 0 ? (maxBatchData[0].batch_number ?? 0) : 0) + 1;

        // Insert chunks of 1000 to prevent oversized payloads if Excel is huge
        const CHUNK_SIZE = 1000;

        const newProjectsWithBatch = newProjects.map((project) => ({
          ...project,
          batch_number: nextBatch,
        }));

        for (let i = 0; i < newProjectsWithBatch.length; i += CHUNK_SIZE) {
          const chunk = newProjectsWithBatch.slice(i, i + CHUNK_SIZE);
          const { error: insertError } = await supabase.from("projects").insert(chunk);
          if (insertError) {
            throw new Error(`Failed to save to database. Note: You need to run the updated SQL script to create the 55-column 'projects' table first! Details: ${insertError.message}`);
          }
        }
        setSuccess(`Successfully imported and saved ${newProjects.length} projects in batch ${nextBatch} using ${file.name}!`);

        void authenticatedFetch("/api/audit-log", {
          method: "POST",
          body: JSON.stringify({
            type: "upload",
            action: "created",
            targetType: "projects_batch",
            targetLabel: `Projects batch ${nextBatch}`,
            metadata: {
              datasetId: "projects",
              batchNumber: nextBatch,
              fileName: file.name,
              rowCount: newProjects.length,
              warnings: [],
            },
          }),
        });

        await loadProjects();
      } else {
        // Just show them locally if no supabase
        if (!isSupabaseConfigured) {
          setProjects(newProjects as Project[]);
          setSuccess(`Loaded from Excel locally using ${file.name} (Supabase not connected).`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse Excel file.");
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleExport = async () => {
    if (!isSupabaseConfigured || loading) return;
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const { data: maxBatchData } = await supabase
        .from("projects")
        .select("batch_number")
        .order("batch_number", { ascending: false })
        .limit(1);
        
      const maxBatch = maxBatchData && maxBatchData.length > 0 ? (maxBatchData[0].batch_number ?? 0) : 0;
      if (maxBatch === 0) {
        setError("No data found to export.");
        setLoading(false);
        return;
      }

      let query = supabase.from("projects").select("*").eq("batch_number", maxBatch);

      if (searchQuery.trim()) {
        const q = searchQuery.trim().replace(/,/g, " ");
        query = query.or(`project_id.ilike.%${q}%,customer.ilike.%${q}%,project_name.ilike.%${q}%,project_manager.ilike.%${q}%,account_manager.ilike.%${q}%`);
      }

      if (categoryFilter !== "all") {
        if (categoryFilter === "UNCLASSIFIED") query = query.or("category.eq.UNCLASSIFIED,category.is.null,category.eq.");
        else query = query.eq("category", categoryFilter);
      }

      const { data, error: exportError } = await query.order("project_id", { ascending: true });
      if (exportError) throw exportError;

      if (!data || data.length === 0) {
        setError("No matching data found to export.");
        setLoading(false);
        return;
      }

      const exportData = data.map(p => ({
        'PROJECT_ID': p.project_id,
        'CUSTOMER': p.customer,
        'PROJECT_NAME': p.project_name,
        'PROJECT_MANAGER': p.project_manager,
        'ACCOUNT_MANAGER': p.account_manager,
        'PCS_STATUS': p.pcs_status,
        'PROJECT_CATEGORY': p.project_category,
        'SCHEDULE_HEALTH': p.schedule_health,
        'FINANCIAL_HEALTH': p.financial_health,
        'TOTAL_SALES': p.total_sales,
        'GROSS_PROFIT': p.gross_profit,
        'PERCENTAGE_PROGRESS': p.percentage_progress,
        'CATEGORY': p.category,
        'CATEGORY_NOTE': p.category_note
      }));

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Projects");
      XLSX.writeFile(wb, `Projects_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      setSuccess(`Successfully exported ${data.length} projects!`);
    } catch (err: unknown) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof Project) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(totalProjectsCount / pageSize);

  const renderSortableHeader = (label: React.ReactNode, key: keyof Project, title?: string, align: "left" | "center" = "left", className?: string) => {
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
          <h1 className="text-2xl font-semibold tracking-tight">List of Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage all projects and import data from Excel.
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
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
              />
            </label>
          </Button>
          <Button 
            variant="default" 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={handleExport}
            disabled={loading || totalProjectsCount === 0}
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>
              {error && <span className="text-destructive font-medium block mt-1">{error}</span>}
              {success && <span className="text-green-600 dark:text-green-400 font-medium block mt-1">{success}</span>}
              {totalProjectsCount > 0 && <span className="block mt-1">Showing {projects.length} of {totalProjectsCount} projects</span>}
            </CardDescription>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full sm:w-auto">
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
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="pl-8 h-9"
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
                  {renderSortableHeader("Project Name", "project_name", undefined, "left", "min-w-[400px]")}
                  {renderSortableHeader("Customer", "customer", undefined, "left", "min-w-[250px]")}
                  {renderSortableHeader("Project Manager", "project_manager", undefined, "left", "min-w-[120px] whitespace-nowrap")}
                  {renderSortableHeader("Progress", "percentage_progress")}
                  {renderSortableHeader("Category", "category", undefined, "center")}
                  {renderSortableHeader("Time", "pqi_time", "PQI TIME", "center")}
                  {renderSortableHeader("Cost", "pqi_cost", "PQI COST", "center")}
                </tr>
              </thead>
              <tbody>
                {loading && projects.length === 0 ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-4 pr-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : projects.length === 0 ? (
                  <tr>
                    <td className="py-24 text-center text-muted-foreground" colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-muted p-4">
                          <Inbox className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">No projects found</p>
                          <p className="text-xs">Upload a project report to get started.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : totalProjectsCount === 0 ? (
                  <tr>
                    <td className="py-24 text-center text-muted-foreground" colSpan={8}>
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
                  projects.map((project, idx) => {
                    const progress = parseNumeric(project.percentage_progress) ?? 0;
                    const pqiTime = parseNumeric(project.pqi_time);
                    const pqiCost = parseNumeric(project.pqi_cost);
                    return (
                      <tr key={project.id || idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors whitespace-nowrap">
                        <td className="py-2 pr-3 font-medium">{project.project_id || "-"}</td>
                        <td className="py-2 pr-3 font-medium max-w-[400px] truncate" title={project.project_name || ""}>{project.project_name || "-"}</td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[250px] truncate" title={project.customer || ""}>{project.customer || "-"}</td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[120px] truncate" title={project.project_manager || ""}>{project.project_manager || "-"}</td>
                        <td className="py-2 pr-3">
                          <span className="font-medium text-muted-foreground">{Number(progress.toFixed(2))}%</span>
                        </td>
                        <td className="py-2 text-center">
                          <div className="flex justify-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
                              project.category === "FCC" && "bg-blue-100 text-blue-700 border-blue-200",
                              project.category === "CSS" && "bg-purple-100 text-purple-700 border-purple-200",
                              project.category === "UNCLASSIFIED" && "bg-slate-100 text-slate-700 border-slate-200"
                            )} title={project.category_note || ""}>
                              {project.category || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          {pqiTime != null ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center cursor-pointer">
                                  <div className={cn("h-4 w-4 rounded-full", getPqiTimeConfig(pqiTime).color)} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span className="font-semibold">{Number(pqiTime.toFixed(2))}%</span>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2 text-center">
                          {pqiCost != null ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center cursor-pointer">
                                  <div className={cn("h-4 w-4 rounded-full", getPqiTimeConfig(pqiCost).color)} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span className="font-semibold">{Number(pqiCost.toFixed(2))}%</span>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalProjectsCount > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex w-[100px] items-center justify-center text-sm font-medium text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <span className="sr-only">Go to last page</span>
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
