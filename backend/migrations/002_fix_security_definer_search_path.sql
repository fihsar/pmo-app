-- Migration 002: Pin search_path on all SECURITY DEFINER functions.
-- Without this, a user with CREATE on any schema can shadow functions/operators
-- and execute code with definer (elevated) privileges.

-- Re-create each function with SET search_path = public.
-- Full bodies are copied from their respective .sql source files.

-- ── get_backlog_subtotals ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_backlog_subtotals(
  p_batch_number integer,
  p_search_query text DEFAULT '',
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_invoice_date_empty boolean DEFAULT false,
  p_category_filter text DEFAULT 'all'
)
RETURNS TABLE (
  sum_total numeric,
  sum_gp_acc numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total), 0)::numeric as sum_total,
    COALESCE(SUM(gp_acc), 0)::numeric as sum_gp_acc
  FROM project_targets
  WHERE batch_number = p_batch_number
    AND (invoice_date IS NULL OR invoice_date < '2025-01-01' OR invoice_date >= '2026-01-01')
    AND (
      p_search_query = '' OR
      project_id ILIKE '%' || p_search_query || '%' OR
      customer ILIKE '%' || p_search_query || '%' OR
      project_name ILIKE '%' || p_search_query || '%' OR
      project_manager ILIKE '%' || p_search_query || '%' OR
      account_manager ILIKE '%' || p_search_query || '%' OR
      term_of_payment_sales ILIKE '%' || p_search_query || '%' OR
      category ILIKE '%' || p_search_query || '%' OR
      status ILIKE '%' || p_search_query || '%'
    )
    AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= p_start_date::date)
    AND (p_end_date IS NULL OR p_end_date = '' OR target_date <= p_end_date::date)
    AND (NOT p_invoice_date_empty OR invoice_date IS NULL)
    AND (
      p_category_filter = 'all' OR
      (p_category_filter = 'CSS' AND category = 'CSS') OR
      (p_category_filter = 'FCC' AND category = 'FCC') OR
      (p_category_filter = 'UNCLASSIFIED' AND (category = 'UNCLASSIFIED' OR category IS NULL OR category = '')) OR
      (category = p_category_filter)
    );
END;
$$;

-- ── get_prospects_subtotals ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_prospects_subtotals(
  p_batch_number integer,
  p_allowed_ams text[],
  p_search_query text DEFAULT '',
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_category_filter text DEFAULT 'all'
)
RETURNS TABLE (
  sum_amount numeric,
  sum_gp numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0)::numeric as sum_amount,
    COALESCE(SUM(gp), 0)::numeric as sum_gp
  FROM prospects
  WHERE batch_number = p_batch_number
    AND am_name = ANY(p_allowed_ams)
    AND (
      p_search_query = '' OR
      id_project ILIKE '%' || p_search_query || '%' OR
      client_name ILIKE '%' || p_search_query || '%' OR
      prospect_name ILIKE '%' || p_search_query || '%' OR
      am_name ILIKE '%' || p_search_query || '%' OR
      company_name ILIKE '%' || p_search_query || '%' OR
      category ILIKE '%' || p_search_query || '%' OR
      status ILIKE '%' || p_search_query || '%'
    )
    AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= p_start_date::date)
    AND (p_end_date IS NULL OR p_end_date = '' OR target_date <= p_end_date::date)
    AND (
      p_category_filter = 'all' OR
      (p_category_filter = 'CSS' AND (
        category = 'CSS' OR
        prospect_name ILIKE '%Managed Service%' OR
        prospect_name ILIKE '%Internet Service%' OR
        prospect_name ILIKE '%Bandwidth%' OR
        prospect_name ILIKE '%Lastmile%' OR
        prospect_name ILIKE '%Leased Line%'
      )) OR
      (p_category_filter = 'UNCLASSIFIED' AND (category = 'UNCLASSIFIED' OR category IS NULL OR category = '')) OR
      (category = p_category_filter)
    );
END;
$$;

-- ── get_sales_performance_summary ────────────────────────────────────────────
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
        SUM(COALESCE(gp_acc, 0))::numeric AS total_gp
    FROM public.project_targets
    JOIN allowed_ams a
      ON lower(trim(COALESCE(account_manager, ''))) = a.normalized_name
    WHERE batch_number = get_latest_batch('targets')
      AND (invoice_date IS NULL OR to_char(invoice_date, 'YYYY') <> '2025')
      AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= p_start_date::date)
      AND (p_end_date IS NULL OR p_end_date = '' OR target_date <= p_end_date::date)
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
      AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= p_start_date::date)
      AND (p_end_date IS NULL OR p_end_date = '' OR target_date <= p_end_date::date)
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
    (COALESCE(lb.total_gp, 0) / c.am_quota) * 100 as achievement_percent
FROM all_names n
CROSS JOIN constants c
LEFT JOIN latest_backlog lb ON n.name = lb.name
LEFT JOIN latest_prospects lp ON n.name = lp.name
ORDER BY total_opportunity DESC;
$$;

-- ── get_dashboard_summary ────────────────────────────────────────────────────
-- (Full body from dashboard_summary.sql — adding SET search_path only)
-- Run the full dashboard_summary.sql after adding SET search_path, or apply
-- the ALTER below which avoids repeating the body:
ALTER FUNCTION public.get_dashboard_summary()
    SET search_path = public;
