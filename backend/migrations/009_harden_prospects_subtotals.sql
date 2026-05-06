-- Migration 009: Remove client-provided AM list from get_prospects_subtotals.
-- The function now joins am_master internally, matching get_sales_performance_summary.

DROP FUNCTION IF EXISTS public.get_prospects_subtotals(integer, text[], text, text, text, text);

CREATE OR REPLACE FUNCTION public.get_prospects_subtotals(
  p_batch_number    integer,
  p_search_query    text DEFAULT '',
  p_start_date      text DEFAULT NULL,
  p_end_date        text DEFAULT NULL,
  p_category_filter text DEFAULT 'all'
)
RETURNS TABLE (sum_amount numeric, sum_gp numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(p.amount), 0)::numeric,
    COALESCE(SUM(p.gp), 0)::numeric
  FROM prospects p
  JOIN am_master a
    ON lower(trim(p.am_name)) = lower(trim(a.name))
   AND a.is_active = true
  WHERE p.batch_number = p_batch_number
    AND (
      p_search_query = '' OR
      p.id_project      ILIKE '%' || p_search_query || '%' OR
      p.client_name     ILIKE '%' || p_search_query || '%' OR
      p.prospect_name   ILIKE '%' || p_search_query || '%' OR
      p.am_name         ILIKE '%' || p_search_query || '%' OR
      p.company_name    ILIKE '%' || p_search_query || '%' OR
      p.category        ILIKE '%' || p_search_query || '%' OR
      p.status          ILIKE '%' || p_search_query || '%'
    )
    AND (p_start_date IS NULL OR p_start_date = ''
         OR p.target_date >= (p_start_date::timestamptz AT TIME ZONE 'Asia/Jakarta')::date)
    AND (p_end_date   IS NULL OR p_end_date   = ''
         OR p.target_date <= (p_end_date::timestamptz   AT TIME ZONE 'Asia/Jakarta')::date)
    AND (
      p_category_filter = 'all' OR
      (p_category_filter = 'CSS' AND (
        p.category = 'CSS' OR
        p.prospect_name ILIKE '%Managed Service%' OR
        p.prospect_name ILIKE '%Internet Service%' OR
        p.prospect_name ILIKE '%Bandwidth%' OR
        p.prospect_name ILIKE '%Lastmile%' OR
        p.prospect_name ILIKE '%Leased Line%'
      )) OR
      (p_category_filter = 'UNCLASSIFIED'
        AND (p.category = 'UNCLASSIFIED' OR p.category IS NULL OR p.category = '')) OR
      (p.category = p_category_filter)
    );
END;
$$;
