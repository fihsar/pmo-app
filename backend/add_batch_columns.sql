-- Add batch_number and upload_date to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS batch_number INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add batch_number and upload_date to project_targets table
ALTER TABLE project_targets ADD COLUMN IF NOT EXISTS batch_number INTEGER DEFAULT 1;
ALTER TABLE project_targets ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add batch_number and upload_date to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS batch_number INTEGER DEFAULT 1;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
