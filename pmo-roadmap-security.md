# PMO App Roadmap: Security

## Goals

- Make role-based access real at the database layer, not just in the UI.
- Reduce the chance of sensitive reads or writes bypassing the intended permissions model.
- Ensure privileged RPCs and admin flows are explicitly guarded.

## Recommended Work

1. Tighten RLS on `projects`, `prospects`, `project_targets`, and `profiles`.
2. Route sensitive reads and writes through server-only handlers with explicit authorization checks.
3. Audit every `SECURITY DEFINER` RPC and add caller validation or move the logic behind protected server APIs.
4. Add a clear permission matrix so frontend navigation rules and database rules stay aligned.

## Notes

- Current broad `USING (true)` and `WITH CHECK (true)` policies should be treated as temporary.
- Any future admin or analytics feature should be reviewed against the DB role model before release.

## Suggested Outcome

- A signed-in user can only read and modify what their role is meant to access.
- Superadmin workflows remain available, but ordinary authenticated users cannot bypass them by querying tables directly.
