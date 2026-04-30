-- Migration 005: Replace permissive USING (true) RLS policies with role-based ones.
--
-- Current state: every table uses USING (true) → any authenticated user can
-- read, insert, update, or delete the entire portfolio from the browser.
--
-- After this migration:
--   SELECT  → all authenticated roles (nothing changes for reads)
--   INSERT  → Superadmin / Project Manager / Project Administrator only
--             (except prospects — Account Managers upload their own pipeline)
--   UPDATE  → same as INSERT; project_targets UPDATE is open to all auth
--             because Account Managers update backlog row status in the UI
--   DELETE  → Superadmin only (data tables); Superadmin + PA (prospects)
--
-- The RPCs all use SECURITY DEFINER so they bypass RLS and are unaffected.
-- The admin client (service-role key) bypasses RLS and is unaffected.

-- ── Helper: look up the calling user's role ───────────────────────────────────
-- STABLE allows Postgres to cache this within a single statement so a
-- bulk-insert of 1000 rows evaluates it once, not 1000 times.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- ── projects ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated read access"   ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.projects;

CREATE POLICY "projects_select"
  ON public.projects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('Superadmin', 'Project Manager', 'Project Administrator')
  );

CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('Superadmin', 'Project Manager', 'Project Administrator')
  )
  WITH CHECK (
    public.get_my_role() IN ('Superadmin', 'Project Manager', 'Project Administrator')
  );

CREATE POLICY "projects_delete"
  ON public.projects FOR DELETE TO authenticated
  USING (public.get_my_role() = 'Superadmin');

-- ── project_targets (Backlog) ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated read access"   ON public.project_targets;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.project_targets;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.project_targets;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.project_targets;

CREATE POLICY "project_targets_select"
  ON public.project_targets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "project_targets_insert"
  ON public.project_targets FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('Superadmin', 'Project Manager', 'Project Administrator')
  );

-- UPDATE is open to all authenticated roles: Account Managers set row status
-- in the Backlog UI without needing elevated permissions.
CREATE POLICY "project_targets_update"
  ON public.project_targets FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "project_targets_delete"
  ON public.project_targets FOR DELETE TO authenticated
  USING (public.get_my_role() = 'Superadmin');

-- ── prospects ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated read access"   ON public.prospects;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.prospects;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.prospects;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.prospects;

CREATE POLICY "prospects_select"
  ON public.prospects FOR SELECT TO authenticated
  USING (true);

-- Account Managers upload their own prospect pipeline, so INSERT is open
-- to all authenticated users (matching the existing UI access).
CREATE POLICY "prospects_insert"
  ON public.prospects FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "prospects_update"
  ON public.prospects FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only Superadmin and Project Administrator can delete prospect batches.
CREATE POLICY "prospects_delete"
  ON public.prospects FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('Superadmin', 'Project Administrator')
  );

-- ── profiles ───────────────────────────────────────────────────────────────────
-- profiles may not have RLS enabled yet; ensure it is.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
-- Also drop any legacy names
DROP POLICY IF EXISTS "Allow authenticated read access"   ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.profiles;

-- Users can see their own profile; Superadmin can see all.
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_my_role() = 'Superadmin'
  );

-- Users can update their own profile; Superadmin can update any.
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_my_role() = 'Superadmin'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.get_my_role() = 'Superadmin'
  );

-- Only Superadmin can create or delete profile rows directly.
-- (Normal profile creation happens via an auth trigger or the admin API.)
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'Superadmin');

CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.get_my_role() = 'Superadmin');
