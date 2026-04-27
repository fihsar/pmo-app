-- RPC function to calculate prospects subtotals on the server side
-- Returns the sum of amount and GP for the filtered dataset.
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0)::numeric as sum_amount,
    COALESCE(SUM(gp), 0)::numeric as sum_gp
  FROM prospects
  WHERE batch_number = p_batch_number
    AND am_name = ANY(p_allowed_ams)
    -- Search filter
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
    -- Date range filters
    AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= p_start_date::date)
    AND (p_end_date IS NULL OR p_end_date = '' OR target_date <= p_end_date::date)
    -- Category filter (with full CSS fallback logic)
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
