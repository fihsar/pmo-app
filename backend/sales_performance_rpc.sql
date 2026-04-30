-- Sales Performance RPC for unified sales tracking.
-- Combines data from project_targets (Backlog) and prospects to show per-salesperson achievement.
-- Business Rules:
-- 1. Company Target = 36,000,000,000
-- 2. AM Quota = 36,000,000,000 / 7
-- 3. Backlog = Total GP (sum of all gp_acc from project_targets)
-- 4. Achievement % = Backlog / AM Quota * 100
-- 5. Total Opportunity = Backlog + Prospect Pipeline

DROP FUNCTION IF EXISTS public.get_sales_performance_summary(text[]);
DROP FUNCTION IF EXISTS public.get_sales_performance_summary(text[], text, text);
DROP FUNCTION IF EXISTS public.get_sales_performance_summary(text, text);

CREATE OR REPLACE FUNCTION public.get_sales_performance_summary(
    p_start_date text DEFAULT NULL,
    p_end_date text DEFAULT NULL
)
RETURNS TABLE (
    sales_person text,
    am_target numeric,
    backlog numeric,
    prospect_pipeline numeric,
    total_opportunity numeric,
    achievement_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH 
allowed_ams AS (
    SELECT
        am_name AS name,
        lower(trim(am_name)) AS normalized_name
    FROM unnest(ARRAY[
        'Andrew Daniel Gunalan',
        'Elsa Yolanda Simanjuntak',
        'Graeta Venato',
        'Lizty Latifah',
        'M. Satria Manggala Yudha',
        'Merlin',
        'Pandu R Akbar'
    ]::text[]) AS am_name
),
latest_backlog AS (
    SELECT 
        a.name,
        -- Total Backlog is now defined as the Total GP (sum of all gp_acc)
        SUM(COALESCE(gp_acc, 0))::numeric AS total_gp
    FROM public.project_targets
    JOIN allowed_ams a
      ON lower(trim(COALESCE(account_manager, ''))) = a.normalized_name
    WHERE batch_number = get_latest_batch('targets')
      AND (invoice_date IS NULL OR to_char(invoice_date, 'YYYY') <> '2025')
      AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= (p_start_date::timestamptz AT TIME ZONE 'Asia/Jakarta')::date)
      AND (p_end_date   IS NULL OR p_end_date   = '' OR target_date <= (p_end_date::timestamptz   AT TIME ZONE 'Asia/Jakarta')::date)
    GROUP BY 1
),
latest_prospects AS (
    SELECT 
        a.name,
        SUM(COALESCE(gp, 0))::numeric AS pipeline
    FROM public.prospects
    JOIN allowed_ams a
      ON lower(trim(COALESCE(am_name, ''))) = a.normalized_name
    WHERE batch_number = get_latest_batch('prospects')
      AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= (p_start_date::timestamptz AT TIME ZONE 'Asia/Jakarta')::date)
      AND (p_end_date   IS NULL OR p_end_date   = '' OR target_date <= (p_end_date::timestamptz   AT TIME ZONE 'Asia/Jakarta')::date)
    GROUP BY 1
),
all_names AS (
    SELECT name FROM allowed_ams
),
constants AS (
    SELECT 
        36000000000.0::numeric AS company_target,
        (36000000000.0 / 7.0)::numeric AS am_quota
)
SELECT 
    n.name as sales_person,
    c.am_quota as am_target,
    COALESCE(lb.total_gp, 0) as backlog,
    COALESCE(lp.pipeline, 0) as prospect_pipeline,
    (COALESCE(lb.total_gp, 0) + COALESCE(lp.pipeline, 0)) as total_opportunity,
    -- Achievement % = Backlog (Total GP) / AM Target * 100
    (COALESCE(lb.total_gp, 0) / c.am_quota) * 100 as achievement_percent
FROM all_names n
CROSS JOIN constants c
LEFT JOIN latest_backlog lb ON n.name = lb.name
LEFT JOIN latest_prospects lp ON n.name = lp.name
ORDER BY total_opportunity DESC;
$$;
