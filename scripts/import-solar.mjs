// Import solar monthly yield into Neon:
//  1. ensure parameter 'solar' exists (Scope 2)
//  2. insert emission_factors 2022-2026 (factor 0 = renewable generation)
//  3. upsert activity_data rows from scripts/solar-data.json
import fs from 'node:fs';
import pg from 'pg';

const env = fs.readFileSync('.env.local', 'utf8');
const m = env.match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/);
if (!m) { console.error('no DATABASE_URL'); process.exit(1); }

const data = JSON.parse(fs.readFileSync('scripts/solar-data.json', 'utf8'));
const { records } = data;
console.log(`records to import: ${records.length}`);

const client = new pg.Client({ connectionString: m[1].trim() });
await client.connect();

try {
  await client.query('BEGIN');

  // 1. parameter
  let param = await client.query('SELECT id FROM parameters WHERE slug = $1', ['solar']);
  let parameterId;
  if (param.rowCount === 0) {
    const ins = await client.query(
      `INSERT INTO parameters (scope, slug, name, input_unit, active)
       VALUES ('Scope 2', 'solar', 'Solar', 'kWh', true)
       RETURNING id`
    );
    parameterId = ins.rows[0].id;
    console.log('created parameter solar, id', parameterId);
  } else {
    parameterId = param.rows[0].id;
    console.log('parameter solar already exists, id', parameterId);
  }

  // 2. emission factors (0 = renewable generation; editable later)
  const FACTOR = 0;
  const UNIT = 'kgCO2e/kWh';
  const SOURCE = 'iSolarCloud — renewable generation';
  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    await client.query(
      `INSERT INTO emission_factors (parameter_id, year, factor, factor_unit, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (parameter_id, year)
       DO UPDATE SET factor = EXCLUDED.factor, factor_unit = EXCLUDED.factor_unit, source = EXCLUDED.source`,
      [parameterId, year, FACTOR, UNIT, SOURCE]
    );
  }
  console.log(`emission_factors set for 2022-2026 (factor ${FACTOR} ${UNIT})`);

  // 3. activity data
  const locMap = new Map();
  const locs = await client.query('SELECT id, name FROM locations');
  for (const l of locs.rows) locMap.set(l.name, l.id);

  let inserted = 0;
  for (const r of records) {
    const locationId = locMap.get(r.location);
    if (!locationId) {
      console.error(`unknown location: ${r.location}`);
      process.exit(1);
    }
    const res = await client.query(
      `INSERT INTO activity_data (parameter_id, location_id, year, month, quantity, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (parameter_id, location_id, year, month)
       DO UPDATE SET quantity = EXCLUDED.quantity, notes = EXCLUDED.notes, updated_at = NOW()`,
      [parameterId, locationId, r.year, r.month, r.quantity_kwh, 'Solar yield (iSolarCloud)']
    );
    inserted += res.rowCount;
  }

  await client.query('COMMIT');
  console.log(`committed: ${inserted} activity rows`);

  // summary
  const sum = await client.query(
    `SELECT l.name AS location, a.year, ROUND(SUM(a.quantity)::numeric, 0) AS total_kwh
     FROM activity_data a
     JOIN parameters p ON p.id = a.parameter_id
     JOIN locations l ON l.id = a.location_id
     WHERE p.slug = 'solar'
     GROUP BY l.name, a.year
     ORDER BY l.name, a.year`
  );
  console.log('\n=== solar totals (kWh) ===');
  for (const s of sum.rows) console.log(`  ${s.location} ${s.year}: ${s.total_kwh}`);
} catch (e) {
  await client.query('ROLLBACK');
  console.error('IMPORT FAILED:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
