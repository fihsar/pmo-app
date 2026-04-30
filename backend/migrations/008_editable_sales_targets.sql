-- Migration 008: Editable Sales Targets (Per-AM + Category)
--
-- Problem: AM quotas are hardcoded (36B / count(AMs)) in the RPC. Adding or changing
-- an AM's individual target requires a SQL deploy.
--
-- Solution: Store annual targets on am_master, and create a category_targets table
-- for company-wide category-level budgets. Update get_sales_performance_summary to
-- use per-AM targets instead of a computed formula.

-- 1a. Add annual_target column to am_master
ALTER TABLE public.am_master
    ADD COLUMN IF NOT EXISTS annual_target NUMERIC NOT NULL DEFAULT 0;

-- Seed existing 7 AMs with the current equal-split value so the dashboard doesn't go blank
UPDATE public.am_master SET annual_target = ROUND(36000000000.0 / 7.0) WHERE annual_target = 0;

-- 1b. Create category_targets table for company-wide category budgets
CREATE TABLE IF NOT EXISTS public.category_targets (
    id         SERIAL      PRIMARY KEY,
    category   TEXT        NOT NULL UNIQUE,  -- 'CSS' | 'FCC' | 'UNCLASSIFIED'
    target     NUMERIC     NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.category_targets ENABLE ROW LEVEL SECURITY;

-- Everyone can read category targets (used by RPCs and dashboards).
CREATE POLICY "category_targets_select" ON public.category_targets
    FOR SELECT TO authenticated USING (true);

-- Only Superadmin can manage.
CREATE POLICY "category_targets_write" ON public.category_targets
    FOR ALL TO authenticated
    USING (public.get_my_role() = 'Superadmin')
    WITH CHECK (public.get_my_role() = 'Superadmin');

-- Seed the three fixed categories.
INSERT INTO public.category_targets (category, target) VALUES
    ('CSS', 0),
    ('FCC', 0),
    ('UNCLASSIFIED', 0)
ON CONFLICT (category) DO NOTHING;

-- 1c. Update get_sales_performance_summary to use per-AM annual_target
DROP FUNCTION IF EXISTS public.get_sales_performance_summary(text, text);

CREATE OR REPLACE FUNCTION public.get_sales_performance_summary(
    p_start_date text DEFAULT NULL,
    p_end_date   text DEFAULT NULL
)
RETURNS TABLE (
    sales_person        text,
    am_target           numeric,
    backlog             numeric,
    prospect_pipeline   numeric,
    total_opportunity   numeric,
    achievement_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH
allowed_ams AS (
    SELECT name, lower(trim(name)) AS normalized_name, annual_target
    FROM public.am_master
    WHERE is_active = true
),
latest_backlog AS (
    SELECT a.name, SUM(COALESCE(gp_acc, 0))::numeric AS total_gp
    FROM public.project_targets
    JOIN allowed_ams a ON lower(trim(COALESCE(account_manager, ''))) = a.normalized_name
    WHERE batch_number = get_latest_batch('targets')
      AND (invoice_date IS NULL OR to_char(invoice_date, 'YYYY') <> '2025')
      AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= (p_start_date::timestamptz AT TIME ZONE 'Asia/Jakarta')::date)
      AND (p_end_date   IS NULL OR p_end_date   = '' OR target_date <= (p_end_date::timestamptz   AT TIME ZONE 'Asia/Jakarta')::date)
    GROUP BY 1
),
latest_prospects AS (
    SELECT a.name, SUM(COALESCE(gp, 0))::numeric AS pipeline
    FROM public.prospects
    JOIN allowed_ams a ON lower(trim(COALESCE(am_name, ''))) = a.normalized_name
    WHERE batch_number = get_latest_batch('prospects')
      AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= (p_start_date::timestamptz AT TIME ZONE 'Asia/Jakarta')::date)
      AND (p_end_date   IS NULL OR p_end_date   = '' OR target_date <= (p_end_date::timestamptz   AT TIME ZONE 'Asia/Jakarta')::date)
    GROUP BY 1
)
SELECT
    a.name                                                     AS sales_person,
    a.annual_target                                            AS am_target,
    COALESCE(lb.total_gp, 0)                                   AS backlog,
    COALESCE(lp.pipeline, 0)                                   AS prospect_pipeline,
    COALESCE(lb.total_gp, 0) + COALESCE(lp.pipeline, 0)       AS total_opportunity,
    CASE
        WHEN a.annual_target > 0
        THEN (COALESCE(lb.total_gp, 0) / a.annual_target) * 100
        ELSE 0
    END                                                        AS achievement_percent
FROM allowed_ams a
LEFT JOIN latest_backlog  lb ON a.name = lb.name
LEFT JOIN latest_prospects lp ON a.name = lp.name
ORDER BY total_opportunity DESC;
$$;
