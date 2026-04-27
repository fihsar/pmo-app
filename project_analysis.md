# PMO Application: Current State Handoff

## 1. What This App Is
The **PMO App** is a project management dashboard for PT Q2 Technologies. It tracks projects, prospects, and backlog/target data from Excel uploads and presents the latest operational and financial status in a Next.js UI backed by Supabase/PostgreSQL.

### Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Recharts.
- **Backend (API/Tools):** Go 1.21+ (organized into `cmd/` binaries for ingestion and summary tools).
- **Database:** Supabase (PostgreSQL) with advanced SQL RPCs and triggers.
- **Security:** Supabase Auth + Granular Role-Based Access Control (RBAC).

## 2. Core Architecture & Performance (April 2026 Update)
The application is primarily refactored toward a high-performance "Zero-Row" architecture.

- **Zero-Row Dashboard (Primary Path):** The dashboard uses `get_dashboard_summary()` RPC for KPI and aggregation data. If RPC fails, the UI falls back to row-based project fetches for local computation.
- **Centralized Batch Metadata:** To eliminate expensive `MAX(batch_number)` scans, a `batch_metadata` table tracks the latest upload version for all data types. This is kept in sync via database triggers, providing O(1) version lookups.
- **Server-Side Aggregations:** Both **Backlog** and **Prospects** pages now use dedicated RPCs (`get_backlog_subtotals`, `get_prospects_subtotals`) to compute global financial sums across the entire filtered dataset, rather than just the visible page.
- **Search Debouncing:** A 500ms debounce is applied to all text searches to protect the database from query floods during typing.
- **Latency Monitoring (Partial):** Query latency logs are implemented on major data-table pages (Projects, Prospects, Backlog, Sales Performance). Dashboard page fetches do not currently log latency in the same pattern.

## 3. Security & Access Control
- **Role-Based Access Control (RBAC):** Implemented a granular Access Matrix in `frontend/app/dashboard/layout.tsx`.
    - **Member:** Restricted to the Project Dashboard only.
    - **PM/AM/Admin:** Access to Projects, Prospects, and Backlog.
    - **Superadmin:** Full access, including User Management.
- **Sidebar Integration:** The sidebar dynamically filters navigation items based on the user's assigned role.
- **Current Data-Layer Status (Important):** Core table RLS policies are still broad for authenticated users (`USING (true)` patterns in schema SQL). Current RBAC behavior is strongest at UI/navigation and specific API-route checks (for example, user management endpoints), not full per-role row-level isolation across all datasets.

## 4. Backend Reorganization
The Go backend has been restructured to resolve "multiple main() entrypoints" conflicts:
- **`cmd/api`**: Main Go API entry point.
- **`cmd/setup-db`**: Database initialization and schema sync.
- **`cmd/dashboard-summary`**: Offline summary generation (if needed).
- **`cmd/prospects-schema`**: Specific schema management tool.
Standardized `go.mod` at the root ensures consistent dependency management.

## 5. Feature Breakdown
### Dashboard
- **GP Achievement:** KPI tracking against a 36,000,000,000 IDR target.
- **Sales Performance:** Server-aggregated AM achievement chart (Invoiced vs. Target).
- **Global Filters:** Automatically excludes 2025 invoice data from all financial totals to ensure reporting consistency.

### Projects & Prospects
- **Server-Side Paging:** Handles thousands of rows with minimal memory footprint.
- **Trigram Search:** Prospects table uses `pg_trgm` indexes on `prospect_name` and `client_name`. Global search also covers additional fields, but those are not all trigram-index accelerated.
- **Ingestion-Time Classification:** Categories (FCC/CSS) are determined during upload and stored, though the UI can still re-classify on the fly if keywords change.

### Backlog (Project Targets)
- **Status Persistence:** Allows manual tracking of "On Track", "At Risk", or "Delayed" statuses.
- **Financial Export:** Optimized Excel export that respects all active search/date/category filters.

## 6. Schema And Database Changes
- **`batch_metadata`**: Stores `latest_batch` per table.
- **Triggers**: `tr_update_projects_batch`, `tr_update_targets_batch`, `tr_update_prospects_batch`.
- **RPCs**:
    - `get_dashboard_summary()`: Unified KPI and Sales aggregation.
    - `get_latest_batch(table_id)`: Instant version lookup.
    - `get_backlog_subtotals()`: Server-side financial sums for Backlog.
    - `get_prospects_subtotals()`: Server-side financial sums for Prospects.

## 7. Performance Indices
- **B-Tree Indices**: On `batch_number`, `am_name`, `target_date`, and `category`.
- **Trigram Indices**: On `prospect_name` and `client_name` for fast fuzzy searching.

## 8. Repo Hygiene & Quality
- **Lint-Zero Status**: All TypeScript warnings, unused imports, and `any` types have been resolved.
- **Effect Stabilization**: All `loadData` functions are wrapped in `useCallback` to prevent infinite re-render loops.
- **Binary Exclusion**: Workbook files (`.xlsx`) are strictly ignored via `.gitignore`.

## 9. Guidance For Future Agents
- **Metadata First**: Always check `batch_metadata` or use `get_latest_batch()` before querying data.
- **RPC over Client**: If a calculation involves more than one page of data, move it to a SQL RPC.
- **Constants Location**: Keep static configuration (like AM lists or keyword patterns) **outside** component definitions to avoid re-render loops.
- **RBAC Matrix**: Any new page must be registered in the `Access Matrix` in `frontend/app/dashboard/layout.tsx`.
- **Latency Awareness**: Monitor the console logs for "Query latency" to detect performance regressions early.

## 10. Recommended Next Architecture (Scalable + Secure)
This section is a target recommendation, not a claim of current state.

- **Enforce RBAC at Data Layer**: Implement role-aware RLS policies on `projects`, `project_targets`, and `prospects` using role mappings from `profiles` (or equivalent source of truth), so direct client queries cannot bypass authorization.
- **Constrain SECURITY DEFINER RPCs**: For each RPC, explicitly validate caller context/role and AM scope before returning rows/aggregates.
- **Use Server-Only Data Access for Sensitive Paths**: Move sensitive reads/writes to server routes/actions with explicit authorization checks; avoid relying only on client-side navigation gating.
- **Keep O(1) Batch Discovery**: Continue using `batch_metadata` + `get_latest_batch()` as the canonical latest-batch lookup strategy.
- **Standardize Telemetry**: Add a shared data-fetch utility to capture latency and error metrics consistently across all pages (including Dashboard).
- **Performance by Default**: Prefer paginated fetch + RPC aggregate split for large datasets; avoid full-table client hydration in normal flows.
