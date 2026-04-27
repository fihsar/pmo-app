-- Create the project_targets table mapping to the Project Target Excel sheet
CREATE TABLE IF NOT EXISTS public.project_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_id INTEGER,
    company_name TEXT,
    project_id TEXT,
    customer TEXT,
    project_name TEXT,
    project_manager TEXT,
    account_manager TEXT,
    group_am TEXT,
    is_po TEXT,
    is_contract TEXT,
    term_of_payment_sales TEXT,
    invoice_status TEXT,
    project_category TEXT,
    project_tracking TEXT,
    total NUMERIC,
    gp_acc NUMERIC,
    net_profit_project NUMERIC,
    npp_actual NUMERIC,
    client_po_date DATE,
    invoice_number TEXT,
    invoice_date DATE,
    payment_date DATE,
    target_date DATE,
    target_invoice_r0 DATE,
    aging_invoice NUMERIC,
    count_target_change NUMERIC,
    history_update_target_date TEXT,
    last_update DATE,
    reason_update TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.project_targets ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read project targets
CREATE POLICY "Allow authenticated read access" 
ON public.project_targets FOR SELECT TO authenticated USING (true);

-- Policy to allow all authenticated users to insert project targets
CREATE POLICY "Allow authenticated insert access" 
ON public.project_targets FOR INSERT TO authenticated WITH CHECK (true);

-- Performance indexes for latest-batch and recency lookups
CREATE INDEX IF NOT EXISTS idx_project_targets_batch_number ON public.project_targets (batch_number);
CREATE INDEX IF NOT EXISTS idx_project_targets_created_at ON public.project_targets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_targets_batch_created_at ON public.project_targets (batch_number, created_at DESC);
