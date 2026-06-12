-- Migration 013: Rename CSS-specific subcategory storage to generic subcategory.
--
-- This is intentionally additive for existing databases:
-- - If the earlier css_subcategory column exists, copy its values into subcategory.
-- - Keep css_subcategory in place to avoid destructive schema changes.
-- - The application now reads and writes subcategory.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

ALTER TABLE public.project_targets
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'css_subcategory'
  ) THEN
    EXECUTE 'UPDATE public.projects SET subcategory = COALESCE(subcategory, css_subcategory)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prospects' AND column_name = 'css_subcategory'
  ) THEN
    EXECUTE 'UPDATE public.prospects SET subcategory = COALESCE(subcategory, css_subcategory)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_targets' AND column_name = 'css_subcategory'
  ) THEN
    EXECUTE 'UPDATE public.project_targets SET subcategory = COALESCE(subcategory, css_subcategory)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_subcategory
  ON public.projects (subcategory);

CREATE INDEX IF NOT EXISTS idx_prospects_subcategory
  ON public.prospects (subcategory);

CREATE INDEX IF NOT EXISTS idx_project_targets_subcategory
  ON public.project_targets (subcategory);

CREATE OR REPLACE FUNCTION public.enforce_project_targets_column_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.get_my_role();

  IF v_role IN ('Superadmin', 'Project Administrator') THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.id                          IS DISTINCT FROM OLD.id OR
    NEW.target_id                   IS DISTINCT FROM OLD.target_id OR
    NEW.batch_number                IS DISTINCT FROM OLD.batch_number OR
    NEW.project_id                  IS DISTINCT FROM OLD.project_id OR
    NEW.customer                    IS DISTINCT FROM OLD.customer OR
    NEW.project_name                IS DISTINCT FROM OLD.project_name OR
    NEW.project_manager             IS DISTINCT FROM OLD.project_manager OR
    NEW.account_manager             IS DISTINCT FROM OLD.account_manager OR
    NEW.total                       IS DISTINCT FROM OLD.total OR
    NEW.gp_acc                      IS DISTINCT FROM OLD.gp_acc OR
    NEW.net_profit_project          IS DISTINCT FROM OLD.net_profit_project OR
    NEW.npp_actual                  IS DISTINCT FROM OLD.npp_actual OR
    NEW.invoice_date                IS DISTINCT FROM OLD.invoice_date OR
    NEW.payment_date                IS DISTINCT FROM OLD.payment_date OR
    NEW.target_date                 IS DISTINCT FROM OLD.target_date OR
    NEW.category                    IS DISTINCT FROM OLD.category OR
    NEW.category_note               IS DISTINCT FROM OLD.category_note OR
    NEW.subcategory                 IS DISTINCT FROM OLD.subcategory OR
    NEW.created_at                  IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION
      'Permission denied: non-admin roles may only update the status column on project_targets'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
