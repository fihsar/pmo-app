-- Migration 000: Full baseline schema for a fresh database.
-- Run this once on a new Supabase project, then apply 001–004 in order.
-- Existing databases that have already run the patch files individually can skip this.

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── projects ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  TEXT,
    customer                    TEXT,
    project_name                TEXT,
    project_reference           TEXT,
    project_manager             TEXT,
    account_manager             TEXT,
    pcs_status                  TEXT,
    project_category            TEXT,
    client_po_date              DATE,
    contract_date               DATE,
    first_issued_date           DATE,
    project_start_date          DATE,
    project_end_date            DATE,
    golive_date                 DATE,
    actual_golive_date          DATE,
    warranty_end_date           DATE,
    actual_warranty_end_date    DATE,
    maintenance_end_date        DATE,
    main_delivery_team          TEXT,
    pqi_time                    NUMERIC,
    pqi_time_r_0                NUMERIC,
    pqi_cost                    NUMERIC,
    pqi_cost_r_0                NUMERIC,
    pqi                         NUMERIC,
    pqi_r0                      NUMERIC,
    schedule_health             TEXT,
    financial_health            TEXT,
    total_sales                 NUMERIC,
    gross_profit                NUMERIC,
    npp                         NUMERIC,
    npp_actual                  NUMERIC,
    budget_by_progress          NUMERIC,
    total_budget                NUMERIC,
    budget_usage                NUMERIC,
    variance_budget_usage       NUMERIC,
    modified_date               DATE,
    progress_date               DATE,
    percentage_progress         NUMERIC,
    current_stage               TEXT,
    progress_note               TEXT,
    sales_osl                   NUMERIC,
    sales_3sw                   NUMERIC,
    sales_3sv                   NUMERIC,
    sales_3hw                   NUMERIC,
    sales_osv_osl               NUMERIC,
    sales_osv_nonosl            NUMERIC,
    sales_need_invoice_as_june_2020 NUMERIC,
    gp_osl                      NUMERIC,
    gp_3sw                      NUMERIC,
    gp_3sv                      NUMERIC,
    gp_3hw                      NUMERIC,
    gp_osv_osl                  NUMERIC,
    gp_osv_nonosl               NUMERIC,
    gp_need_invoice_as_june_2020 NUMERIC,
    -- patch: add_batch_columns.sql
    batch_number                INTEGER DEFAULT 1,
    upload_date                 TIMESTAMPTZ DEFAULT timezone('utc', now()),
    -- patch: add_classification_columns.sql
    category                    TEXT,
    category_note               TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access"   ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert access" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_projects_batch_number    ON public.projects (batch_number);
CREATE INDEX IF NOT EXISTS idx_projects_created_at      ON public.projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_batch_created_at ON public.projects (batch_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category        ON public.projects (category);

-- ── project_targets (Backlog) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_targets (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id                   INTEGER,
    company_name                TEXT,
    project_id                  TEXT,
    customer                    TEXT,
    project_name                TEXT,
    project_manager             TEXT,
    account_manager             TEXT,
    group_am                    TEXT,
    is_po                       TEXT,
    is_contract                 TEXT,
    term_of_payment_sales       TEXT,
    invoice_status              TEXT,
    project_category            TEXT,
    project_tracking            TEXT,
    total                       NUMERIC,
    gp_acc                      NUMERIC,
    net_profit_project          NUMERIC,
    npp_actual                  NUMERIC,
    client_po_date              DATE,
    invoice_number              TEXT,
    invoice_date                DATE,
    payment_date                DATE,
    target_date                 DATE,
    target_invoice_r0           DATE,
    aging_invoice               NUMERIC,
    count_target_change         NUMERIC,
    history_update_target_date  TEXT,
    last_update                 DATE,
    reason_update               TEXT,
    -- patch: add_batch_columns.sql
    batch_number                INTEGER DEFAULT 1,
    upload_date                 TIMESTAMPTZ DEFAULT timezone('utc', now()),
    -- patch: add_category_columns.sql + add_classification_columns.sql
    category                    TEXT,
    category_note               TEXT,
    -- patch: fix_backlog_status.sql
    status                      TEXT DEFAULT 'On Track',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.project_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access"   ON public.project_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert access" ON public.project_targets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update access" ON public.project_targets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_project_targets_batch_number     ON public.project_targets (batch_number);
CREATE INDEX IF NOT EXISTS idx_project_targets_created_at       ON public.project_targets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_targets_batch_created_at ON public.project_targets (batch_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_targets_category         ON public.project_targets (category);

-- ── prospects ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prospects (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    id_top_sales            NUMERIC,
    am_name                 TEXT,
    company_name            TEXT,
    directorat              TEXT,
    group_name              TEXT,
    id_project              TEXT,
    id_prospect_status      NUMERIC,
    prospect_name           TEXT,
    client_name             TEXT,
    status                  TEXT,
    term_of_payment         TEXT,
    amount                  NUMERIC,
    gp                      NUMERIC,
    amount_cl               NUMERIC,
    gp_cl                   NUMERIC,
    est_prospect_close_date DATE,
    target_date             DATE,
    confidence_level        NUMERIC,
    osv_non_osl             NUMERIC,
    opr_del                 NUMERIC,
    -- patch: add_batch_columns.sql
    batch_number            INTEGER DEFAULT 1,
    upload_date             TIMESTAMPTZ DEFAULT timezone('utc', now()),
    -- patch: add_classification_columns.sql
    category                TEXT,
    category_note           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access"   ON public.prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert access" ON public.prospects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update access" ON public.prospects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete access" ON public.prospects FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_prospects_batch_number    ON public.prospects (batch_number);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at      ON public.prospects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_batch_created_at ON public.prospects (batch_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_am_name         ON public.prospects (am_name);
CREATE INDEX IF NOT EXISTS idx_prospects_target_date     ON public.prospects (target_date);
CREATE INDEX IF NOT EXISTS idx_prospects_category        ON public.prospects (category);
CREATE INDEX IF NOT EXISTS idx_prospects_name_trgm  ON public.prospects USING gin (prospect_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prospects_client_trgm ON public.prospects USING gin (client_name gin_trgm_ops);

-- ── profiles ───────────────────────────────────────────────────────────────────
-- (Managed by Supabase Auth; included here for reference only.)
-- CREATE TABLE IF NOT EXISTS public.profiles ( ... );
