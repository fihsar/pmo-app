# PMO Application: Current State

## 1. What This App Is
The **PMO App** is a project management dashboard for PT Q2 Technologies. It tracks projects, prospects, and backlog/target data from Excel uploads and presents the latest operational and financial status in a Next.js UI backed by Supabase/PostgreSQL.

### Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Recharts.
- **Backend (API/Tools):** Go 1.21+ (organized into `cmd/` binaries for ingestion and summary tools).
- **Database:** Supabase (PostgreSQL) with advanced SQL RPCs and triggers.
- **Security:** Supabase Auth + Granular Role-Based Access Control (RBAC).

---

## 2. Roadmap Status

### ✅ Completed
1. **Upload history and batch comparison** — Upload History and Trend Analytics pages are live, backed by `/api/portfolio-insights` and the audit log.
2. **Config-driven business rules** — Business Rules, Sales Targets, AM/PM master tables, and `category_targets` are all implemented and admin-configurable.
3. **Trend analytics and audit workflows** — Trend Analytics page and Activity (audit log) page are fully implemented.
4. **Security and RLS hardening** — Role-based RLS policies are in place (migration 005). Additional hardening completed:
   - ✅ **Migration 009**: `get_prospects_subtotals` now joins `am_master` internally instead of accepting client-provided AM lists.
   - ✅ **Migration 010**: `project_targets` UPDATE operations are column-scoped via trigger — non-admin roles can only modify the `status` column.

### 🔧 Partially Complete
5. **Schema and migration cleanup** — Migrations 000–010 are ordered and applied. Two items remain:
   - Loose SQL patch files in `backend/` (`add_batch_columns.sql`, etc.) still coexist alongside the migrations folder and should be archived.
   - `database.types.ts` is stale — does not include `audit_log`, `business_rules`, `am_master`, `pm_master`, or `category_targets`. Needs regeneration via `supabase gen types typescript`.

---

## 3. Core Architecture & Performance
The application is built around a high-performance "Zero-Row" architecture.

- **Zero-Row Dashboard (Primary Path):** The dashboard uses `get_dashboard_summary()` RPC for KPI and aggregation data. If RPC fails, the UI falls back to row-based project fetches for local computation.
- **Centralized Batch Metadata:** A `batch_metadata` table tracks the latest upload version for all data types, kept in sync via statement-level database triggers. Provides O(1) version lookups via `get_latest_batch()`.
- **Server-Side Aggregations:** Backlog and Prospects pages use dedicated RPCs (`get_backlog_subtotals`, `get_prospects_subtotals`) to compute global financial sums across the entire filtered dataset.
- **Search Debouncing:** A 500ms debounce is applied to all text searches.
- **Latency Monitoring (Partial):** Query latency logs are implemented on Projects, Prospects, Backlog, and Sales Performance pages. Dashboard page fetches do not currently log latency in the same pattern.

---

## 4. Security & Access Control
- **Role-Based Access Control (RBAC):** Granular access matrix in `frontend/app/dashboard/layout.tsx`.
    - **Member:** Restricted to the Project Dashboard only.
    - **PM/AM/Admin:** Access to Projects, Prospects, and Backlog.
    - **Superadmin:** Full access, including User Management, Business Rules, Sales Targets, and Activity.
- **Sidebar Integration:** The sidebar dynamically filters navigation items based on the user's assigned role.
- **RLS Policies (Migration 005):** Role-based RLS policies are in place on all core tables:
    - `projects`: SELECT open to all authenticated; INSERT/UPDATE restricted to Superadmin/PM/PA; DELETE restricted to Superadmin.
    - `project_targets`: SELECT open; INSERT restricted to Superadmin/PM/PA; UPDATE open to all authenticated via RLS policy, but column-scoped via `BEFORE UPDATE` trigger (non-admin roles can only modify `status`); DELETE restricted to Superadmin.
    - `prospects`: SELECT open; INSERT/UPDATE open to all authenticated; DELETE restricted to Superadmin/PA.
    - `profiles`: Users can read/update their own row; Superadmin can read/update all.
- **Column-Level Security (Migration 010):** `project_targets` uses a `BEFORE UPDATE` trigger (`enforce_project_targets_column_scope`) to restrict non-admin roles to status-only updates. The RLS policy remains `USING (true) WITH CHECK (true)` for UPDATE, but the trigger enforces column-level restrictions.
- **`get_my_role()` Helper:** A `STABLE SECURITY DEFINER` function caches the caller's role within a statement, used by all RLS policies and triggers.
- **RPC Hardening (Migrations 007, 009):**
  - `get_sales_performance_summary()` enforces the AM allowlist server-side via `am_master` join. No client-provided AM scope is accepted.
  - `get_prospects_subtotals()` now joins `am_master` internally (migration 009) — no longer accepts `p_allowed_ams` from the caller.
- **Server-Only Admin Routes:** User management, business rules, and audit log endpoints use `verifyAdmin()` / `getAuthenticatedContext()` with the service-role key. Sensitive operations do not rely on client-side navigation gating alone.

---

## 5. Backend Reorganization
The Go backend is structured to resolve "multiple main() entrypoints" conflicts:
- **`cmd/api`**: Main Go API entry point.
- **`cmd/setup-db`**: Database initialization and schema sync.
- **`cmd/dashboard-summary`**: Offline summary generation (if needed).
- **`cmd/prospects-schema`**: Specific schema management tool.

Standardized `go.mod` at the root ensures consistent dependency management.

---

## 6. Feature Breakdown

### Dashboard
- **GP Achievement:** KPI tracking against a configurable gross profit target (stored in `business_rules` table, default 36,000,000,000 IDR).
- **Sales Performance:** Server-aggregated AM achievement chart (Backlog GP vs. per-AM annual target from `am_master`).
- **Global Filters:** Automatically excludes 2025 invoice data from all financial totals.
- **Sales Performance Period Filter:** Period preset filter (`All Periods`, `Q1–Q4`, `1H`, `2H`) wired to backend date parameters.
- **Sales Performance Sorting:** AM Breakdown table sorts by highest `Achievement %` by default.

### Projects & Prospects
- **Server-Side Paging:** Handles thousands of rows with minimal memory footprint.
- **Trigram Search:** Prospects table uses `pg_trgm` indexes on `prospect_name` and `client_name`.
- **Ingestion-Time Classification:** Categories (FCC/CSS) are determined during upload and stored. UI can re-classify on the fly if keywords change.
- **Prospects Upload Guardrails:** Validates template headers, blocks mismatched templates, and canonicalizes `AM_NAME` against the allowed AM list. Unknown AMs are logged as warnings but do not block the upload.
- **Worker-Based XLSX Parsing:** Projects and Prospects uploads use a Web Worker (`parseXlsxInWorker`) to avoid blocking the main thread on large files.
- **Per-Row Zod Validation:** Both Projects and Prospects uploads run per-row schema validation and surface coercion warnings without blocking the upload.

### Backlog (Project Targets)
- **Status Persistence:** Manual tracking of "On Track", "At Risk", or "Delayed" statuses per row.
- **Financial Export:** Excel export respects all active search/date/category filters.
- **Upload Guardrails:** Validates required template headers and blocks mismatched templates before insert.

### Upload History & Trends
- **Upload History Page:** Shows each batch with upload time, row count, value/GP delta vs. previous batch, file name, and actor email (sourced from audit log).
- **Trend Analytics Page:** Line charts of row count, value, and gross profit across recent batches per dataset.

### Administration (Superadmin Only)
- **User Management:** Invite, edit, and remove users via Supabase Auth admin API. All actions are audit-logged.
- **Business Rules:** Configurable target GP, allowed AM list, KPI PM list, and FCC/CSS classification keywords. Stored in `business_rules` table.
- **Sales Targets:** Per-AM annual targets and category-level budgets, stored in `am_master.annual_target` and `category_targets`.
- **Activity Log:** Audit trail of user management, business rules, and upload events. Superadmin-only.

---

## 7. Schema & Database

### Core Tables
- **`projects`**: Project portfolio data, uploaded in batches.
- **`project_targets`**: Backlog/payment target data, uploaded in batches.
- **`prospects`**: Prospect pipeline data, uploaded in batches.
- **`profiles`**: User roles and status, managed via Supabase Auth.
- **`batch_metadata`**: Stores `latest_batch` per table for O(1) lookups.
- **`audit_log`**: Append-only event log for admin and upload actions.
- **`business_rules`**: Single-row config table (id=1) storing rules as JSONB.
- **`am_master`**: Account Manager list with `is_active` flag and `annual_target`.
- **`pm_master`**: Project Manager list with `is_active` flag, used for KPI filtering.
- **`category_targets`**: Company-wide category-level budget targets (CSS, FCC, UNCLASSIFIED).

### Triggers
- `tr_update_projects_batch` — statement-level, fires after INSERT on `projects`.
- `tr_update_targets_batch` — statement-level, fires after INSERT on `project_targets`.
- `tr_update_prospects_batch` — statement-level, fires after INSERT on `prospects`.
- `trg_project_targets_column_scope` — row-level BEFORE UPDATE trigger on `project_targets`, enforces column-scoped permissions (non-admin roles can only update `status`).

### RPCs
- `get_dashboard_summary()`: Unified KPI and Sales aggregation.
- `get_latest_batch(table_id)`: O(1) batch version lookup via `batch_metadata`.
- `get_backlog_subtotals(...)`: Server-side financial sums for Backlog with full filter support.
- `get_prospects_subtotals(p_batch_number, p_search_query, p_start_date, p_end_date, p_category_filter)`: Server-side financial sums for Prospects with full filter support. Joins `am_master` internally (no client-provided AM list).
- `get_sales_performance_summary(p_start_date, p_end_date)`: AM achievement vs. per-AM annual target. Joins `am_master` internally.
- `get_my_role()`: STABLE SECURITY DEFINER helper used by RLS policies and triggers.

### Performance Indices
- **B-Tree Indices**: On `batch_number`, `am_name`, `target_date`, and `category` for all core tables.
- **Composite Indices**:
    - `idx_project_targets_batch_target_category` on `(batch_number, target_date, category)` — optimizes `get_backlog_subtotals`.
    - `idx_prospects_batch_am_target` on `(batch_number, am_name, target_date)` — optimizes `get_prospects_subtotals`.
- **Trigram Indices**: On `prospect_name` and `client_name` for fast fuzzy searching.

---

## 8. Repo Hygiene & Quality
- **Effect Stabilization**: All `loadData` functions are wrapped in `useCallback` to prevent infinite re-render loops.
- **Binary Exclusion**: Workbook files (`.xlsx`) are strictly ignored via `.gitignore`.
- **Shared Parsing Utilities**: Excel parsing helpers (`parseDate`, `parseNumeric`, `parseText`, `formatDate`) are centralized in `frontend/lib/excel-utils.ts` and reused by Backlog and Prospects.
- **Deployment Safety**: `npm run build` passes cleanly.
- **Known Type Gap**: `audit_log` and `business_rules` tables are not yet in the generated `database.types.ts`. The server files that access them cast the admin client to `any` as a workaround. Regenerating types from Supabase will fix this.

---

## 9. Guidance For Future Agents
- **Metadata First**: Always use `get_latest_batch()` before querying data. Never use raw `.select("batch_number").order(...).limit(1)`.
- **RPC over Client**: If a calculation involves more than one page of data, move it to a SQL RPC.
- **Constants Location**: Keep static configuration (like AM lists or keyword patterns) **outside** component definitions to avoid re-render loops.
- **RBAC Matrix**: Any new page must be registered in the `Access Matrix` in `frontend/app/dashboard/layout.tsx`.
- **Latency Awareness**: Monitor the console logs for "Query latency" to detect performance regressions early.
- **Upload Validation First**: Validate template headers (and cross-template mismatch) before mapping/insert in all upload handlers.
- **Pagination Label Standard**: Use `Rows per page` consistently in all table pagers.
- **Audit Log**: All upload, user management, and business rules changes must fire an audit event via `POST /api/audit-log` or `appendAuditEvent()`.
- **am_master is the source of truth**: AM lists in RPCs join against `am_master`. Do not hardcode AM arrays in SQL or TypeScript.

---

## 10. Known Gaps and Pending Work
- **`database.types.ts` is stale**: Does not include `audit_log`, `business_rules`, `am_master`, `pm_master`, or `category_targets`. Regenerate with `supabase gen types typescript`.
- **Latency logging on Dashboard**: The `get_dashboard_summary()` RPC call does not log latency. Should follow the same pattern as other pages.
- **`local-json-store.server.ts`**: Dead code — business rules and audit log now use Supabase. The file and `frontend/data/*.json` can be removed.
- **`defaultBusinessRules` fallback**: `business-rules.shared.ts` still has full hardcoded AM/PM/keyword lists as defaults. If the DB is empty or the API fails, the app silently uses stale data. Defaults should be empty arrays with a clear "not configured" UI state.
- **"Forgot?" button on login page**: Renders but has no handler. Wire to `supabase.auth.resetPasswordForEmail()` or remove.
- **Upload audit events are fire-and-forget**: `void authenticatedFetch("/api/audit-log", ...)` in upload handlers silently swallows failures. Should at minimum log errors to console.
- **Loose SQL patch files in `backend/`**: `add_batch_columns.sql`, `add_category_columns.sql`, etc. coexist alongside the `migrations/` folder. Should be archived or deleted to avoid confusion about what's deployed.
