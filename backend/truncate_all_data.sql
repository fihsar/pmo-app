-- DANGER: Wrapping the truncate in a function that requires an explicit
-- confirmation token and a Superadmin role. Running this file directly
-- no longer does anything — you must CALL the function with the token.
--
-- Usage (from SQL Editor, Superadmin only):
--   SELECT public.truncate_all_data('I_CONFIRM_DELETE_ALL');

CREATE OR REPLACE FUNCTION public.truncate_all_data(confirmation_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    table_list TEXT;
BEGIN
    -- Check role
    SELECT role INTO v_role FROM public.profiles WHERE user_id = auth.uid();
    IF v_role IS DISTINCT FROM 'Superadmin' THEN
        RAISE EXCEPTION 'Permission denied: Superadmin role required.';
    END IF;

    -- Require explicit token so a stray script execution doesn't wipe the DB
    IF confirmation_token IS DISTINCT FROM 'I_CONFIRM_DELETE_ALL' THEN
        RAISE EXCEPTION 'Wrong confirmation token. Pass the literal string I_CONFIRM_DELETE_ALL to proceed.';
    END IF;

    SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO table_list
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('profiles', 'business_rules', 'audit_log', 'batch_metadata');

    IF table_list IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
        UPDATE public.batch_metadata SET latest_batch = 0, updated_at = now();
        RETURN 'Truncated: ' || table_list;
    ELSE
        RETURN 'No tables found to truncate.';
    END IF;
END;
$$;

-- Revoke direct execute from the public/authenticated role;
-- only Superadmin can call this via the role check inside.
REVOKE EXECUTE ON FUNCTION public.truncate_all_data(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.truncate_all_data(TEXT) FROM authenticated;
