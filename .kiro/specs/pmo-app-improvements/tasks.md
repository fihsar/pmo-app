# Implementation Plan: PMO App Improvements

## Overview

Nine targeted improvements across five categories: Security Hardening, Type Safety, Observability, Code Cleanup, and UX Fixes. Tasks are ordered so database migrations precede their frontend callers, and dead-code deletions follow any dependency checks. Each task references the specific requirements it satisfies.

---

## Tasks

- [ ] 1. Category A — Security Hardening

  - [x] 1.1 Write migration `backend/migrations/009_harden_prospects_subtotals.sql`
    - Drop the existing `get_prospects_subtotals(integer, text[], text, text, text, text)` overload
    - Re-create the function without the `p_allowed_ams` parameter, joining `am_master` internally on `lower(trim(am_name)) = lower(trim(name)) AND is_active = true`
    - Match the full filter logic (search, date range, category) from the current implementation
    - Use `SECURITY DEFINER SET search_path = public`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.2 Write property test for active AM scoping (Property 1)
    - **Property 1: Active AM scoping in Prospects Subtotals RPC**
    - Use `fc.array(fc.record({ name: fc.string(), is_active: fc.boolean() }))` to generate AM master sets
    - Verify the RPC sum equals the manual sum of rows whose `am_name` matches an active AM only
    - **Validates: Requirements 1.1, 1.3, 1.5**

  - [x] 1.3 Update Prospects page caller to drop `p_allowed_ams`
    - In `frontend/app/dashboard/prospects/page.tsx`, remove the `p_allowed_ams: allowedAMs` argument from the `supabase.rpc("get_prospects_subtotals", ...)` call
    - Remove any variable or import that was used solely to supply `p_allowed_ams`
    - _Requirements: 1.2_

  - [x] 1.4 Write migration `backend/migrations/010_project_targets_column_scoped_update.sql`
    - Create `enforce_project_targets_column_scope()` trigger function (`SECURITY DEFINER`, `LANGUAGE plpgsql`)
    - Inside the function: call `get_my_role()`; if role is in `{'Superadmin', 'Project Administrator'}` return NEW immediately; otherwise check every non-status column with `IS DISTINCT FROM` and raise `EXCEPTION` with `ERRCODE = '42501'` if any differ
    - Drop any pre-existing trigger `trg_project_targets_column_scope` before creating it
    - Create `BEFORE UPDATE FOR EACH ROW` trigger on `project_targets` executing the new function
    - Leave the existing `project_targets_update` RLS policy (`USING (true) WITH CHECK (true)`) unchanged
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 1.5 Write property test for column-scoped UPDATE enforcement (Property 2)
    - **Property 2: Non-admin roles cannot update non-status columns on project_targets**
    - Use `fc.constantFrom(...nonStatusColumns)` to generate column names
    - Verify the trigger rejects every non-status column modification for non-admin roles and permits status-only updates
    - **Validates: Requirements 2.3**

  - [x] 1.6 Checkpoint — Verify migrations apply cleanly
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 2. Category B — Type Safety

  - [x] 2.1 Regenerate `frontend/lib/database.types.ts`
    - Run `supabase gen types typescript --local > frontend/lib/database.types.ts` (or the project-specific equivalent command) against the current Supabase schema
    - Confirm the output file contains type definitions for `audit_log`, `business_rules`, `am_master`, `pm_master`, and `category_targets`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.2 Remove `as any` casts on the Supabase admin client
    - In `frontend/lib/business-rules.server.ts`, replace `getSupabaseAdmin() as any` with the typed `getSupabaseAdmin()` call and update `.from(...)` usages to use the generated types
    - In `frontend/lib/audit-log.server.ts`, apply the same removal
    - Search for any remaining `as any` casts on the admin client in other server files and remove them
    - _Requirements: 3.7_

  - [x] 2.3 Delete `frontend/lib/database.types.ts.tmp`
    - Remove the temporary file that was used as a workaround before type regeneration
    - _Requirements: 3.6_

  - [x] 2.4 Verify type safety
    - Run `tsc --noEmit` in `frontend/` and confirm zero errors
    - _Requirements: 3.7_

- [ ] 3. Category C — Observability

  - [x] 3.1 Add latency logging to `fetchDashboardSummary` in `frontend/app/dashboard/page.tsx`
    - Capture `const startTime = performance.now()` immediately before the `supabase.rpc("get_dashboard_summary")` call
    - Capture `const endTime = performance.now()` immediately after the call returns (whether success or error)
    - Emit `console.log(\`[Dashboard] Query latency: ${(endTime - startTime).toFixed(2)}ms\`)` after computing the duration
    - Ensure the log line is emitted in both the success and error branches (place it before any early return on error)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 3.2 Write property test for Dashboard latency logging (Property 8)
    - **Property 8: Dashboard latency is logged exactly once per RPC invocation**
    - Use `fc.oneof(fc.constant({ data: mockRow, error: null }), fc.constant({ data: null, error: new Error("rpc failed") }))` to generate RPC outcomes
    - Spy on `console.log`; verify exactly one call matching `[Dashboard] Query latency:` per invocation
    - **Validates: Requirements 4.2, 4.4, 4.5**

- [ ] 4. Category D — Code Cleanup (Dead Code Removal)

  - [x] 4.1 Verify no live imports of dead files
    - Search the codebase for any `import` or `require` referencing `local-json-store.server`, `audit-log.json`, or `business-rules.json`
    - Confirm zero results before deletion
    - _Requirements: 5.3, 5.4_

  - [x] 4.2 Delete dead files
    - Delete `frontend/lib/local-json-store.server.ts`
    - Delete `frontend/data/audit-log.json`
    - Delete `frontend/data/business-rules.json`
    - _Requirements: 5.1, 5.2_

  - [x] 4.3 Verify build passes after dead code removal
    - Run `npm run build` in `frontend/` and confirm it succeeds with no errors
    - _Requirements: 5.5_

- [ ] 5. Category D — Code Cleanup (Business Rules Defaults)

  - [x] 5.1 Update `defaultBusinessRules` in `frontend/lib/business-rules.shared.ts`
    - Change `allowedAccountManagers` to `[]`
    - Change `kpiProjectManagers` to `[]`
    - Change `keywordRules.strictFccKeywords` to `[]`
    - Change `keywordRules.strictCssKeywords` to `[]`
    - Change `keywordRules.fccKeywords` to `[]`
    - Change `keywordRules.cssKeywords` to `[]`
    - Preserve the existing `targetGrossProfit` numeric value unchanged
    - _Requirements: 6.1, 6.2_

  - [x] 5.2 Update `normalizeBusinessRules` to remove array fallbacks
    - Remove the `length > 0 ? ... : defaultBusinessRules.allowedAccountManagers` (and equivalent) fallback patterns for all array fields
    - After the change, `normalizeBusinessRules` should pass through whatever arrays the DB returns (including empty arrays) without substituting hardcoded defaults
    - _Requirements: 6.3, 6.4_

  - [ ]* 5.3 Write property test for Business Rules Resolver (Property 3)
    - **Property 3: Business Rules Resolver returns empty arrays when DB is empty or unavailable**
    - Use `fc.oneof(fc.constant(null), fc.constant({}), fc.record({ allowedAccountManagers: fc.constant([]) }))` to generate empty-ish inputs
    - Verify all array fields are `[]` in the output of `normalizeBusinessRules`
    - **Validates: Requirements 6.3, 6.4**

  - [x] 5.4 Create `frontend/components/business-rules-not-configured.tsx`
    - Implement `BusinessRulesNotConfigured` component accepting `isSuperadmin: boolean` and `missingFields: string[]` props
    - Return `null` when `missingFields.length === 0`
    - Render an amber-styled banner with an `AlertTriangle` icon listing the empty fields
    - When `isSuperadmin` is `true`, include a `<Link href="/dashboard/business-rules">Configure now →</Link>` inside the banner
    - _Requirements: 6.5, 6.6_

  - [ ]* 5.5 Write property test for "Not Configured" banner rendering (Property 4)
    - **Property 4: "Not configured" banner appears for any empty array field**
    - Use `fc.record({ allowedAccountManagers: fc.array(fc.string()), kpiProjectManagers: fc.array(fc.string()), fccKeywords: fc.array(fc.string()), cssKeywords: fc.array(fc.string()) })` to generate partial rule sets
    - Verify the banner renders if and only if any consumed field is empty
    - **Validates: Requirements 6.5, 6.6**

  - [x] 5.6 Add `BusinessRulesNotConfigured` banner to Prospects page
    - In `frontend/app/dashboard/prospects/page.tsx`, compute `missingFields` from the resolved business rules (check `allowedAMs` / `allowedAccountManagers`)
    - Render `<BusinessRulesNotConfigured isSuperadmin={...} missingFields={missingFields} />` near the top of the page content
    - _Requirements: 6.5, 6.6_

  - [x] 5.7 Add `BusinessRulesNotConfigured` banner to Dashboard page
    - In `frontend/app/dashboard/page.tsx`, compute `missingFields` from the resolved business rules (check fields consumed by the Dashboard, e.g., `kpiProjectManagers`)
    - Render `<BusinessRulesNotConfigured isSuperadmin={...} missingFields={missingFields} />` near the top of the page content
    - _Requirements: 6.5, 6.6_

  - [x] 5.8 Checkpoint — Verify build and types pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Category D — Code Cleanup (Archive Loose SQL Files)

  - [ ] 6.1 Audit loose SQL files against migrations 000–008
    - For each of the 15 loose files listed in the requirements (`add_batch_columns.sql`, `add_category_columns.sql`, `add_classification_columns.sql`, `backlog_subtotals_rpc.sql`, `batch_metadata.sql`, `dashboard_summary.sql`, `fix_backlog_status.sql`, `project_targets_schema.sql`, `projects_schema.sql`, `prospects_performance_indices.sql`, `prospects_schema.sql`, `prospects_subtotals_rpc.sql`, `resync_metadata.sql`, `sales_performance_rpc.sql`, `truncate_all_data.sql`), confirm the DDL/DML is already represented in an existing migration
    - If any file contains DDL not covered by migrations 000–010, create a new migration `backend/migrations/011_*.sql` before proceeding
    - _Requirements: 7.2, 7.3_

  - [ ] 6.2 Delete all 15 loose SQL files from `backend/`
    - Delete each file listed in Requirement 7 from the root of `backend/`
    - Confirm `backend/go.mod`, `backend/go.sum`, and the `backend/cmd/` tree are untouched
    - _Requirements: 7.1, 7.4_

- [ ] 7. Category E — UX Fixes (Forgot Password)

  - [ ] 7.1 Add forgot-password state and handler to `frontend/app/page.tsx`
    - Add three state variables: `forgotLoading: boolean`, `forgotMessage: string`, `forgotError: string`
    - Implement `handleForgotPassword` async function:
      - Trim and lowercase the current `email` state value
      - Validate against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`; if invalid, set `forgotError` and return without calling the auth service
      - Set `forgotLoading = true`, clear `forgotError` and `forgotMessage`
      - Call `supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: \`${window.location.origin}/dashboard\` })`
      - In both success and error branches, set `forgotMessage` to `"If this email is registered, a reset link has been sent."` (same message — do not leak whether the email exists)
      - Set `forgotLoading = false` in the `finally` block
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 7.2 Wire handler and in-flight state to the "Forgot?" button
    - Set `onClick={handleForgotPassword}` on the "Forgot?" button
    - Set `disabled={forgotLoading || loading}` on the button
    - Update button label to show `"Sending..."` while `forgotLoading` is `true`
    - Render `forgotError` as an inline validation message (below the email field or in the existing error slot)
    - Render `forgotMessage` as a confirmation message in the existing success/info alert slot
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 7.3 Write property test for Forgot Password handler — valid emails (Property 5)
    - **Property 5: Forgot Password handler calls auth service for any valid email**
    - Use `fc.emailAddress()` to generate valid email strings
    - Mock `supabase.auth.resetPasswordForEmail`; verify it is called with the exact (trimmed, lowercased) email
    - **Validates: Requirements 8.2**

  - [ ]* 7.4 Write property test for Forgot Password handler — invalid inputs (Property 6)
    - **Property 6: Forgot Password handler rejects any invalid email without calling auth service**
    - Use `fc.oneof(fc.constant(""), fc.string().filter(s => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)))` to generate invalid inputs
    - Verify `supabase.auth.resetPasswordForEmail` is never called and `forgotError` is set
    - **Validates: Requirements 8.3**

- [ ] 8. Category E — UX Fixes (Audit Log Error Surfacing)

  - [ ] 8.1 Replace fire-and-forget audit calls in Projects upload handler
    - In `frontend/app/dashboard/projects/page.tsx`, locate the `void authenticatedFetch("/api/audit-log", ...)` call inside `handleFileUpload`
    - Replace with `.then(async (res) => { if (!res.ok) console.error(\`[Audit] Failed to log projects_batch: HTTP ${res.status}\`); }).catch((err) => { console.error("[Audit] Failed to log projects_batch:", err); })`
    - Do not change any other part of the upload success/error flow
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 8.2 Replace fire-and-forget audit calls in Prospects upload handler
    - In `frontend/app/dashboard/prospects/page.tsx`, apply the same `.then()/.catch()` pattern with event type `"prospects_batch"`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 8.3 Replace fire-and-forget audit calls in Backlog upload handler
    - In `frontend/app/dashboard/backlog/page.tsx`, apply the same `.then()/.catch()` pattern with event type `"targets_batch"`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 8.4 Write property test for audit log error surfacing (Property 7)
    - **Property 7: Audit log failures are surfaced for any non-2xx response or network error**
    - Use `fc.integer({ min: 400, max: 599 })` to generate error status codes and `fc.string()` for rejection reasons
    - Mock `authenticatedFetch`; spy on `console.error`; verify exactly one `console.error` call per failure containing the event type and failure detail
    - Verify `console.error` is NOT called when the response is 2xx
    - Verify the upload success state is unaffected by audit failure
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

  - [ ] 8.5 Final checkpoint — Ensure all tests pass
    - Run `npm run build` in `frontend/` and confirm it succeeds
    - Run `tsc --noEmit` in `frontend/` and confirm zero errors
    - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Migration 009 (RPC signature change) must be applied before or atomically with the frontend caller update in task 1.3 to avoid a window where PostgREST returns 400 errors
- Migration 010 (column-scoped trigger) is independent and can be applied after the RPC changes
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) for TypeScript frontend properties
- Database-level properties (Properties 1 and 2) are best validated via integration tests against a local Supabase instance
- The `database.types.ts` regeneration in task 2.1 requires a running local Supabase instance or access to the project's Supabase URL/key; the agent should ask the user for the correct command if the default `supabase gen types typescript --local` does not apply
