-- =========================================================
-- EMISSION FACTOR REVISION HISTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS emission_factor_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    emission_factor_id UUID NOT NULL
        REFERENCES emission_factors(id)
        ON DELETE CASCADE,

    old_factor NUMERIC NOT NULL,
    new_factor NUMERIC NOT NULL,

    old_factor_unit TEXT NOT NULL,
    new_factor_unit TEXT NOT NULL,

    old_source TEXT,
    new_source TEXT,

    reason TEXT NOT NULL,

    changed_by TEXT,

    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factor_revisions_factor
    ON emission_factor_revisions(emission_factor_id);

CREATE INDEX IF NOT EXISTS idx_factor_revisions_changed_at
    ON emission_factor_revisions(changed_at);
