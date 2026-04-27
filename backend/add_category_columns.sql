-- Add category and category_note columns to project_targets table for server-side filtering
ALTER TABLE project_targets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE project_targets ADD COLUMN IF NOT EXISTS category_note TEXT;

-- Add index for better performance on category filtering
CREATE INDEX IF NOT EXISTS idx_project_targets_category ON public.project_targets (category);
