-- Performance optimization for Prospects table
-- Adds indexes to support fast batch lookups, AM filtering, and date range scans.

CREATE INDEX IF NOT EXISTS idx_prospects_batch_number ON public.prospects(batch_number);
CREATE INDEX IF NOT EXISTS idx_prospects_am_name ON public.prospects(am_name);
CREATE INDEX IF NOT EXISTS idx_prospects_target_date ON public.prospects(target_date);
CREATE INDEX IF NOT EXISTS idx_prospects_category ON public.prospects(category);

-- Trigram index for faster text search on prospect_name (useful for CSS fallback and global search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_prospects_name_trgm ON public.prospects USING gin (prospect_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prospects_client_trgm ON public.prospects USING gin (client_name gin_trgm_ops);
