-- CAUTION: This script will delete ALL data from the main tables.
-- Use this only when you want to start fresh with new Excel uploads.

TRUNCATE TABLE public.projects, public.prospects, public.project_targets RESTART IDENTITY;

-- Optional: Verify the tables are empty
-- SELECT count(*) FROM projects;
-- SELECT count(*) FROM prospects;
-- SELECT count(*) FROM project_targets;
