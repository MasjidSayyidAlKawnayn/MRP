import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Set it to your Neon/Postgres connection string before running this seed.",
  );
}

const sqlPath = join(process.cwd(), "sql", "import_csv_attendance.sql");
const sql = readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query(sql);

  const { rows } = await client.query(`
    SELECT
      (SELECT count(*)::int FROM mqs.attendance_sessions WHERE deleted_at IS NULL) AS attendance_sessions,
      (SELECT count(*)::int FROM mqs.attendance_records WHERE deleted_at IS NULL) AS attendance_records,
      (SELECT count(*)::int FROM mqs.groups WHERE name = 'Unassigned' AND deleted_at IS NULL) AS unassigned_groups
  `);

  console.log(JSON.stringify(rows[0], null, 2));
} finally {
  await client.end();
}
