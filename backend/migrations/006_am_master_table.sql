-- Migration 006: Promote hardcoded AM/PM lists from SQL literals to tables.
--
-- Before: every RPC that filters by AM or PM name embeds a static ARRAY[...].
-- Adding a person requires a SQL deploy.
--
-- After: a single INSERT into am_master / pm_master; RPCs join against them.

-- ── am_master ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.am_master (
    id         SERIAL      PRIMARY KEY,
    name       TEXT        NOT NULL UNIQUE,  -- display name (exact case)
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.am_master ENABLE ROW LEVEL SECURITY;

-- Everyone can read (RPCs join against this table).
CREATE POLICY "am_master_select" ON public.am_master FOR SELECT TO authenticated USING (true);
-- Only Superadmin can manage the list.
CREATE POLICY "am_master_write"  ON public.am_master FOR ALL   TO authenticated
    USING (public.get_my_role() = 'Superadmin')
    WITH CHECK (public.get_my_role() = 'Superadmin');

-- Seed from the list currently hardcoded in sales_performance_rpc.sql
INSERT INTO public.am_master (name) VALUES
    ('Andrew Daniel Gunalan'),
    ('Elsa Yolanda Simanjuntak'),
    ('Graeta Venato'),
    ('Lizty Latifah'),
    ('M. Satria Manggala Yudha'),
    ('Merlin'),
    ('Pandu R Akbar')
ON CONFLICT (name) DO NOTHING;

-- ── pm_master ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pm_master (
    id         SERIAL      PRIMARY KEY,
    name       TEXT        NOT NULL UNIQUE,  -- lowercase, as used in KPI filtering
    is_active  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.pm_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_master_select" ON public.pm_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "pm_master_write"  ON public.pm_master FOR ALL   TO authenticated
    USING (public.get_my_role() = 'Superadmin')
    WITH CHECK (public.get_my_role() = 'Superadmin');

-- Seed from dashboard_summary.sql
INSERT INTO public.pm_master (name) VALUES
    ('yohanes ivan enda'),
    ('khoirul tasya'),
    ('mahendra gati'),
    ('tasya tamaraputri')
ON CONFLICT (name) DO NOTHING;

-- ── Update RPCs to join against the tables ────────────────────────────────────

-- get_sales_performance_summary: replace static ARRAY with am_master join
DROP FUNCTION IF EXISTS public.get_sales_performance_summary(text[], text, text);
DROP FUNCTION IF EXISTS public.get_sales_performance_summary(text, text);

CREATE OR REPLACE FUNCTION public.get_sales_performance_summary(
    p_start_date text DEFAULT NULL,
    p_end_date   text DEFAULT NULL
)
RETURNS TABLE (
    sales_person        text,
    am_target           numeric,
    backlog             numeric,
    prospect_pipeline   numeric,
    total_opportunity   numeric,
    achievement_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH
allowed_ams AS (
    SELECT name, lower(trim(name)) AS normalized_name
    FROM public.am_master
    WHERE is_active = true
),
latest_backlog AS (
    SELECT a.name, SUM(COALESCE(gp_acc, 0))::numeric AS total_gp
    FROM public.project_targets
    JOIN allowed_ams a ON lower(trim(COALESCE(account_manager, ''))) = a.normalized_name
    WHERE batch_number = get_latest_batch('targets')
      AND (invoice_date IS NULL OR to_char(invoice_date, 'YYYY') <> '2025')
      AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= p_start_date::date)
      AND (p_end_date   IS NULL OR p_end_date   = '' OR target_date <= p_end_date::date)
    GROUP BY 1
),
latest_prospects AS (
    SELECT a.name, SUM(COALESCE(gp, 0))::numeric AS pipeline
    FROM public.prospects
    JOIN allowed_ams a ON lower(trim(COALESCE(am_name, ''))) = a.normalized_name
    WHERE batch_number = get_latest_batch('prospects')
      AND (p_start_date IS NULL OR p_start_date = '' OR target_date >= p_start_date::date)
      AND (p_end_date   IS NULL OR p_end_date   = '' OR target_date <= p_end_date::date)
    GROUP BY 1
),
constants AS (
    SELECT
        36000000000.0::numeric AS company_target,
        (36000000000.0 / NULLIF((SELECT count(*) FROM allowed_ams), 0))::numeric AS am_quota
)
SELECT
    a.name                                                     AS sales_person,
    c.am_quota                                                 AS am_target,
    COALESCE(lb.total_gp, 0)                                   AS backlog,
    COALESCE(lp.pipeline, 0)                                   AS prospect_pipeline,
    COALESCE(lb.total_gp, 0) + COALESCE(lp.pipeline, 0)       AS total_opportunity,
    (COALESCE(lb.total_gp, 0) / c.am_quota) * 100             AS achievement_percent
FROM allowed_ams a
CROSS JOIN constants c
LEFT JOIN latest_backlog  lb ON a.name = lb.name
LEFT JOIN latest_prospects lp ON a.name = lp.name
ORDER BY total_opportunity DESC;
$$;

-- get_dashboard_summary: replace static PM array with pm_master join
-- (Only the kpi_projects CTE changes; the rest stays identical.)
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS TABLE (
    total               integer,
    avg_progress        numeric,
    avg_pqi_time        numeric,
    avg_pqi_cost        numeric,
    pqi_time_data       jsonb,
    pqi_cost_data       jsonb,
    sched_data          jsonb,
    fin_data            jsonb,
    progress_data       jsonb,
    pm_data             jsonb,
    cat_data            jsonb,
    budget_data         jsonb,
    am_achievement_data jsonb,
    total_gross_profit  numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH latest_projects AS (
    SELECT * FROM public.projects
    WHERE batch_number = get_latest_batch('projects')
),
kpi_projects AS (
    SELECT lp.*
    FROM latest_projects lp
    WHERE COALESCE(lower(project_category), '') <> 'maintenance'
      AND lower(COALESCE(project_manager, '')) IN (
          SELECT name FROM public.pm_master WHERE is_active = true
      )
),
latest_targets AS (
    SELECT * FROM public.project_targets
    WHERE batch_number = get_latest_batch('targets')
),
targets_for_achievement AS (
    SELECT * FROM latest_targets
    WHERE invoice_date IS NULL OR (to_char(invoice_date, 'YYYY') <> '2025')
),
am_base AS (
    SELECT
        COALESCE(NULLIF(trim(account_manager), ''), 'Unknown') AS name,
        SUM(COALESCE(gp_acc, 0)) AS target,
        SUM(CASE WHEN invoice_date IS NOT NULL AND trim(COALESCE(invoice_date::text, '')) <> ''
                 THEN COALESCE(gp_acc, 0) ELSE 0 END) AS actual
    FROM targets_for_achievement
    GROUP BY 1
),
pqi_time_bucket AS (
    SELECT jsonb_agg(jsonb_build_object('name', bucket, 'value', bucket_count) ORDER BY sort_order) AS data
    FROM (VALUES
        ('Black',  (SELECT count(*) FROM kpi_projects WHERE pqi_time < 1),              1),
        ('Red',    (SELECT count(*) FROM kpi_projects WHERE pqi_time >= 1 AND pqi_time <= 70), 2),
        ('Yellow', (SELECT count(*) FROM kpi_projects WHERE pqi_time > 70 AND pqi_time < 91), 3),
        ('Green',  (SELECT count(*) FROM kpi_projects WHERE pqi_time >= 91),             4)
    ) AS v(bucket, bucket_count, sort_order)
    WHERE bucket_count > 0
),
pqi_cost_bucket AS (
    SELECT jsonb_agg(jsonb_build_object('name', bucket, 'value', bucket_count) ORDER BY sort_order) AS data
    FROM (VALUES
        ('Black',  (SELECT count(*) FROM kpi_projects WHERE pqi_cost < 1),              1),
        ('Red',    (SELECT count(*) FROM kpi_projects WHERE pqi_cost >= 1 AND pqi_cost <= 70), 2),
        ('Yellow', (SELECT count(*) FROM kpi_projects WHERE pqi_cost > 70 AND pqi_cost < 91), 3),
        ('Green',  (SELECT count(*) FROM kpi_projects WHERE pqi_cost >= 91),             4)
    ) AS v(bucket, bucket_count, sort_order)
    WHERE bucket_count > 0
),
progress_distribution AS (
    SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count) ORDER BY sort_order) AS data
    FROM (VALUES
        ('0–25%',   (SELECT count(*) FROM kpi_projects WHERE COALESCE(percentage_progress,0) BETWEEN 0  AND 25),  1),
        ('26–50%',  (SELECT count(*) FROM kpi_projects WHERE COALESCE(percentage_progress,0) BETWEEN 26 AND 50),  2),
        ('51–75%',  (SELECT count(*) FROM kpi_projects WHERE COALESCE(percentage_progress,0) BETWEEN 51 AND 75),  3),
        ('76–100%', (SELECT count(*) FROM kpi_projects WHERE COALESCE(percentage_progress,0) BETWEEN 76 AND 100), 4)
    ) AS v(name, count, sort_order)
),
pm_data AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY value DESC, name), '[]'::jsonb) AS data
    FROM (
        SELECT COALESCE(NULLIF(trim(project_manager), ''), 'Unknown') AS name, count(*)::int AS value
        FROM latest_projects GROUP BY 1 ORDER BY value DESC, name LIMIT 10
    ) x
),
cat_data AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY value DESC, name), '[]'::jsonb) AS data
    FROM (
        SELECT COALESCE(NULLIF(trim(project_category), ''), 'Unknown') AS name, count(*)::int AS value
        FROM latest_projects GROUP BY 1 ORDER BY value DESC, name
    ) x
),
schedule_data AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY value DESC, name), '[]'::jsonb) AS data
    FROM (
        SELECT COALESCE(NULLIF(trim(schedule_health), ''), 'Unknown') AS name, count(*)::int AS value
        FROM latest_projects GROUP BY 1 ORDER BY value DESC, name
    ) x
),
financial_data AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY value DESC, name), '[]'::jsonb) AS data
    FROM (
        SELECT COALESCE(NULLIF(trim(financial_health), ''), 'Unknown') AS name, count(*)::int AS value
        FROM latest_projects GROUP BY 1 ORDER BY value DESC, name
    ) x
),
budget_ranked AS (
    SELECT
        row_number() OVER (ORDER BY COALESCE(total_budget,0) DESC, COALESCE(project_id,'') ASC) AS rn,
        round(COALESCE(total_budget,0) / 1000000.0)::int AS budget,
        round(COALESCE(budget_usage,0) / 1000000.0)::int AS usage
    FROM latest_projects WHERE COALESCE(total_budget,0) > 0
    ORDER BY 1 LIMIT 10
),
budget_data AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name','P'||rn,'budget',budget,'usage',usage) ORDER BY rn), '[]'::jsonb) AS data
    FROM budget_ranked
),
am_achievement_data AS (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'name', name,
            'target', round(target / 1000000.0)::int,
            'actual', round(actual / 1000000.0)::int,
            'percent', CASE WHEN target > 0 THEN round((actual/target)*100.0)::int ELSE 0 END
        ) ORDER BY target DESC, name),
        '[]'::jsonb
    ) AS data FROM am_base
)
SELECT
    COALESCE((SELECT count(*)::int FROM latest_projects), 0),
    COALESCE((SELECT avg(percentage_progress) FROM kpi_projects), 0),
    COALESCE((SELECT avg(pqi_time) FROM kpi_projects), 0),
    COALESCE((SELECT avg(pqi_cost) FROM kpi_projects), 0),
    COALESCE((SELECT data FROM pqi_time_bucket),       '[]'::jsonb),
    COALESCE((SELECT data FROM pqi_cost_bucket),       '[]'::jsonb),
    COALESCE((SELECT data FROM schedule_data),         '[]'::jsonb),
    COALESCE((SELECT data FROM financial_data),        '[]'::jsonb),
    COALESCE((SELECT data FROM progress_distribution), '[]'::jsonb),
    COALESCE((SELECT data FROM pm_data),               '[]'::jsonb),
    COALESCE((SELECT data FROM cat_data),              '[]'::jsonb),
    COALESCE((SELECT data FROM budget_data),           '[]'::jsonb),
    COALESCE((SELECT data FROM am_achievement_data),   '[]'::jsonb),
    COALESCE((SELECT SUM(COALESCE(gp_acc,0)) FROM targets_for_achievement), 0);
$$;
