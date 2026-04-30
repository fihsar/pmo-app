-- Migration 004: Composite indices for the aggregate RPC query patterns.
-- get_backlog_subtotals filters on (batch_number, target_date, category).
-- get_prospects_subtotals filters on (batch_number, am_name, target_date).
-- Without composite indices Postgres falls back to a bitmap heap scan over
-- the entire batch — EXPLAIN ANALYZE should show index scans after this.

CREATE INDEX IF NOT EXISTS idx_project_targets_batch_target_category
    ON public.project_targets (batch_number, target_date, category);

CREATE INDEX IF NOT EXISTS idx_prospects_batch_am_target
    ON public.prospects (batch_number, am_name, target_date);
