-- Create the prospects table mapping to the Report_Prospect_CL Excel sheet
CREATE TABLE IF NOT EXISTS public.prospects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_top_sales NUMERIC,
    am_name TEXT,
    company_name TEXT,
    directorat TEXT,
    group_name TEXT,
    id_project TEXT,
    id_prospect_status NUMERIC,
    prospect_name TEXT,
    client_name TEXT,
    status TEXT,
    term_of_payment TEXT,
    amount NUMERIC,
    gp NUMERIC,
    amount_cl NUMERIC,
    gp_cl NUMERIC,
    est_prospect_close_date DATE,
    target_date DATE,
    confidence_level NUMERIC,
    osv_non_osl NUMERIC,
    opr_del NUMERIC,
    batch_number INTEGER DEFAULT 1,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read prospects
CREATE POLICY "Allow authenticated read access" 
ON public.prospects FOR SELECT TO authenticated USING (true);

-- Policy to allow all authenticated users to insert prospects
CREATE POLICY "Allow authenticated insert access" 
ON public.prospects FOR INSERT TO authenticated WITH CHECK (true);

-- Policy to allow all authenticated users to update prospects
CREATE POLICY "Allow authenticated update access" 
ON public.prospects FOR UPDATE TO authenticated USING (true);

-- Policy to allow all authenticated users to delete prospects
CREATE POLICY "Allow authenticated delete access" 
ON public.prospects FOR DELETE TO authenticated USING (true);

-- Performance indexes for latest-batch and recency lookups
CREATE INDEX IF NOT EXISTS idx_prospects_batch_number ON public.prospects (batch_number);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON public.prospects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_batch_created_at ON public.prospects (batch_number, created_at DESC);
