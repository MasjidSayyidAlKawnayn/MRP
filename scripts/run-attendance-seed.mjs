import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
const courseSlug =
  process.env.COURSE_SLUG ??
  process.argv.find((argument) => argument.startsWith("--course-slug="))?.split("=")[1] ??
  (() => {
    const index = process.argv.indexOf("--course-slug");
    return index >= 0 ? process.argv[index + 1] : undefined;
  })();

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Set it to your Neon/Postgres connection string before running this seed.",
  );
}

if (!courseSlug) {
  throw new Error("COURSE_SLUG or --course-slug is required before running the attendance seed.");
}

const sqlPath = join(process.cwd(), "sql", "import_csv_attendance.sql");
const sql = readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query(sql);

  const { rows } = await client.query(`
    WITH target_course AS (
      SELECT id
      FROM mqs.courses
      WHERE slug = $1
        AND deleted_at IS NULL
    )
    SELECT
      (SELECT count(*)::int FROM mqs.attendance_sessions WHERE course_id = (SELECT id FROM target_course) AND deleted_at IS NULL) AS attendance_sessions,
      (SELECT count(*)::int FROM mqs.attendance_records WHERE course_id = (SELECT id FROM target_course) AND deleted_at IS NULL) AS attendance_records,
      (SELECT count(*)::int FROM mqs.groups WHERE course_id = (SELECT id FROM target_course) AND name = 'Unassigned' AND deleted_at IS NULL) AS unassigned_groups
  `, [courseSlug]);

  console.log(JSON.stringify(rows[0], null, 2));
} finally {
  await client.end();
}
