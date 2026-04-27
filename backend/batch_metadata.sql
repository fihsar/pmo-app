-- Centralized batch metadata system.
-- This table stores the latest batch number for each major data type,
-- eliminating the need for expensive 'SELECT max(batch_number)' calls across the app.

CREATE TABLE IF NOT EXISTS public.batch_metadata (
    table_id text PRIMARY KEY, -- 'projects', 'targets', 'prospects'
    latest_batch integer NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now()
);

-- Initial seeding from existing data
INSERT INTO public.batch_metadata (table_id, latest_batch)
SELECT 'projects', COALESCE(max(batch_number), 0) FROM public.projects
ON CONFLICT (table_id) DO UPDATE SET latest_batch = EXCLUDED.latest_batch;

INSERT INTO public.batch_metadata (table_id, latest_batch)
SELECT 'targets', COALESCE(max(batch_number), 0) FROM public.project_targets
ON CONFLICT (table_id) DO UPDATE SET latest_batch = EXCLUDED.latest_batch;

INSERT INTO public.batch_metadata (table_id, latest_batch)
SELECT 'prospects', COALESCE(max(batch_number), 0) FROM public.prospects
ON CONFLICT (table_id) DO UPDATE SET latest_batch = EXCLUDED.latest_batch;

-- Trigger function to automatically keep metadata in sync
CREATE OR REPLACE FUNCTION update_latest_batch_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.batch_metadata (table_id, latest_batch)
    VALUES (TG_ARGV[0], NEW.batch_number)
    ON CONFLICT (table_id) 
    DO UPDATE SET 
        latest_batch = CASE 
            WHEN EXCLUDED.latest_batch > batch_metadata.latest_batch THEN EXCLUDED.latest_batch 
            ELSE batch_metadata.latest_batch 
        END,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to all relevant tables
DROP TRIGGER IF EXISTS tr_update_projects_batch ON public.projects;
CREATE TRIGGER tr_update_projects_batch
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION update_latest_batch_trigger('projects');

DROP TRIGGER IF EXISTS tr_update_targets_batch ON public.project_targets;
CREATE TRIGGER tr_update_targets_batch
AFTER INSERT ON public.project_targets
FOR EACH ROW EXECUTE FUNCTION update_latest_batch_trigger('targets');

DROP TRIGGER IF EXISTS tr_update_prospects_batch ON public.prospects;
CREATE TRIGGER tr_update_prospects_batch
AFTER INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION update_latest_batch_trigger('prospects');

-- Helper function to quickly get the latest batch
CREATE OR REPLACE FUNCTION get_latest_batch(p_table_id text)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT latest_batch FROM public.batch_metadata WHERE table_id = p_table_id;
$$;
