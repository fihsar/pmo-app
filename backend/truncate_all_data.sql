-- CAUTION: This script will delete ALL data from the main tables.
-- Use this only when you want to start fresh with new Excel uploads.

DO $$
DECLARE
	table_list text;
BEGIN
	-- Select all tables in public schema EXCEPT for profiles
	SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
	INTO table_list
	FROM pg_tables
	WHERE schemaname = 'public'
	AND tablename NOT IN ('profiles'); -- Exclude profiles to keep user metadata

	IF table_list IS NOT NULL THEN
		RAISE NOTICE 'Truncating tables: %', table_list;
		EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
		
		-- Ensure batch_metadata is reset to 0 if it exists
		IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'batch_metadata') THEN
			UPDATE public.batch_metadata SET latest_batch = 0, updated_at = now();
			RAISE NOTICE 'Reset batch_metadata counters to 0';
		END IF;
	ELSE
		RAISE NOTICE 'No tables found to truncate.';
	END IF;
END $$;

-- Verify row counts after truncate
SELECT relname AS tablename, n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

