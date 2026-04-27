-- Dashboard summary RPC for scalable client rendering.
-- Returns aggregated metrics for the latest project and project_targets batches.

CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS TABLE (
    total integer,
    avg_progress numeric,
    avg_pqi_time numeric,
    avg_pqi_cost numeric,
    pqi_time_data jsonb,
    pqi_cost_data jsonb,
    sched_data jsonb,
    fin_data jsonb,
    progress_data jsonb,
    pm_data jsonb,
    cat_data jsonb,
    budget_data jsonb,
    am_achievement_data jsonb,
    total_gross_profit numeric
)
LANGUAGE sql
STABLE
AS $$
WITH latest_projects AS (
    SELECT *
    FROM public.projects
    WHERE batch_number = (SELECT max(batch_number) FROM public.projects)
),
kpi_projects AS (
    SELECT *
    FROM latest_projects
    WHERE COALESCE(lower(project_category), '') <> 'maintenance'
      AND lower(COALESCE(project_manager, '')) = ANY (ARRAY[
        'yohanes ivan enda',
        'khoirul tasya',
        'mahendra gati',
        'tasya tamaraputri'
      ])
),
latest_targets AS (
    SELECT *
    FROM public.project_targets
    WHERE batch_number = (SELECT max(batch_number) FROM public.project_targets)
),
targets_for_achievement AS (
    SELECT *
    FROM latest_targets
    WHERE invoice_date IS NULL OR to_char(invoice_date, 'YYYY') <> '2025'
),
am_base AS (
    SELECT
        COALESCE(NULLIF(trim(account_manager), ''), 'Unknown') AS name,
        SUM(COALESCE(gp_acc, 0)) AS target,
        SUM(CASE WHEN invoice_date IS NOT NULL AND trim(COALESCE(invoice_date::text, '')) <> '' THEN COALESCE(gp_acc, 0) ELSE 0 END) AS actual
    FROM targets_for_achievement
    GROUP BY 1
),
pqi_time_bucket AS (
    SELECT jsonb_agg(jsonb_build_object('name', bucket, 'value', bucket_count) ORDER BY sort_order) AS data
    FROM (
        VALUES
            ('Black', (SELECT count(*) FROM kpi_projects WHERE pqi_time < 1), 1),
            ('Red', (SELECT count(*) FROM kpi_projects WHERE pqi_time >= 1 AND pqi_time <= 70), 2),
            ('Yellow', (SELECT count(*) FROM kpi_projects WHERE pqi_time > 70 AND pqi_time < 91), 3),
            ('Green', (SELECT count(*) FROM kpi_projects WHERE pqi_time >= 91), 4)
    ) AS v(bucket, bucket_count, sort_order)
    WHERE bucket_count > 0
),
pqi_cost_bucket AS (
    SELECT jsonb_agg(jsonb_build_object('name', bucket, 'value', bucket_count) ORDER BY sort_order) AS data
    FROM (
        VALUES
            ('Black', (SELECT count(*) FROM kpi_projects WHERE pqi_cost < 1), 1),
            ('Red', (SELECT count(*) FROM kpi_projects WHERE pqi_cost >= 1 AND pqi_cost <= 70), 2),
            ('Yellow', (SELECT count(*) FROM kpi_projects WHERE pqi_cost > 70 AND pqi_cost < 91), 3),
            ('Green', (SELECT count(*) FROM kpi_projects WHERE pqi_cost >= 91), 4)
    ) AS v(bucket, bucket_count, sort_order)
    WHERE bucket_count > 0
),
progress_distribution AS (
    SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count) ORDER BY sort_order) AS data
    FROM (
        VALUES
            ('0–25%', (SELECT count(*) FROM kpi_projects WHERE COALESCE(percentage_progress, 0) BETWEEN 0 AND 25), 1),
            ('26–50%', (SELECT count(*) FROM kpi_projects WHERE COALESCE(percentage_progress, 0) BETWEEN 26 AND 50), 2),
            ('51–75%', (SELECT count(*) FROM kpi_projects WHERE COALESCE(percentage_progress, 0) BETWEEN 51 AND 75), 3),
            ('76–100%', (SELECT count(*) FROM kpi_projects WHERE COALESCE(percentage_progress, 0) BETWEEN 76 AND 100), 4)
    ) AS v(name, count, sort_order)
),
pm_data AS (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY value DESC, name),
        '[]'::jsonb
    ) AS data
    FROM (
        SELECT COALESCE(NULLIF(trim(project_manager), ''), 'Unknown') AS name, count(*)::int AS value
        FROM latest_projects
        GROUP BY 1
        ORDER BY value DESC, name
        LIMIT 10
    ) x
),
cat_data AS (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY value DESC, name),
        '[]'::jsonb
    ) AS data
    FROM (
        SELECT COALESCE(NULLIF(trim(project_category), ''), 'Unknown') AS name, count(*)::int AS value
        FROM latest_projects
        GROUP BY 1
        ORDER BY value DESC, name
    ) x
),
schedule_data AS (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY value DESC, name),
        '[]'::jsonb
    ) AS data
    FROM (
        SELECT COALESCE(NULLIF(trim(schedule_health), ''), 'Unknown') AS name, count(*)::int AS value
        FROM latest_projects
        GROUP BY 1
        ORDER BY value DESC, name
    ) x
),
financial_data AS (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY value DESC, name),
        '[]'::jsonb
    ) AS data
    FROM (
        SELECT COALESCE(NULLIF(trim(financial_health), ''), 'Unknown') AS name, count(*)::int AS value
        FROM latest_projects
        GROUP BY 1
        ORDER BY value DESC, name
    ) x
),
budget_ranked AS (
    SELECT
        row_number() OVER (ORDER BY COALESCE(total_budget, 0) DESC, COALESCE(project_id, '') ASC) AS rn,
        round(COALESCE(total_budget, 0) / 1000000.0)::int AS budget,
        round(COALESCE(budget_usage, 0) / 1000000.0)::int AS usage
    FROM latest_projects
    WHERE COALESCE(total_budget, 0) > 0
    ORDER BY COALESCE(total_budget, 0) DESC, COALESCE(project_id, '') ASC
    LIMIT 10
),
budget_data AS (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object('name', 'P' || rn, 'budget', budget, 'usage', usage) ORDER BY rn),
        '[]'::jsonb
    ) AS data
    FROM budget_ranked
),
am_achievement_data AS (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'name', name,
                'target', round(target / 1000000.0)::int,
                'actual', round(actual / 1000000.0)::int,
                'percent', CASE WHEN target > 0 THEN round((actual / target) * 100.0)::int ELSE 0 END
            )
            ORDER BY target DESC, name
        ),
        '[]'::jsonb
    ) AS data,
    COALESCE(SUM(target), 0) AS total_gross_profit
    FROM am_base
)
SELECT
    COALESCE((SELECT count(*)::int FROM latest_projects), 0) AS total,
    COALESCE((SELECT avg(percentage_progress) FROM kpi_projects), 0) AS avg_progress,
    COALESCE((SELECT avg(pqi_time) FROM kpi_projects), 0) AS avg_pqi_time,
    COALESCE((SELECT avg(pqi_cost) FROM kpi_projects), 0) AS avg_pqi_cost,
    COALESCE((SELECT data FROM pqi_time_bucket), '[]'::jsonb) AS pqi_time_data,
    COALESCE((SELECT data FROM pqi_cost_bucket), '[]'::jsonb) AS pqi_cost_data,
    COALESCE((SELECT data FROM schedule_data), '[]'::jsonb) AS sched_data,
    COALESCE((SELECT data FROM financial_data), '[]'::jsonb) AS fin_data,
    COALESCE((SELECT data FROM progress_distribution), '[]'::jsonb) AS progress_data,
    COALESCE((SELECT data FROM pm_data), '[]'::jsonb) AS pm_data,
    COALESCE((SELECT data FROM cat_data), '[]'::jsonb) AS cat_data,
    COALESCE((SELECT data FROM budget_data), '[]'::jsonb) AS budget_data,
    COALESCE((SELECT data FROM am_achievement_data), '[]'::jsonb) AS am_achievement_data,
    COALESCE((SELECT total_gross_profit FROM am_achievement_data), 0) AS total_gross_profit;
$$;
