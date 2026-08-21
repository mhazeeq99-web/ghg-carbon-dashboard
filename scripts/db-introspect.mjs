// Clean parameter schema + rows.
import fs from 'node:fs';
import pg from 'pg';

const env = fs.readFileSync('.env.local', 'utf8');
const m = env.match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/);
const client = new pg.Client({ connectionString: m?.[1]?.trim() });
await client.connect();

const cols = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'parameters' ORDER BY ordinal_position`
);
console.log('parameters columns:', cols.rows.map((r) => r.column_name).join(', '));

const rows = await client.query('SELECT * FROM parameters ORDER BY scope, name');
console.log('\nrows:');
for (const r of rows.rows) console.log(' ', JSON.stringify(r));

await client.end();
