-- Migration 003: Convert per-row batch_metadata triggers to statement-level.
-- FOR EACH ROW fired once per inserted row. For a 10k-row bulk upload this
-- meant 10k individual upserts with row locks. FOR EACH STATEMENT fires once
-- per INSERT statement — a single MAX() + upsert regardless of batch size.

CREATE OR REPLACE FUNCTION update_latest_batch_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_max_batch integer;
BEGIN
    EXECUTE format(
        'SELECT COALESCE(MAX(batch_number), 0) FROM public.%I',
        TG_TABLE_NAME
    ) INTO v_max_batch;

    INSERT INTO public.batch_metadata (table_id, latest_batch)
    VALUES (TG_ARGV[0], v_max_batch)
    ON CONFLICT (table_id)
    DO UPDATE SET
        latest_batch = GREATEST(EXCLUDED.latest_batch, batch_metadata.latest_batch),
        updated_at   = now();

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_projects_batch ON public.projects;
CREATE TRIGGER tr_update_projects_batch
AFTER INSERT ON public.projects
FOR EACH STATEMENT EXECUTE FUNCTION update_latest_batch_trigger('projects');

DROP TRIGGER IF EXISTS tr_update_targets_batch ON public.project_targets;
CREATE TRIGGER tr_update_targets_batch
AFTER INSERT ON public.project_targets
FOR EACH STATEMENT EXECUTE FUNCTION update_latest_batch_trigger('targets');

DROP TRIGGER IF EXISTS tr_update_prospects_batch ON public.prospects;
CREATE TRIGGER tr_update_prospects_batch
AFTER INSERT ON public.prospects
FOR EACH STATEMENT EXECUTE FUNCTION update_latest_batch_trigger('prospects');
