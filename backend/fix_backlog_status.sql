-- Fix for Backlog Status Dropdown
-- 1. Add status column to project_targets table if it doesn't exist
ALTER TABLE public.project_targets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'On Track';

-- 2. Add UPDATE policy to allow authenticated users to update status
-- Ensure RLS is enabled first (it should be)
ALTER TABLE public.project_targets ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if any to avoid conflicts, then recreate
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.project_targets;
CREATE POLICY "Allow authenticated update access" 
ON public.project_targets FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. (Optional) Backfill existing rows with a default status if they are null
UPDATE public.project_targets SET status = 'On Track' WHERE status IS NULL;
