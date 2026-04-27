-- RPC function to calculate backlog subtotals on the server side
-- This replaces the expensive frontend-side calculation where all rows were fetched to the browser.
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(total), 0)::numeric as sum_total,
    COALESCE(SUM(gp_acc), 0)::numeric as sum_gp_acc
  FROM project_targets
  WHERE batch_number = p_batch_number
    -- Apply the strict 2025 invoice exclusion rule
    AND (invoice_date IS NULL OR invoice_date < '2025-01-01' OR invoice_date >= '2026-01-01')
    -- Search filter
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
    -- Date range filters
    AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= p_start_date::date)
    AND (p_end_date IS NULL OR p_end_date = '' OR target_date <= p_end_date::date)
    -- Invoice status filter
    AND (NOT p_invoice_date_empty OR invoice_date IS NULL)
    -- Category filter
    AND (
      p_category_filter = 'all' OR
      (p_category_filter = 'CSS' AND category = 'CSS') OR
      (p_category_filter = 'FCC' AND category = 'FCC') OR
      (p_category_filter = 'UNCLASSIFIED' AND (category = 'UNCLASSIFIED' OR category IS NULL OR category = '')) OR
      (category = p_category_filter)
    );
END;
$$;
