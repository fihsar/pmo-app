-- Resync batch metadata with actual table contents.
-- Run this if the UI shows no data after upload due to metadata being out of sync.

INSERT INTO public.batch_metadata (table_id, latest_batch)
SELECT 'projects', COALESCE(max(batch_number), 0) FROM public.projects
ON CONFLICT (table_id) DO UPDATE SET latest_batch = EXCLUDED.latest_batch, updated_at = now();

INSERT INTO public.batch_metadata (table_id, latest_batch)
SELECT 'targets', COALESCE(max(batch_number), 0) FROM public.project_targets
ON CONFLICT (table_id) DO UPDATE SET latest_batch = EXCLUDED.latest_batch, updated_at = now();

INSERT INTO public.batch_metadata (table_id, latest_batch)
SELECT 'prospects', COALESCE(max(batch_number), 0) FROM public.prospects
ON CONFLICT (table_id) DO UPDATE SET latest_batch = EXCLUDED.latest_batch, updated_at = now();
