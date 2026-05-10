import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const schema = "mqs";
const csvFileName =
  readdirSync(process.cwd()).find((fileName) => fileName.endsWith(".csv")) ??
  "";
const csvPath = join(process.cwd(), csvFileName);
const outputPath = join(process.cwd(), "sql", "import_csv_attendance.sql");

const STATUS_BY_CELL = new Map([
  ["حاضر", "present"],
  ["تأخير", "late"],
]);
const UNASSIGNED_GROUP = "Unassigned";
const ATTENDANCE_START_INDEX = 11;

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
  const match =
    /^(?<day>[A-Za-z]{3}) (?<dayOfMonth>\d{1,2})\/(?<month>\d{1,2})$/.exec(
      header,
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

  return {
    date,
    label: header,
    sequence,
  };
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
  const hasStudentIdentity = Boolean(
    row[0]?.trim() || row[4]?.trim() || row[5]?.trim(),
  );
  const hasBooleanFlag = row[3] === "TRUE" || row[3] === "FALSE";

  if (!hasStudentIdentity || !hasBooleanFlag) {
    continue;
  }

  const firstName = normalizeNamePart(
    row[4] ?? "",
    row[0]?.trim() || "Unknown",
  );
  const lastName = normalizeNamePart(row[5] ?? "", "-");
  const groupName = row[6]?.trim() || UNASSIGNED_GROUP;
  const familyPhone = fitPhone(row[1] ?? "");
  const studentPhone = fitPhone(row[2] ?? "");

  students.push({
    rowNumber: csvLine,
    firstName,
    lastName,
    phone: studentPhone,
    fatherPhone: familyPhone,
    groupName,
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
    } else if (cellValue) {
      throw new Error(
        `Unknown attendance value "${cellValue}" at CSV line ${csvLine}, column "${session.label}".`,
      );
    }
  }
}

const groupNames = Array.from(
  new Set([...students.map((student) => student.groupName), UNASSIGNED_GROUP]),
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
-- Parsed students: ${students.length}
-- Groups/teachers: ${groupNames.length}
-- Attendance sessions: ${sessions.length}
-- Attendance records: ${attendanceRecords.length}
-- Attendance records by status: ${Object.entries(statusCounts)
  .map(([status, count]) => `${status}=${count}`)
  .join(", ")}

BEGIN;

CREATE SCHEMA IF NOT EXISTS ${schema};

CREATE TABLE IF NOT EXISTS ${schema}.attendance_sessions (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  session_date date NOT NULL,
  label text NOT NULL,
  sequence_on_date integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT attendance_sessions_sequence_positive CHECK (sequence_on_date > 0),
  CONSTRAINT attendance_sessions_unique UNIQUE (session_date, label, sequence_on_date)
);

CREATE TABLE IF NOT EXISTS ${schema}.attendance_records (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  student_id integer NOT NULL REFERENCES ${schema}.students(id),
  attendance_session_id integer NOT NULL REFERENCES ${schema}.attendance_sessions(id),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT attendance_records_status_check CHECK (status IN ('present', 'late')),
  CONSTRAINT attendance_records_student_session_unique UNIQUE (student_id, attendance_session_id)
);

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
INSERT INTO ${schema}.teacher (first_name, last_name, phone_number, "group")
SELECT source.first_name, source.last_name, source.phone_number, source.group_name
FROM source
WHERE NOT EXISTS (
  SELECT 1
  FROM ${schema}.teacher existing
  WHERE existing."group" = source.group_name
    AND existing.deleted_at IS NULL
);

WITH source(name) AS (
  VALUES
${sqlValues(groupRows)}
)
INSERT INTO ${schema}.groups (name, teacher_id)
SELECT source.name, teacher.id
FROM source
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
  first_name,
  last_name,
  phone,
  father_phone,
  "group",
  group_id,
  teacher_id
)
SELECT
  source.first_name,
  source.last_name,
  source.phone,
  source.father_phone,
  source.group_name,
  groups.id,
  groups.teacher_id
FROM _csv_students source
JOIN ${schema}.groups groups
  ON groups.name = source.group_name
 AND groups.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM ${schema}.students existing
  WHERE existing.first_name = source.first_name
    AND existing.last_name = source.last_name
    AND existing.group_id = groups.id
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
  JOIN ${schema}.groups groups
    ON groups.id = students.group_id
   AND groups.deleted_at IS NULL
  WHERE students.deleted_at IS NULL
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

INSERT INTO ${schema}.attendance_sessions (session_date, label, sequence_on_date)
VALUES
${sqlValues(sessionRows)}
ON CONFLICT (session_date, label, sequence_on_date) DO UPDATE
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
  student_id,
  attendance_session_id,
  status
)
SELECT
  csv_student_ids.student_id,
  sessions.id,
  source.status
FROM _csv_attendance_records source
JOIN _csv_student_ids csv_student_ids
  ON csv_student_ids.row_number = source.row_number
JOIN ${schema}.attendance_sessions sessions
  ON sessions.session_date = source.session_date
 AND sessions.label = source.label
 AND sessions.sequence_on_date = source.sequence_on_date
 AND sessions.deleted_at IS NULL
ON CONFLICT (student_id, attendance_session_id) DO UPDATE
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
