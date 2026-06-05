import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const migrationFiles = [
  "course_isolation.sql",
  "cohort_cycles.sql",
  "group_color_codes.sql",
  "points_and_page_tracking.sql",
  "student_registration_fields.sql",
  "student_school_year_integer.sql",
  "student_primary_parent_phone.sql",
  "fix_attendance_rls.sql",
  "fix_cohort_rls.sql",
  "secure_admin_rls.sql",
  "user_onboarding_state.sql",
];

const databaseUrl = process.env.DATABASE_URL;
const onlyFile =
  process.argv.find((argument) => argument.startsWith("--only="))?.split("=")[1] ??
  (() => {
    const index = process.argv.indexOf("--only");
    return index >= 0 ? process.argv[index + 1] : undefined;
  })();

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Set it to your Neon/Postgres connection string before running migrations.",
  );
}

const selectedFiles = onlyFile ? [onlyFile] : migrationFiles;
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();

try {
  for (const fileName of selectedFiles) {
    const sqlPath = join(process.cwd(), "sql", fileName);
    const sql = readFileSync(sqlPath, "utf8");

    console.log(`Running ${fileName}`);
    await client.query(sql);
  }

  console.log(
    JSON.stringify(
      {
        database: "migrated",
        files: selectedFiles,
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
