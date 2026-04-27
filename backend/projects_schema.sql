-- Drop the existing table if you need to recreate it with the new schema (WARNING: THIS DELETES ALL DATA)
-- DROP TABLE IF EXISTS public.projects;

-- Create the complete projects table mapping to the 55-column Excel sheet
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id TEXT,
    customer TEXT,
    project_name TEXT,
    project_reference TEXT,
    project_manager TEXT,
    account_manager TEXT,
    pcs_status TEXT,
    project_category TEXT,
    client_po_date DATE,
    contract_date DATE,
    first_issued_date DATE,
    project_start_date DATE,
    project_end_date DATE,
    golive_date DATE,
    actual_golive_date DATE,
    warranty_end_date DATE,
    actual_warranty_end_date DATE,
    maintenance_end_date DATE,
    main_delivery_team TEXT,
    pqi_time NUMERIC,
    pqi_time_r_0 NUMERIC,
    pqi_cost NUMERIC,
    pqi_cost_r_0 NUMERIC,
    pqi NUMERIC,
    pqi_r0 NUMERIC,
    schedule_health TEXT,
    financial_health TEXT,
    total_sales NUMERIC,
    gross_profit NUMERIC,
    npp NUMERIC,
    npp_actual NUMERIC,
    budget_by_progress NUMERIC,
    total_budget NUMERIC,
    budget_usage NUMERIC,
    variance_budget_usage NUMERIC,
    modified_date DATE,
    progress_date DATE,
    percentage_progress NUMERIC,
    current_stage TEXT,
    progress_note TEXT,
    sales_osl NUMERIC,
    sales_3sw NUMERIC,
    sales_3sv NUMERIC,
    sales_3hw NUMERIC,
    sales_osv_osl NUMERIC,
    sales_osv_nonosl NUMERIC,
    sales_need_invoice_as_june_2020 NUMERIC,
    gp_osl NUMERIC,
    gp_3sw NUMERIC,
    gp_3sv NUMERIC,
    gp_3hw NUMERIC,
    gp_osv_osl NUMERIC,
    gp_osv_nonosl NUMERIC,
    gp_need_invoice_as_june_2020 NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read projects
CREATE POLICY "Allow authenticated read access" 
ON public.projects FOR SELECT TO authenticated USING (true);

-- Policy to allow all authenticated users to insert projects
CREATE POLICY "Allow authenticated insert access" 
ON public.projects FOR INSERT TO authenticated WITH CHECK (true);

-- Performance indexes for latest-batch and recency lookups
CREATE INDEX IF NOT EXISTS idx_projects_batch_number ON public.projects (batch_number);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_batch_created_at ON public.projects (batch_number, created_at DESC);
