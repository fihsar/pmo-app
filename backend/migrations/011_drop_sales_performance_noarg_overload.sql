-- Migration 011: Drop the no-argument overload of get_sales_performance_summary.
--
-- Problem: Two overloads exist in the database:
--   1. get_sales_performance_summary()           -- legacy no-arg version
--   2. get_sales_performance_summary(text, text) -- current version from migration 008
--
-- When the frontend calls the RPC with both params as NULL/undefined, PostgREST
-- cannot resolve the ambiguity and returns:
--   "Could not choose the best candidate function between: ..."
--
-- Solution: Drop the no-arg overload. The two-arg version handles NULL params
-- identically (NULL means "no filter"), so behaviour is unchanged.

DROP FUNCTION IF EXISTS public.get_sales_performance_summary();
