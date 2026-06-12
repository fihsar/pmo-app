-- Add category and category_note columns to all main tables for pre-calculated classification
-- This enables ingestion-time classification and improves dashboard performance.

-- 1. Projects
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS category_note TEXT;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS subcategory TEXT;
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects (category);
CREATE INDEX IF NOT EXISTS idx_projects_subcategory ON public.projects (subcategory);

-- 2. Prospects
ALTER TABLE IF EXISTS prospects ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE IF EXISTS prospects ADD COLUMN IF NOT EXISTS category_note TEXT;
ALTER TABLE IF EXISTS prospects ADD COLUMN IF NOT EXISTS subcategory TEXT;
CREATE INDEX IF NOT EXISTS idx_prospects_category ON public.prospects (category);
CREATE INDEX IF NOT EXISTS idx_prospects_subcategory ON public.prospects (subcategory);

-- 3. Project Targets (Backlog)
-- Note: project_targets might already have these if add_category_columns.sql was run, but IF NOT EXISTS handles it.
ALTER TABLE IF EXISTS project_targets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE IF EXISTS project_targets ADD COLUMN IF NOT EXISTS category_note TEXT;
ALTER TABLE IF EXISTS project_targets ADD COLUMN IF NOT EXISTS subcategory TEXT;
CREATE INDEX IF NOT EXISTS idx_project_targets_category ON public.project_targets (category);
CREATE INDEX IF NOT EXISTS idx_project_targets_subcategory ON public.project_targets (subcategory);
