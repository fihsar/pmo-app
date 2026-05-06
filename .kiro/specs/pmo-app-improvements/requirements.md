# Requirements Document

## Introduction

This document specifies requirements for addressing known gaps and pending work in the PMO Application, a project management dashboard for PT Q2 Technologies. The improvements target nine items identified in `project_analysis.md` Section 10 ("Known Gaps and Pending Work") and are grouped into five categories: Security Hardening, Type Safety, Observability, Code Cleanup, and UX Fixes.

This spec does NOT introduce new product features. Each requirement closes a specific gap in the existing application without changing user-facing functionality beyond what is explicitly stated (e.g., the "Forgot?" button and the "not configured" UI state).

## Glossary

- **PMO_App**: The project management dashboard application for PT Q2 Technologies.
- **Supabase**: The backend platform providing PostgreSQL, authentication, and the type generator CLI.
- **RPC**: A PostgreSQL function exposed by Supabase over PostgREST.
- **RLS**: PostgreSQL Row Level Security; policy-based authorization enforced inside the database.
- **AM**: Account Manager; sales personnel whose canonical roster is `am_master`.
- **PM**: Project Manager; project personnel whose canonical roster is `pm_master`.
- **am_master**: Database table that is the single source of truth for the active AM roster.
- **pm_master**: Database table that is the single source of truth for the active PM roster.
- **Prospects_Subtotals_RPC**: The `get_prospects_subtotals` PostgreSQL function that returns financial sums for the Prospects page.
- **Sales_Performance_RPC**: The `get_sales_performance_summary` PostgreSQL function, used as the reference pattern for server-side AM scoping.
- **Project_Targets_Table**: The `project_targets` PostgreSQL table holding backlog and payment target rows.
- **Project_Targets_Update_Policy**: The RLS UPDATE policy attached to `project_targets`.
- **get_my_role**: The `STABLE SECURITY DEFINER` helper function that returns the caller's role for use in RLS policies.
- **Admin_Role**: A role in `{Superadmin, PA}` (the roles permitted to modify financial fields on `project_targets`).
- **Non_Admin_Role**: Any authenticated role not in `Admin_Role` (e.g., `Member`, `PM`, `AM`).
- **Database_Types_File**: `frontend/lib/database.types.ts`, the generated TypeScript declarations of the Supabase schema.
- **Type_Generator**: The `supabase gen types typescript` CLI command.
- **Dashboard_Page**: The Next.js page at `frontend/app/dashboard/page.tsx`.
- **Dashboard_Summary_RPC**: The `get_dashboard_summary` PostgreSQL function called by `Dashboard_Page`.
- **Latency_Logger**: The shared client-side helper used by Projects, Prospects, Backlog, and Sales Performance pages to emit `Query latency` log lines.
- **Local_JSON_Store**: The legacy file `frontend/lib/local-json-store.server.ts`.
- **Legacy_Data_Files**: JSON files under `frontend/data/` previously used by `Local_JSON_Store`.
- **Default_Business_Rules**: The `defaultBusinessRules` object exported from `frontend/lib/business-rules.shared.ts`.
- **Business_Rules_Resolver**: The shared code path that loads business rules from Supabase and falls back to `Default_Business_Rules`.
- **Loose_SQL_Files**: SQL patch files at the root of `backend/` that are not under `backend/migrations/`, specifically: `add_batch_columns.sql`, `add_category_columns.sql`, `add_classification_columns.sql`, `backlog_subtotals_rpc.sql`, `batch_metadata.sql`, `dashboard_summary.sql`, `fix_backlog_status.sql`, `project_targets_schema.sql`, `projects_schema.sql`, `prospects_performance_indices.sql`, `prospects_schema.sql`, `prospects_subtotals_rpc.sql`, `resync_metadata.sql`, `sales_performance_rpc.sql`, `truncate_all_data.sql`.
- **Migrations_Directory**: `backend/migrations/`, the canonical, ordered location of database migrations.
- **Login_Page**: The Next.js page that renders the login form, including the "Forgot?" button.
- **Forgot_Password_Handler**: The click handler attached to the "Forgot?" button on `Login_Page`.
- **Auth_Service**: The Supabase authentication client (`supabase.auth`).
- **Upload_Handler**: Any client-side upload handler that posts an audit event after a successful upload (Projects upload, Prospects upload, Backlog/Project Targets upload).
- **Audit_Log_Endpoint**: `POST /api/audit-log`, the server route that persists audit events.

## Requirements

---

## Category A: Security Hardening

### Requirement 1: Server-Side AM Scoping in Prospects Subtotals RPC

**User Story:** As a security engineer, I want `Prospects_Subtotals_RPC` to derive its allowed AM list from `am_master` internally, so that callers cannot widen the AM scope by passing a crafted parameter.

#### Acceptance Criteria

1. THE Prospects_Subtotals_RPC SHALL determine the allowed AM list by selecting `name` from `am_master` where `is_active` is `true`.
2. THE Prospects_Subtotals_RPC SHALL NOT declare a parameter that accepts a client-provided AM list.
3. WHEN Prospects_Subtotals_RPC is invoked, THE Prospects_Subtotals_RPC SHALL include only rows whose `am_name` is present in the active `am_master` set.
4. THE Prospects_Subtotals_RPC SHALL apply the same server-side AM-scoping pattern that `Sales_Performance_RPC` uses.
5. WHEN Prospects_Subtotals_RPC is invoked with the same non-AM filter parameters before and after this change, THE Prospects_Subtotals_RPC SHALL return numerically identical totals provided the active `am_master` roster matches the previously supplied client list.

### Requirement 2: Column-Scoped UPDATE Policy on Project Targets

**User Story:** As a security engineer, I want `Project_Targets_Update_Policy` to allow `Non_Admin_Role` users to write only the `status` column, so that financial fields cannot be modified outside `Admin_Role`.

#### Acceptance Criteria

1. WHEN a user whose role returned by `get_my_role` is in `Admin_Role` issues an UPDATE against `Project_Targets_Table`, THE Project_Targets_Update_Policy SHALL permit the UPDATE for any subset of columns.
2. WHEN a user whose role returned by `get_my_role` is in `Non_Admin_Role` issues an UPDATE against `Project_Targets_Table` that modifies only the `status` column, THE Project_Targets_Update_Policy SHALL permit the UPDATE.
3. IF a user whose role returned by `get_my_role` is in `Non_Admin_Role` issues an UPDATE against `Project_Targets_Table` that modifies any column other than `status`, THEN THE Project_Targets_Update_Policy SHALL reject the UPDATE.
4. THE Project_Targets_Update_Policy SHALL evaluate the caller's role using `get_my_role` rather than checking JWT claims directly.
5. THE Project_Targets_Update_Policy SHALL preserve existing SELECT, INSERT, and DELETE policies on `Project_Targets_Table` without modification.

---

## Category B: Type Safety

### Requirement 3: Regenerate Database Types From Current Schema

**User Story:** As a frontend developer, I want `Database_Types_File` to include every table currently in the Supabase schema, so that server code can be typed without casting the admin client to `any`.

#### Acceptance Criteria

1. WHEN `Type_Generator` is run against the current Supabase schema, THE Database_Types_File SHALL contain a type definition for the `audit_log` table.
2. WHEN Type_Generator is run against the current Supabase schema, THE Database_Types_File SHALL contain a type definition for the `business_rules` table.
3. WHEN Type_Generator is run against the current Supabase schema, THE Database_Types_File SHALL contain a type definition for the `am_master` table.
4. WHEN Type_Generator is run against the current Supabase schema, THE Database_Types_File SHALL contain a type definition for the `pm_master` table.
5. WHEN Type_Generator is run against the current Supabase schema, THE Database_Types_File SHALL contain a type definition for the `category_targets` table.
6. THE Database_Types_File SHALL be written to `frontend/lib/database.types.ts`.
7. WHEN Database_Types_File is regenerated, THE PMO_App SHALL compile under `tsc --noEmit` without errors and without `as any` casts on the Supabase admin client for the tables listed in criteria 1–5.

---

## Category C: Observability

### Requirement 4: Latency Logging on Dashboard Summary Calls

**User Story:** As a performance engineer, I want every `Dashboard_Summary_RPC` call to emit a latency log line in the same format as other pages, so that I can detect Dashboard performance regressions in the same way I detect them elsewhere.

#### Acceptance Criteria

1. WHEN Dashboard_Page invokes Dashboard_Summary_RPC, THE Dashboard_Page SHALL record a monotonic start timestamp before the call.
2. WHEN Dashboard_Summary_RPC returns a response, THE Dashboard_Page SHALL compute the elapsed duration in milliseconds and emit one log line via Latency_Logger.
3. THE Dashboard_Page SHALL format the latency log line using the same template that Projects, Prospects, Backlog, and Sales Performance pages use today.
4. IF Dashboard_Summary_RPC returns an error, THEN THE Dashboard_Page SHALL still emit one latency log line covering the duration until the error was received.
5. THE Dashboard_Page SHALL emit exactly one latency log line per Dashboard_Summary_RPC invocation.

---

## Category D: Code Cleanup

### Requirement 5: Remove Dead Local JSON Store and Data Files

**User Story:** As a maintainer, I want `Local_JSON_Store` and `Legacy_Data_Files` removed from the repository, so that contributors are not misled by code paths that no longer execute.

#### Acceptance Criteria

1. THE PMO_App SHALL NOT contain the file `frontend/lib/local-json-store.server.ts`.
2. THE PMO_App SHALL NOT contain any `.json` data files under `frontend/data/`.
3. THE PMO_App SHALL NOT import `Local_JSON_Store` from any source file.
4. THE PMO_App SHALL NOT reference `frontend/data/` paths from any source file.
5. WHEN Local_JSON_Store and Legacy_Data_Files are removed, THE PMO_App SHALL compile under `tsc --noEmit` without errors and `npm run build` SHALL succeed.

### Requirement 6: Empty Defaults and "Not Configured" UI State for Business Rules

**User Story:** As a Superadmin, I want the application to surface a clear "not configured" state when business rules are missing, so that I can recognize misconfiguration instead of silently operating on stale hardcoded data.

#### Acceptance Criteria

1. THE Default_Business_Rules SHALL define `allowedAMs`, `kpiPMs`, `fccKeywords`, and `cssKeywords` as empty arrays.
2. THE Default_Business_Rules SHALL retain its existing default `gpTarget` numeric value to preserve backward compatibility for the GP KPI.
3. WHEN the `business_rules` table contains no row with `id = 1`, THE Business_Rules_Resolver SHALL resolve `allowedAMs`, `kpiPMs`, `fccKeywords`, and `cssKeywords` to empty arrays.
4. IF the business rules fetch fails for any reason, THEN THE Business_Rules_Resolver SHALL resolve `allowedAMs`, `kpiPMs`, `fccKeywords`, and `cssKeywords` to empty arrays.
5. WHEN any of `allowedAMs`, `kpiPMs`, `fccKeywords`, or `cssKeywords` is empty at render time, THE PMO_App SHALL display a "Business rules not configured" indicator on pages that consume that field.
6. WHERE the current user has the Superadmin role and any business rules field is empty, THE PMO_App SHALL render a link from the "not configured" indicator to the Business Rules administration page.

### Requirement 7: Archive Loose SQL Patch Files

**User Story:** As a database administrator, I want every committed SQL change to live under `Migrations_Directory`, so that the deployed database state is unambiguous.

#### Acceptance Criteria

1. THE PMO_App SHALL NOT contain any of the Loose_SQL_Files at the root of `backend/`.
2. THE PMO_App SHALL keep all committed SQL DDL and DML under `Migrations_Directory`.
3. IF a Loose_SQL_File contains DDL or DML not represented by an existing migration, THEN THE PMO_App SHALL preserve that DDL or DML by adding a new file under `Migrations_Directory` before the Loose_SQL_File is removed.
4. WHEN Loose_SQL_Files are removed, THE PMO_App SHALL retain `backend/go.mod`, `backend/go.sum`, and the `backend/cmd/` tree unchanged.

---

## Category E: UX Fixes

### Requirement 8: Functional "Forgot?" Button on Login Page

**User Story:** As a user, I want the "Forgot?" button on the Login_Page to send me a password reset email, so that I can regain access without contacting an administrator.

#### Acceptance Criteria

1. THE Login_Page SHALL attach Forgot_Password_Handler as the click handler of the "Forgot?" button.
2. WHEN the user clicks the "Forgot?" button while the email field contains a syntactically valid email address, THE Forgot_Password_Handler SHALL invoke `Auth_Service.resetPasswordForEmail` with that email address.
3. IF the user clicks the "Forgot?" button while the email field is empty or syntactically invalid, THEN THE Login_Page SHALL display an inline validation message and SHALL NOT invoke `Auth_Service.resetPasswordForEmail`.
4. WHEN `Auth_Service.resetPasswordForEmail` resolves successfully, THE Login_Page SHALL display a confirmation message indicating that a reset email has been sent if the address is registered.
5. IF `Auth_Service.resetPasswordForEmail` rejects with an error, THEN THE Login_Page SHALL display a non-leaking error message that does not disclose whether the email is registered.
6. THE Login_Page SHALL disable the "Forgot?" button while a reset request is in flight and re-enable the button after the request settles.

### Requirement 9: Surface Audit Logging Failures From Upload Handlers

**User Story:** As an operator, I want every Upload_Handler to log audit-event failures to the browser console, so that I can detect and triage audit pipeline issues from collected logs.

#### Acceptance Criteria

1. WHEN an Upload_Handler posts to Audit_Log_Endpoint and the request resolves with a non-2xx status, THE Upload_Handler SHALL emit one `console.error` entry that includes the event type and the response status.
2. WHEN an Upload_Handler posts to Audit_Log_Endpoint and the request rejects, THE Upload_Handler SHALL emit one `console.error` entry that includes the event type and the rejection reason.
3. THE Upload_Handler SHALL NOT abort or roll back the user-visible upload flow when audit logging fails.
4. THE Upload_Handler SHALL emit no `console.error` entry related to audit logging when the audit POST resolves with a 2xx status.
5. THE Upload_Handler SHALL apply criteria 1–4 uniformly across the Projects, Prospects, and Backlog upload code paths.
