# PMO Application: Current State Handoff

## 1. What This App Is
The **PMO App** is a project management dashboard for PT Q2 Technologies. It tracks projects, prospects, and backlog/target data from Excel uploads and presents the latest operational and financial status in a Next.js UI backed by Supabase/PostgreSQL.

### Tech Stack
- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn/UI
- **Charts:** Recharts
- **Database:** Supabase (PostgreSQL)
- **Ingestion:** Excel parsing with `xlsx`

## 2. Current App Status
The app is now in a better performance state than the original version.

- The main dashboard summary is no longer computed entirely in the browser. It now prefers the SQL RPC `get_dashboard_summary()` and only falls back to client-side aggregation if the RPC fails.
- The Projects, Prospects, and Backlog pages were moved away from large client-side scan/filter/sort loops and now use server-side paging, filtering, and counts.
- The batch mismatch that caused `column prospects.batch_number does not exist` has been fixed by adding the missing schema fields and aligning the upload/query path.
- Login/session handling is now centralized in a shared Supabase auth provider, so the app keeps session state consistent across the login page, dashboard layout, and route redirects.
- The classification logic for FCC/CSS is centralized and updated with the requested keyword additions.
- Workbook files are no longer meant to stay tracked in the repo. A root `.gitignore` now ignores `*.xlsx`, and the stray workbook binaries were removed from the workspace.

## 3. Main Functional Areas
### Dashboard
The dashboard page now reads aggregated values from `backend/dashboard_summary.sql` through a Supabase RPC.

What it returns:
- total project count
- average progress
- average PQI time and PQI cost
- schedule and financial health distributions
- progress distribution
- project manager and category breakdowns
- budget chart data
- AM achievement data
- total gross profit

Important detail:
- The SQL summary only uses the latest batch for projects and project targets, so the UI always shows current uploaded data rather than mixing historical batches.

Session detail:
- The dashboard layout now uses the shared auth session provider to check the logged-in user and redirect unauthenticated visitors back to the root login page.

### Projects
Projects now use server-side query logic for list rendering instead of pulling everything into the client and filtering there.

The page still handles:
- upload/import
- latest-batch selection
- search and filtering
- sorting and paging
- classification display

### Prospects
Prospects follow the same server-side filtering model as Projects.

The earlier schema issue was addressed by adding `batch_number` and `upload_date` to the prospects table and supporting indexes.

### Backlog
Backlog/project targets also use server-side filtering and paging now. It keeps its existing OPR/DEL classification behavior and preserves subtotal logic for the visible filtered set.

## 4. Classification Logic
The shared classification engine was updated so both Projects and Prospects classify more accurately.

### Existing behavior
The logic still uses a priority order of strict overrides, column-based signals, then keyword matching.

### Updated keywords
CSS now includes the requested terms:
- HCL
- Bussan Auto Finance
- VA
- VA Bulk
- Project Manager BaU
- Privileged Access Management

FCC now includes the requested terms:
- Gowap
- IFMX
- Garuda

### Matching caution
`VA` was treated carefully so it does not match too broadly and create false positives.

## 5. Schema And Database Changes
These database updates were part of the fix and performance work:

- `prospects` now has `batch_number` and `upload_date`.
- `projects`, `prospects`, and `project_targets` have batch/recency indexes for faster latest-batch lookups.
- `backend/add_batch_columns.sql` was extended so the prospects table is included.
- `backend/dashboard_summary.sql` defines `public.get_dashboard_summary()` for the dashboard RPC.

## 6. Files That Matter Most
- [backend/dashboard_summary.sql](/Users/fihsar/pmo-app/backend/dashboard_summary.sql)
- [backend/add_batch_columns.sql](/Users/fihsar/pmo-app/backend/add_batch_columns.sql)
- [backend/projects_schema.sql](/Users/fihsar/pmo-app/backend/projects_schema.sql)
- [backend/prospects_schema.sql](/Users/fihsar/pmo-app/backend/prospects_schema.sql)
- [backend/project_targets_schema.sql](/Users/fihsar/pmo-app/backend/project_targets_schema.sql)
- [frontend/components/auth-session-provider.tsx](/Users/fihsar/pmo-app/frontend/components/auth-session-provider.tsx)
- [frontend/app/dashboard/page.tsx](/Users/fihsar/pmo-app/frontend/app/dashboard/page.tsx)
- [frontend/app/dashboard/projects/page.tsx](/Users/fihsar/pmo-app/frontend/app/dashboard/projects/page.tsx)
- [frontend/app/dashboard/prospects/page.tsx](/Users/fihsar/pmo-app/frontend/app/dashboard/prospects/page.tsx)
- [frontend/app/dashboard/backlog/page.tsx](/Users/fihsar/pmo-app/frontend/app/dashboard/backlog/page.tsx)
- [frontend/lib/classification.ts](/Users/fihsar/pmo-app/frontend/lib/classification.ts)

## 7. Repo Hygiene
- Workbook artifacts should not be committed.
- The workspace `.gitignore` now ignores `*.xlsx`.
- The previous workbook binaries were removed from the workspace to keep the repo clean.
- `frontend` was previously stored as a gitlink entry, which made GitHub show it as a pointer instead of normal folder contents; it is now being tracked as regular files in the root repo.

## 8. Remaining Follow-Ups
- Add or strengthen tests around the dashboard RPC mapping and the upload header validation paths.
- Consider whether the dashboard fallback path is still needed long-term, or whether the RPC should become the single source of truth.
- If more Excel template files appear during work, keep them ignored or out of the repo.
- Session lifetime is controlled in the Supabase dashboard, not in the app code; check Auth settings for time-boxed sessions, inactivity timeout, single-session limits, and JWT expiration.
- Vercel deployment should target the `frontend` app root; if you later split backend logic into its own deployed service, create a separate Vercel project for that service instead of trying to run both from one Next.js deployment.

## 9. Guidance For Future Agents
- After every code or schema change, update this handoff with what changed and the next step before moving on.
- Keep the Vercel config aligned with the frontend app root, and use separate Vercel projects for any additional services.
- Keep the shared auth session provider in sync with any future login or logout flow changes.
- Keep dashboard aggregation in SQL where possible; avoid reintroducing large client-side reductions.
- Preserve the latest-batch model across list pages and summary logic.
- When changing FCC/CSS classification, update the shared classification source and verify both Projects and Prospects still agree.
- Prefer narrow, server-side queries for large tables instead of loading full datasets into the client.
