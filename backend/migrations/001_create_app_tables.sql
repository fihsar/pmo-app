-- Migration 001: Create audit_log and business_rules tables.
-- Replaces the filesystem-based JSON store (local-json-store.server.ts)
-- which is unreliable on Vercel's read-only runtime filesystem.

-- ── audit_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type         TEXT        NOT NULL,
    action       TEXT        NOT NULL,
    actor_email  TEXT,
    actor_role   TEXT,
    target_type  TEXT        NOT NULL,
    target_label TEXT        NOT NULL,
    metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Only server-side admin operations should write; authenticated users can read
-- their own audit trail via the admin client (bypasses RLS entirely).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- No direct client access — all reads/writes go through the service-role key.
-- (Deny all by default; the admin client bypasses RLS.)

-- Fast lookup for the activity-log page (latest first, filterable by type)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
    ON public.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_type_created_at
    ON public.audit_log (type, created_at DESC);

-- ── business_rules ───────────────────────────────────────────────────────────
-- Single-row config table (enforced by the CHECK constraint on id = 1).
CREATE TABLE IF NOT EXISTS public.business_rules (
    id         INTEGER     PRIMARY KEY DEFAULT 1,
    rules      JSONB       NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

-- Seed with the application defaults if the row doesn't exist yet.
-- The full JSON object mirrors defaultBusinessRules in business-rules.shared.ts.
INSERT INTO public.business_rules (id, rules)
VALUES (1, '{
  "targetGrossProfit": 36000000000,
  "allowedAccountManagers": [
    "Andrew Daniel Gunalan",
    "Elsa Yolanda Simanjuntak",
    "Graeta Venato",
    "Lizty Latifah",
    "M. Satria Manggala Yudha",
    "Merlin",
    "Pandu R Akbar"
  ],
  "kpiProjectManagers": [
    "yohanes ivan enda",
    "khoirul tasya",
    "mahendra gati",
    "tasya tamaraputri"
  ],
  "keywordRules": {
    "strictFccKeywords": [],
    "strictCssKeywords": [],
    "fccKeywords": [],
    "cssKeywords": []
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
