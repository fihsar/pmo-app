"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { determineCategory } from "@/lib/classification";

type Prospect = {
  id?: string;
  id_top_sales: number | null;
  am_name: string | null;
  company_name: string | null;
  directorat: string | null;
  group_name: string | null;
  id_project: string | null;
  id_prospect_status: number | null;
  prospect_name: string | null;
  client_name: string | null;
  status: string | null;
  term_of_payment: string | null;
  amount: number | null;
  gp: number | null;
  amount_cl: number | null;
  gp_cl: number | null;
  est_prospect_close_date: string | null;
  target_date: string | null;
  confidence_level: number | null;
  osv_non_osl: number | null;
  opr_del: number | null;
  batch_number?: number;
  upload_date?: string;
  category?: string | null;
  category_note?: string | null;
};

// Helpers for robust parsing
const parseDate = (value: any): string | null => {
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

const parseNumeric = (value: any): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
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

const isMissingBatchColumnError = (error: any): boolean => {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes("batch_number") && msg.includes("does not exist");
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [totalProspectsCount, setTotalProspectsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [presetRange, setPresetRange] = useState("custom");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Prospect; direction: "asc" | "desc" } | null>({ key: "target_date", direction: "asc" });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const allowedAMs = [
    "Andrew Daniel Gunalan",
    "Elsa Yolanda Simanjuntak",
    "Graeta Venato",
    "Lizty Latifah",
    "M. Satria Manggala Yudha",
    "Merlin",
    "Pandu R Akbar"
  ];

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

  const loadProspects = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);

    const { data: maxBatchData, error: maxBatchError } = await supabase
      .from("prospects")
      .select("batch_number")
      .order("batch_number", { ascending: false })
      .limit(1);

    if (maxBatchError) {
      if (isMissingBatchColumnError(maxBatchError)) {
        setError("Prospects table is missing batch_number. Run backend/add_batch_columns.sql to enable safe batch mode.");
      } else {
        console.error("Failed to fetch max batch_number:", maxBatchError.message);
        setError(`Failed to load prospects: ${maxBatchError.message}`);
      }
      setProspects([]);
      setLoading(false);
      return;
    }

    const maxBatch = maxBatchData && maxBatchData.length > 0 ? maxBatchData[0].batch_number : 0;

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
        query = query.eq("category", categoryFilter);
      }

      if (startDate) {
        query = query.gte("target_date", startDate);
      }

      if (endDate) {
        query = query.lte("target_date", endDate);
      }

      if (searchQuery.trim()) {
        const q = escapeSearch(searchQuery);
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
        setProspects((pageData || []).map((prospect) => ({ ...prospect, amount: parseNumeric(prospect.amount), gp: parseNumeric(prospect.gp) } as Prospect)));
        setTotalProspectsCount(count || 0);
      }
    } else {
      setProspects([]);
      setTotalProspectsCount(0);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    void loadProspects();
  }, [searchQuery, startDate, endDate, categoryFilter, sortConfig, currentPage, pageSize]);

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
      
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as any[];
      
      const newProspects: Prospect[] = json.map((row) => {
        const categoryResult = determineCategory(row as Record<string, unknown>);
        return {
        id_top_sales: parseNumeric(row["ID_TOP_SALES"]),
        am_name: row["AM_NAME"] || null,
        company_name: row["COMPANY_NAME"] || null,
        directorat: row["DIRECTORAT"] || null,
        group_name: row["GROUP_NAME"] || null,
        id_project: row["ID_PROJECT"] || null,
        id_prospect_status: parseNumeric(row["ID_PROSPECT_STATUS"]),
        prospect_name: row["PROSPECT_NAME"] || null,
        client_name: row["CLIENT_NAME"] || null,
        status: row["STATUS"] || null,
        term_of_payment: row["TERM_OF_PAYMENT"] || null,
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
        setSuccess("Loaded from Excel (Local State Only - Supabase not connected).");
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

      setSuccess(`Successfully uploaded ${newProspects.length} prospects in batch ${nextBatch}!`);

      await loadProspects();
    } catch (err: any) {
      console.error(err);
      setError(`Failed to save to database. If needed, run backend/add_batch_columns.sql to add missing fields. Details: ${err.message}`);
    } finally {
      setLoading(false);
      e.target.value = '';
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

  const subtotalAmount = useMemo(() => {
    return prospects.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [prospects]);

  const subtotalGP = useMemo(() => {
    return prospects.reduce((acc, curr) => acc + (curr.gp || 0), 0);
  }, [prospects]);

  const renderSortableHeader = (label: React.ReactNode, key: keyof Prospect, title?: string) => {
    const isActive = sortConfig?.key === key;
    return (
      <th 
        className="py-2 pr-3 font-medium cursor-pointer hover:text-foreground select-none group" 
        onClick={() => handleSort(key)}
        title={title}
      >
        <div className="flex items-center gap-1">
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
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-600 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle>Prospects Database</CardTitle>
            <CardDescription>
              {totalProspectsCount} {totalProspectsCount === 1 ? 'prospect' : 'prospects'} found
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
                  <SelectItem value="custom">Custom</SelectItem>
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
                  {renderSortableHeader("Category", "category")}
                  {renderSortableHeader("Status", "status")}
                  {renderSortableHeader("Revenue", "amount")}
                  {renderSortableHeader("Gross Profit", "gp")}
                  {renderSortableHeader("Target Date", "target_date")}
                </tr>
              </thead>
              <tbody>
                {loading && prospects.length === 0 ? (
                  <tr>
                    <td className="py-6 text-muted-foreground text-center" colSpan={9}>Loading prospects...</td>
                  </tr>
                ) : prospects.length === 0 ? (
                  <tr>
                    <td className="py-12 text-center text-muted-foreground" colSpan={9}>
                      <p>No prospects found.</p>
                      <p className="text-xs mt-1">Upload a Report_Prospect_CL*.xlsx file to get started.</p>
                    </td>
                  </tr>
                ) : totalProspectsCount === 0 ? (
                  <tr>
                    <td className="py-12 text-center text-muted-foreground" colSpan={9}>
                      <p>No matching prospects found for &quot;{searchQuery}&quot;.</p>
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
                        <td className="py-2 pr-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
                            p.category === "FCC" && "bg-blue-100 text-blue-700 border-blue-200",
                            p.category === "CSS" && "bg-purple-100 text-purple-700 border-purple-200",
                            p.category === "UNCLASSIFIED" && "bg-slate-100 text-slate-700 border-slate-200"
                          )} title={p.category_note || ""}>
                            {p.category || "-"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
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
                      Rp {subtotalAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 pr-3">
                      Rp {subtotalGP.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
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
