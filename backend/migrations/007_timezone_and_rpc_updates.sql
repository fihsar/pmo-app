-- Migration 007: Fix implicit timezone drift in RPC date filters.
--
-- Problem: p_start_date::date and p_end_date::date cast text directly to date
-- in the DB server's UTC timezone. Jakarta clients sending "2025-01-01" at
-- 23:00 WIB see that as 2024-12-31 UTC — an off-by-one on boundary days.
--
-- Fix: cast input strings through timestamptz AT TIME ZONE 'Asia/Jakarta'
-- before comparing to target_date columns (which are stored as DATE in UTC).

-- ── get_backlog_subtotals ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_backlog_subtotals(
  p_batch_number        integer,
  p_search_query        text    DEFAULT '',
  p_start_date          text    DEFAULT NULL,
  p_end_date            text    DEFAULT NULL,
  p_invoice_date_empty  boolean DEFAULT false,
  p_category_filter     text    DEFAULT 'all'
)
RETURNS TABLE (sum_total numeric, sum_gp_acc numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total),  0)::numeric AS sum_total,
    COALESCE(SUM(gp_acc), 0)::numeric AS sum_gp_acc
  FROM project_targets
  WHERE batch_number = p_batch_number
    AND (invoice_date IS NULL OR invoice_date < '2025-01-01' OR invoice_date >= '2026-01-01')
    AND (
      p_search_query = '' OR
      project_id   ILIKE '%' || p_search_query || '%' OR
      customer     ILIKE '%' || p_search_query || '%' OR
      project_name ILIKE '%' || p_search_query || '%' OR
      project_manager     ILIKE '%' || p_search_query || '%' OR
      account_manager     ILIKE '%' || p_search_query || '%' OR
      term_of_payment_sales ILIKE '%' || p_search_query || '%' OR
      category ILIKE '%' || p_search_query || '%' OR
      status   ILIKE '%' || p_search_query || '%'
    )
    AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= (p_start_date::timestamptz AT TIME ZONE 'Asia/Jakarta')::date)
    AND (p_end_date   IS NULL OR p_end_date   = '' OR target_date <= (p_end_date::timestamptz   AT TIME ZONE 'Asia/Jakarta')::date)
    AND (NOT p_invoice_date_empty OR invoice_date IS NULL)
    AND (
      p_category_filter = 'all' OR
      (p_category_filter = 'CSS'          AND category = 'CSS') OR
      (p_category_filter = 'FCC'          AND category = 'FCC') OR
      (p_category_filter = 'UNCLASSIFIED' AND (category = 'UNCLASSIFIED' OR category IS NULL OR category = '')) OR
      (category = p_category_filter)
    );
END;
$$;

-- ── get_prospects_subtotals ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_prospects_subtotals(
  p_batch_number    integer,
  p_allowed_ams     text[],
  p_search_query    text    DEFAULT '',
  p_start_date      text    DEFAULT NULL,
  p_end_date        text    DEFAULT NULL,
  p_category_filter text    DEFAULT 'all'
)
RETURNS TABLE (sum_amount numeric, sum_gp numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0)::numeric AS sum_amount,
    COALESCE(SUM(gp),     0)::numeric AS sum_gp
  FROM prospects
  WHERE batch_number = p_batch_number
    AND am_name = ANY(p_allowed_ams)
    AND (
      p_search_query = '' OR
      id_project    ILIKE '%' || p_search_query || '%' OR
      client_name   ILIKE '%' || p_search_query || '%' OR
      prospect_name ILIKE '%' || p_search_query || '%' OR
      am_name       ILIKE '%' || p_search_query || '%' OR
      company_name  ILIKE '%' || p_search_query || '%' OR
      category      ILIKE '%' || p_search_query || '%' OR
      status        ILIKE '%' || p_search_query || '%'
    )
    AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= (p_start_date::timestamptz AT TIME ZONE 'Asia/Jakarta')::date)
    AND (p_end_date   IS NULL OR p_end_date   = '' OR target_date <= (p_end_date::timestamptz   AT TIME ZONE 'Asia/Jakarta')::date)
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

-- get_sales_performance_summary date fix is already in migration 006.
