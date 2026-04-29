# PMO App Roadmap: Stability

## Goals

- Make environment setup repeatable and predictable.
- Reduce schema drift between base SQL files, patch scripts, and actual deployed state.
- Improve confidence when running local development, builds, and future releases.

## Recommended Work

1. Replace ad hoc SQL setup with a single ordered migration path for schema, indexes, triggers, and RPCs.
2. Make `batch_number`, `upload_date`, `status`, and category-related columns part of the canonical base schema rather than relying on follow-up patch files.
3. Add a lightweight smoke-test checklist for:
   - `npm run build`
   - auth login
   - dashboard load
   - each upload flow
4. Centralize query and error telemetry so dashboard pages and table pages report latency and failures consistently.

## Notes

- Fresh environment setup should not depend on remembering the right SQL file order by hand.
- Migration cleanup will also make database type generation and maintenance easier.

## Suggested Outcome

- A new environment can be provisioned cleanly.
- Build and runtime regressions become easier to detect early.
- Performance and failure patterns are easier to monitor.
