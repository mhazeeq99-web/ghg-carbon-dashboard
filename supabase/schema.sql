CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- PARAMETERS
-- =========================================================

CREATE TABLE IF NOT EXISTS parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    scope TEXT NOT NULL
        CHECK (scope IN ('Scope 1', 'Scope 2')),

    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,

    -- Unit entered by the user
    input_unit TEXT NOT NULL,

    -- Optional conversion for parameters such as LPG.
    -- Example:
    -- LPG 14kg = 14 kg per cylinder
    conversion_factor NUMERIC,

    conversion_unit TEXT,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- LOCATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT UNIQUE NOT NULL,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- EMISSION FACTORS
-- =========================================================

CREATE TABLE IF NOT EXISTS emission_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parameter_id UUID NOT NULL
        REFERENCES parameters(id)
        ON DELETE CASCADE,

    year INTEGER NOT NULL,

    factor NUMERIC NOT NULL,

    factor_unit TEXT NOT NULL,

    source TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(parameter_id, year)
);


-- =========================================================
-- ACTIVITY DATA
-- =========================================================

CREATE TABLE IF NOT EXISTS activity_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parameter_id UUID NOT NULL
        REFERENCES parameters(id)
        ON DELETE CASCADE,

    location_id UUID NOT NULL
        REFERENCES locations(id)
        ON DELETE RESTRICT,

    year INTEGER NOT NULL,

    month INTEGER NOT NULL
        CHECK (month BETWEEN 1 AND 12),

    quantity NUMERIC NOT NULL DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(parameter_id, location_id, year, month)
);


-- =========================================================
-- PARAMETERS
-- =========================================================

INSERT INTO parameters
    (scope, slug, name, input_unit, conversion_factor, conversion_unit)
VALUES
    ('Scope 1', 'lpg-14kg', 'LPG 14kg', 'cylinder', 14, 'kg/cylinder'),

    ('Scope 1', 'lpg-50kg', 'LPG 50kg', 'cylinder', 50, 'kg/cylinder'),

    ('Scope 1', 'diesel', 'Diesel', 'L', NULL, NULL),

    ('Scope 1', 'petrol', 'Petrol', 'L', NULL, NULL),

    ('Scope 2', 'electricity', 'Electricity', 'kWh', NULL, NULL)

ON CONFLICT (slug) DO NOTHING;


-- =========================================================
-- LOCATIONS
-- =========================================================

INSERT INTO locations (name)
VALUES
    ('Tago'),
    ('KIP')

ON CONFLICT (name) DO NOTHING;


-- =========================================================
-- EMISSION FACTORS
-- =========================================================

-- LPG
-- 1.49 kgCO2e/kg

INSERT INTO emission_factors
    (parameter_id, year, factor, factor_unit, source)

SELECT
    p.id,
    y.year,
    1.49,
    'kgCO2e/kg',
    'Existing GHG workbook'
FROM parameters p
CROSS JOIN (
    VALUES (2022), (2023), (2024), (2025), (2026)
) AS y(year)
WHERE p.slug IN ('lpg-14kg', 'lpg-50kg')

ON CONFLICT (parameter_id, year) DO NOTHING;


-- Diesel
-- 2022-2025: 2.653 kgCO2e/L
-- 2026:       2.70533 kgCO2e/L

INSERT INTO emission_factors
    (parameter_id, year, factor, factor_unit, source)

SELECT
    p.id,
    y.year,
    CASE
        WHEN y.year = 2026 THEN 2.70533
        ELSE 2.653
    END,
    'kgCO2e/L',
    'Existing GHG workbook'
FROM parameters p
CROSS JOIN (
    VALUES (2022), (2023), (2024), (2025), (2026)
) AS y(year)
WHERE p.slug = 'diesel'

ON CONFLICT (parameter_id, year) DO NOTHING;


-- Petrol
-- 2022-2025: 2.300 kgCO2e/L
-- 2026:       2.33969 kgCO2e/L

INSERT INTO emission_factors
    (parameter_id, year, factor, factor_unit, source)

SELECT
    p.id,
    y.year,
    CASE
        WHEN y.year = 2026 THEN 2.33969
        ELSE 2.300
    END,
    'kgCO2e/L',
    'Existing GHG workbook'
FROM parameters p
CROSS JOIN (
    VALUES (2022), (2023), (2024), (2025), (2026)
) AS y(year)
WHERE p.slug = 'petrol'

ON CONFLICT (parameter_id, year) DO NOTHING;


-- Electricity
-- 2022: 0.769 kgCO2e/kWh
-- 2023: 0.760 kgCO2e/kWh
-- 2024-2026: 0.740 kgCO2e/kWh

INSERT INTO emission_factors
    (parameter_id, year, factor, factor_unit, source)

SELECT
    p.id,
    y.year,
    CASE
        WHEN y.year = 2022 THEN 0.769
        WHEN y.year = 2023 THEN 0.760
        ELSE 0.740
    END,
    'kgCO2e/kWh',
    'Existing GHG workbook'
FROM parameters p
CROSS JOIN (
    VALUES (2022), (2023), (2024), (2025), (2026)
) AS y(year)
WHERE p.slug = 'electricity'

ON CONFLICT (parameter_id, year) DO NOTHING;


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_activity_parameter
    ON activity_data(parameter_id);

CREATE INDEX IF NOT EXISTS idx_activity_year_month
    ON activity_data(year, month);

CREATE INDEX IF NOT EXISTS idx_activity_location
    ON activity_data(location_id);

CREATE INDEX IF NOT EXISTS idx_factors_parameter_year
    ON emission_factors(parameter_id, year);
