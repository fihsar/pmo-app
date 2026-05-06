-- Migration 010: Restrict project_targets UPDATE to status-only for non-admin roles.
-- Uses a BEFORE UPDATE trigger because PostgreSQL RLS does not support
-- column-level restrictions in UPDATE policies natively.

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

  -- Admin roles (Superadmin, Project Administrator) may update any column.
  IF v_role IN ('Superadmin', 'Project Administrator') THEN
    RETURN NEW;
  END IF;

  -- Non-admin roles: only the status column may change.
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
    NEW.created_at                  IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION
      'Permission denied: non-admin roles may only update the status column on project_targets'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_targets_column_scope ON public.project_targets;

CREATE TRIGGER trg_project_targets_column_scope
  BEFORE UPDATE ON public.project_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_project_targets_column_scope();
