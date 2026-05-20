import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const schema = "mqs";
const courseSlug =
  process.env.COURSE_SLUG ??
  process.argv.find((argument) => argument.startsWith("--course-slug="))?.split("=")[1] ??
  (() => {
    const index = process.argv.indexOf("--course-slug");
    return index >= 0 ? process.argv[index + 1] : undefined;
  })();
const requestedCsvFileName = process.env.CSV_FILE_NAME;
const csvFileName = (() => {
  const csvFiles = readdirSync(process.cwd()).filter((fileName) =>
    fileName.endsWith(".csv"),
  );
  if (requestedCsvFileName) {
    return csvFiles.find((fileName) => fileName === requestedCsvFileName) ?? "";
  }
  if (courseSlug) {
    const bySlug = csvFiles.find((fileName) =>
      fileName.toLowerCase().includes(courseSlug.toLowerCase()),
    );
    if (bySlug) return bySlug;
  }
  return csvFiles[0] ?? "";
})();
const csvPath = join(process.cwd(), csvFileName);
const outputPath = join(process.cwd(), "sql", "import_csv_attendance.sql");

const STATUS_BY_CELL = new Map([
  ["حاضر", "present"],
  ["تأخير", "late"],
  ["TRUE", "present"],
  ["True", "present"],
  ["true", "present"],
]);
const EMPTY_ATTENDANCE_VALUES = new Set(["FALSE", "False", "false"]);
const UNASSIGNED_GROUP = "Unassigned";
const ATTENDANCE_START_INDEX = 11;
const scopedGroupName = (groupName) => `${groupName} [${courseSlug}]`;

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  return Number.isFinite(value) ? String(value) : "NULL";
}

function sqlValues(rows) {
  return rows.map((row) => `  (${row.join(", ")})`).join(",\n");
}

function parseSession(header, occurrences) {
  const normalized = String(header).trim();
  const isoLikeMatch = /^(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})(?:\s|T|$)/.exec(
    normalized,
  );
  if (isoLikeMatch?.groups) {
    const year = Number(isoLikeMatch.groups.year);
    const month = Number(isoLikeMatch.groups.month);
    const dayOfMonth = Number(isoLikeMatch.groups.day);
    const date = `${year}-${String(month).padStart(2, "0")}-${String(
      dayOfMonth,
    ).padStart(2, "0")}`;
    const occurrenceKey = date;
    const sequence = (occurrences.get(occurrenceKey) ?? 0) + 1;
    occurrences.set(occurrenceKey, sequence);
    return {
      date,
      label: normalized,
      sequence,
    };
  }

  const match =
    /^(?<day>[A-Za-z]{3}) (?<dayOfMonth>\d{1,2})\/(?<month>\d{1,2})$/.exec(
      normalized,
    );

  if (!match?.groups) {
    throw new Error(`Could not parse attendance header: ${header}`);
  }

  const dayOfMonth = Number(match.groups.dayOfMonth);
  const month = Number(match.groups.month);
  const year = month >= 6 ? 2025 : 2026;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(
    dayOfMonth,
  ).padStart(2, "0")}`;
  const occurrenceKey = date;
  const sequence = (occurrences.get(occurrenceKey) ?? 0) + 1;
  occurrences.set(occurrenceKey, sequence);

  return { date, label: normalized, sequence };
}

function normalizePhone(value) {
  return value.trim().replace(/\s*\n\s*/g, " / ");
}

function fitPhone(value) {
  const normalized = normalizePhone(value);

  if (normalized.length <= 20) {
    return normalized;
  }

  return (
    normalized
      .split(/\s*(?:\/|،|,)\s*/)
      .map((part) => part.trim())
      .find((part) => part.length > 0 && part.length <= 20) ?? ""
  );
}

function normalizeNamePart(value, fallback) {
  const normalized = value.trim();
  return normalized || fallback;
}

if (!csvFileName) {
  throw new Error("No CSV file found in the repository root.");
}

if (!courseSlug) {
  throw new Error("COURSE_SLUG or --course-slug is required for attendance imports.");
}

const csvRows = parseCsv(readFileSync(csvPath, "utf8"));
const [headers, ...rawRows] = csvRows;

if (!headers || headers.length <= ATTENDANCE_START_INDEX) {
  throw new Error("CSV does not contain the expected attendance columns.");
}

const malformedRows = rawRows
  .map((row, index) => ({ row, line: index + 2 }))
  .filter(({ row }) => row.length !== headers.length);

if (malformedRows.length > 0) {
  throw new Error(
    `CSV contains ${malformedRows.length} malformed rows: ${malformedRows
      .slice(0, 5)
      .map(({ line, row }) => `line ${line} has ${row.length} cells`)
      .join(", ")}`,
  );
}

const occurrences = new Map();
const sessions = headers.slice(ATTENDANCE_START_INDEX).map((header, index) => ({
  ...parseSession(header, occurrences),
  columnIndex: ATTENDANCE_START_INDEX + index,
}));

const students = [];
const attendanceRecords = [];

for (const [rawIndex, row] of rawRows.entries()) {
  const csvLine = rawIndex + 2;
  const fullName = row[0]?.trim() ?? "";
  const firstNameField = row[8]?.trim() ?? "";
  const lastNameField = row[9]?.trim() ?? "";
  const groupField = row[6]?.trim() ?? "";
  const hasStudentIdentity = Boolean(fullName || firstNameField || lastNameField);

  if (!hasStudentIdentity) {
    continue;
  }

  const firstName = normalizeNamePart(
    firstNameField,
    fullName || "Unknown",
  );
  const lastName = normalizeNamePart(lastNameField, "-");
  const groupName = groupField || UNASSIGNED_GROUP;
  const studentPhone = fitPhone(row[4] ?? "");
  const familyPhone = "";

  students.push({
    rowNumber: csvLine,
    firstName,
    lastName,
    phone: studentPhone,
    fatherPhone: familyPhone,
    groupName: scopedGroupName(groupName),
  });

  for (const session of sessions) {
    const cellValue = row[session.columnIndex]?.trim() ?? "";
    const status = STATUS_BY_CELL.get(cellValue);

    if (status) {
      attendanceRecords.push({
        rowNumber: csvLine,
        session,
        status,
      });
    } else if (EMPTY_ATTENDANCE_VALUES.has(cellValue)) {
      continue;
    } else if (cellValue) {
      throw new Error(
        `Unknown attendance value "${cellValue}" at CSV line ${csvLine}, column "${session.label}".`,
      );
    }
  }
}

const groupNames = Array.from(
  new Set([
    ...students.map((student) => student.groupName),
    scopedGroupName(UNASSIGNED_GROUP),
  ]),
).sort((left, right) => left.localeCompare(right, "ar"));

const teacherRows = groupNames.map((groupName) => [
  sqlString("Teacher"),
  sqlString(`- ${groupName}`),
  "NULL",
  sqlString(groupName),
]);

const groupRows = groupNames.map((groupName) => [sqlString(groupName)]);

const studentRows = students.map((student) => [
  sqlNumber(student.rowNumber),
  sqlString(student.firstName),
  sqlString(student.lastName),
  sqlString(student.phone),
  sqlString(student.fatherPhone),
  sqlString(student.groupName),
]);

const sessionRows = sessions.map((session) => [
  sqlString(session.date),
  sqlString(session.label),
  sqlNumber(session.sequence),
]);

const attendanceRows = attendanceRecords.map((record) => [
  sqlNumber(record.rowNumber),
  sqlString(record.session.date),
  sqlString(record.session.label),
  sqlNumber(record.session.sequence),
  sqlString(record.status),
]);

const statusCounts = attendanceRecords.reduce(
  (counts, record) => ({
    ...counts,
    [record.status]: (counts[record.status] ?? 0) + 1,
  }),
  {},
);

const sql = `-- Generated by scripts/generate-csv-attendance-sql.mjs from ${csvFileName}
-- Course slug: ${courseSlug}
-- Parsed students: ${students.length}
-- Groups/teachers: ${groupNames.length}
-- Attendance sessions: ${sessions.length}
-- Attendance records: ${attendanceRecords.length}
-- Attendance records by status: ${Object.entries(statusCounts)
  .map(([status, count]) => `${status}=${count}`)
  .join(", ")}

BEGIN;

CREATE SCHEMA IF NOT EXISTS ${schema};

CREATE TABLE IF NOT EXISTS ${schema}.courses (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

INSERT INTO ${schema}.courses (slug, name)
VALUES (${sqlString(courseSlug)}, ${sqlString(courseSlug)})
ON CONFLICT (slug) DO NOTHING;

CREATE TEMP TABLE _target_course AS
SELECT id AS course_id
FROM ${schema}.courses
WHERE slug = ${sqlString(courseSlug)}
  AND deleted_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _target_course) THEN
    RAISE EXCEPTION 'Course slug % was not found', ${sqlString(courseSlug)};
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ${schema}.attendance_sessions (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  course_id integer NOT NULL REFERENCES ${schema}.courses(id),
  session_date date NOT NULL,
  label text NOT NULL,
  sequence_on_date integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT attendance_sessions_sequence_positive CHECK (sequence_on_date > 0),
  CONSTRAINT attendance_sessions_unique UNIQUE (course_id, session_date, label, sequence_on_date)
);

CREATE TABLE IF NOT EXISTS ${schema}.attendance_records (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  course_id integer NOT NULL REFERENCES ${schema}.courses(id),
  student_id integer NOT NULL REFERENCES ${schema}.students(id),
  attendance_session_id integer NOT NULL REFERENCES ${schema}.attendance_sessions(id),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT attendance_records_status_check CHECK (status IN ('present', 'late')),
  CONSTRAINT attendance_records_student_session_unique UNIQUE (course_id, student_id, attendance_session_id)
);

DO $rls$
DECLARE
  app_table text;
BEGIN
  IF to_regprocedure('public.is_app_admin()') IS NULL THEN
    RAISE NOTICE 'Skipping attendance RLS setup because public.is_app_admin() does not exist.';
    RETURN;
  END IF;

  GRANT USAGE ON SCHEMA ${schema} TO authenticated;
  REVOKE USAGE ON SCHEMA ${schema} FROM anonymous;

  FOREACH app_table IN ARRAY ARRAY['attendance_sessions', 'attendance_records']
  LOOP
    EXECUTE format('ALTER TABLE ${schema}.%I ENABLE ROW LEVEL SECURITY', app_table);
    EXECUTE format('ALTER TABLE ${schema}.%I FORCE ROW LEVEL SECURITY', app_table);
    EXECUTE format('REVOKE ALL ON ${schema}.%I FROM anonymous', app_table);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ${schema}.%I TO authenticated', app_table);

    EXECUTE format('DROP POLICY IF EXISTS app_admin_select ON ${schema}.%I', app_table);
    EXECUTE format('DROP POLICY IF EXISTS app_admin_insert ON ${schema}.%I', app_table);
    EXECUTE format('DROP POLICY IF EXISTS app_admin_update ON ${schema}.%I', app_table);
    EXECUTE format('DROP POLICY IF EXISTS app_admin_delete ON ${schema}.%I', app_table);

    EXECUTE format(
      'CREATE POLICY app_admin_select ON ${schema}.%I FOR SELECT TO authenticated USING (public.is_app_admin())',
      app_table
    );
    EXECUTE format(
      'CREATE POLICY app_admin_insert ON ${schema}.%I FOR INSERT TO authenticated WITH CHECK (public.is_app_admin())',
      app_table
    );
    EXECUTE format(
      'CREATE POLICY app_admin_update ON ${schema}.%I FOR UPDATE TO authenticated USING (public.is_app_admin()) WITH CHECK (public.is_app_admin())',
      app_table
    );
    EXECUTE format(
      'CREATE POLICY app_admin_delete ON ${schema}.%I FOR DELETE TO authenticated USING (public.is_app_admin())',
      app_table
    );
  END LOOP;

  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO authenticated;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${schema} FROM anonymous;
END $rls$;

CREATE TEMP TABLE _csv_students (
  row_number integer PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  father_phone text,
  group_name text NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE _csv_attendance_records (
  row_number integer NOT NULL,
  session_date date NOT NULL,
  label text NOT NULL,
  sequence_on_date integer NOT NULL,
  status text NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE _csv_student_ids (
  row_number integer PRIMARY KEY,
  student_id integer NOT NULL
) ON COMMIT DROP;

WITH source(first_name, last_name, phone_number, group_name) AS (
  VALUES
${sqlValues(teacherRows)}
)
INSERT INTO ${schema}.teacher (course_id, first_name, last_name, phone_number, "group")
SELECT target.course_id, source.first_name, source.last_name, source.phone_number, source.group_name
FROM source
CROSS JOIN _target_course target
WHERE NOT EXISTS (
  SELECT 1
  FROM ${schema}.teacher existing
  WHERE existing."group" = source.group_name
    AND existing.course_id = target.course_id
    AND existing.deleted_at IS NULL
);

WITH source(name) AS (
  VALUES
${sqlValues(groupRows)}
)
INSERT INTO ${schema}.groups (course_id, name, teacher_id)
SELECT target.course_id, source.name, teacher.id
FROM source
CROSS JOIN _target_course target
JOIN ${schema}.teacher teacher
  ON teacher."group" = source.name
 AND teacher.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM ${schema}.groups existing
  WHERE existing.name = source.name
    AND existing.deleted_at IS NULL
);

INSERT INTO _csv_students (row_number, first_name, last_name, phone, father_phone, group_name)
VALUES
${sqlValues(studentRows)};

INSERT INTO ${schema}.students (
  course_id,
  first_name,
  last_name,
  phone,
  father_phone,
  "group",
  group_id,
  teacher_id
)
SELECT
  target.course_id,
  source.first_name,
  source.last_name,
  source.phone,
  source.father_phone,
  source.group_name,
  groups.id,
  groups.teacher_id
FROM _csv_students source
CROSS JOIN _target_course target
JOIN ${schema}.groups groups
  ON groups.name = source.group_name
 AND groups.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM ${schema}.students existing
  WHERE existing.first_name = source.first_name
    AND existing.last_name = source.last_name
    AND existing.group_id = groups.id
    AND existing.course_id = target.course_id
    AND existing.phone IS NOT DISTINCT FROM source.phone
    AND existing.deleted_at IS NULL
);

WITH source_ranked AS (
  SELECT
    source.*,
    row_number() OVER (
      PARTITION BY source.first_name, source.last_name, source.group_name, source.phone
      ORDER BY source.row_number
    ) AS duplicate_index
  FROM _csv_students source
),
student_ranked AS (
  SELECT
    students.id,
    students.first_name,
    students.last_name,
    students.phone,
    groups.name AS group_name,
    row_number() OVER (
      PARTITION BY students.first_name, students.last_name, groups.name, students.phone
      ORDER BY students.id
    ) AS duplicate_index
  FROM ${schema}.students students
  CROSS JOIN _target_course target
  JOIN ${schema}.groups groups
    ON groups.id = students.group_id
   AND groups.deleted_at IS NULL
  WHERE students.course_id = target.course_id
    AND students.deleted_at IS NULL
)
INSERT INTO _csv_student_ids (row_number, student_id)
SELECT source.row_number, student.id
FROM source_ranked source
JOIN student_ranked student
  ON student.first_name = source.first_name
 AND student.last_name = source.last_name
 AND student.group_name = source.group_name
 AND student.phone IS NOT DISTINCT FROM source.phone
 AND student.duplicate_index = source.duplicate_index;

DO $$
DECLARE
  expected_count integer;
  actual_count integer;
BEGIN
  SELECT count(*) INTO expected_count FROM _csv_students;
  SELECT count(*) INTO actual_count FROM _csv_student_ids;

  IF expected_count <> actual_count THEN
    RAISE EXCEPTION 'Mapped % CSV students to % database students', expected_count, actual_count;
  END IF;
END $$;

INSERT INTO ${schema}.attendance_sessions (course_id, session_date, label, sequence_on_date)
SELECT target.course_id, source.session_date::date, source.label, source.sequence_on_date
FROM (
  VALUES
${sqlValues(sessionRows)}
) AS source(session_date, label, sequence_on_date)
CROSS JOIN _target_course target
ON CONFLICT (course_id, session_date, label, sequence_on_date) DO UPDATE
SET updated_at = now(),
    deleted_at = NULL;

INSERT INTO _csv_attendance_records (
  row_number,
  session_date,
  label,
  sequence_on_date,
  status
)
VALUES
${sqlValues(attendanceRows)};

INSERT INTO ${schema}.attendance_records (
  course_id,
  student_id,
  attendance_session_id,
  status
)
SELECT
  target.course_id,
  csv_student_ids.student_id,
  sessions.id,
  source.status
FROM _csv_attendance_records source
CROSS JOIN _target_course target
JOIN _csv_student_ids csv_student_ids
  ON csv_student_ids.row_number = source.row_number
JOIN ${schema}.attendance_sessions sessions
  ON sessions.session_date = source.session_date
 AND sessions.label = source.label
 AND sessions.sequence_on_date = source.sequence_on_date
 AND sessions.course_id = target.course_id
 AND sessions.deleted_at IS NULL
ON CONFLICT (course_id, student_id, attendance_session_id) DO UPDATE
SET status = EXCLUDED.status,
    updated_at = now(),
    deleted_at = NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
`;

writeFileSync(outputPath, sql, "utf8");

console.log(
  JSON.stringify(
    {
      csvFileName,
      outputPath,
      students: students.length,
      groups: groupNames.length,
      teachers: groupNames.length,
      sessions: sessions.length,
      duplicateSessionLabels: sessions
        .filter((session) => session.sequence > 1)
        .map(
          (session) =>
            `${session.label} (${session.date}, #${session.sequence})`,
        ),
      attendanceRecords: attendanceRecords.length,
      attendanceRecordsByStatus: statusCounts,
      unassignedStudents: students.filter(
        (student) => student.groupName === UNASSIGNED_GROUP,
      ).length,
    },
    null,
    2,
  ),
);
