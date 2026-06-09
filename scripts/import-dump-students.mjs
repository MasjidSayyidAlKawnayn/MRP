import fs from "node:fs";
import pg from "pg";

const SOURCE_PATH = process.argv[2] ?? "data/imports/dump.tsv";
const COURSE_SLUG = process.env.COURSE_SLUG ?? "main";
const COHORT_TAG = process.env.COHORT_TAG ?? "summer2026";

function loadEnvFile(path) {
  if (!fs.existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeDigits(value) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function cleanPhone(value) {
  return normalizeDigits(value).replace(/[^\d+]/g, "");
}

const schoolYearMap = new Map([
  ["أول", 1],
  ["اول", 1],
  ["ثاني", 2],
  ["ثالث", 3],
  ["رابع", 4],
  ["خامس", 5],
  ["سادس", 6],
  ["سابع", 7],
  ["ثامن", 8],
  ["تاسع", 9],
  ["عاشر", 10],
  ["حادي عشر", 11],
  ["الحادي عشر", 11],
  ["ثاني عشر", 12],
  ["الثاني عشر", 12],
]);

function parseSchoolYear(value) {
  const normalized = cleanText(normalizeDigits(value)).replace(/^ال/, "");
  const directNumber = normalized.match(/\d+/)?.[0];
  if (directNumber) {
    return Number(directNumber);
  }

  return schoolYearMap.get(normalized) ?? schoolYearMap.get(cleanText(value)) ?? null;
}

function splitName(fullName) {
  const parts = cleanText(fullName).split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function parseRow(line) {
  const columns = line.split("\t").map(cleanText);
  const [name = "", className = "", teacherRaw = "", phoneRaw = ""] = columns;
  const teacherWithMaybePhone = teacherRaw.match(/^(.*?)(?:\s+|^)(0\d[\d\s]*)$/);
  const teacher = cleanText(teacherWithMaybePhone?.[1] ?? teacherRaw);
  const phone = cleanPhone(phoneRaw || teacherWithMaybePhone?.[2] || "");

  return {
    fullName: name,
    ...splitName(name),
    schoolYear: parseSchoolYear(className),
    teacherName: teacher,
    phone,
    sourceColumns: columns,
  };
}

function identityKey(student) {
  return [
    cleanText(student.firstName),
    cleanText(student.lastName),
    student.schoolYear ?? "",
  ].join("|");
}

const env = { ...loadEnvFile(".env"), ...process.env };

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const sourceRows = fs
  .readFileSync(SOURCE_PATH, "utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .filter((line) => cleanText(line))
  .map(parseRow);

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

const result = {
  sourceRows: sourceRows.length,
  teachersCreated: 0,
  groupsCreated: 0,
  studentsCreated: 0,
  studentsUpdated: 0,
};

try {
  await client.query("begin");

  const context = await client.query(
    `select courses.id as course_id, cohorts.id as cohort_id
       from mqs.courses courses
       join mqs.cohorts cohorts on cohorts.course_id = courses.id
      where courses.slug = $1
        and cohorts.tag = $2
        and courses.deleted_at is null
        and cohorts.deleted_at is null`,
    [COURSE_SLUG, COHORT_TAG],
  );

  if (context.rowCount !== 1) {
    throw new Error(`Expected one course/cohort target, found ${context.rowCount}.`);
  }

  const { course_id: courseId, cohort_id: cohortId } = context.rows[0];

  const teachersResult = await client.query(
    `select id, first_name, last_name
       from mqs.teacher
      where course_id = $1
        and deleted_at is null
      order by id`,
    [courseId],
  );
  const teacherByName = new Map(
    teachersResult.rows.map((row) => [
      cleanText(`${row.first_name} ${row.last_name}`),
      { id: row.id, firstName: row.first_name, lastName: row.last_name },
    ]),
  );

  const groupsResult = await client.query(
    `select id, name, teacher_id
       from mqs.groups
      where course_id = $1
        and deleted_at is null
      order by id`,
    [courseId],
  );
  const groupByName = new Map(
    groupsResult.rows.map((row) => [
      cleanText(row.name),
      { id: row.id, name: row.name, teacherId: row.teacher_id },
    ]),
  );

  const studentsResult = await client.query(
    `select id, first_name, last_name, school_year
       from mqs.students
      where course_id = $1
        and deleted_at is null
      order by id
      for update`,
    [courseId],
  );
  const studentByIdentity = new Map(
    studentsResult.rows.map((row) => [
      identityKey({
        firstName: row.first_name,
        lastName: row.last_name,
        schoolYear: row.school_year,
      }),
      row,
    ]),
  );

  for (const row of sourceRows) {
    if (!row.teacherName) {
      throw new Error(`Missing teacher name for "${row.fullName}".`);
    }

    let teacher = teacherByName.get(row.teacherName);
    if (!teacher) {
      const teacherNameParts = splitName(row.teacherName);
      const teacherInsert = await client.query(
        `insert into mqs.teacher (
          first_name, last_name, phone_number, "group", course_id, cohort_id
        ) values ($1, $2, null, $3, $4, $5)
        returning id, first_name, last_name`,
        [
          teacherNameParts.firstName,
          teacherNameParts.lastName,
          row.teacherName,
          courseId,
          cohortId,
        ],
      );
      teacher = {
        id: teacherInsert.rows[0].id,
        firstName: teacherInsert.rows[0].first_name,
        lastName: teacherInsert.rows[0].last_name,
      };
      teacherByName.set(row.teacherName, teacher);
      result.teachersCreated += 1;
    }

    let group = groupByName.get(row.teacherName);
    if (!group) {
      const groupInsert = await client.query(
        `insert into mqs.groups (
          name, teacher_id, color_code, course_id, cohort_id
        ) values ($1, $2, 'rose', $3, $4)
        returning id, name, teacher_id`,
        [row.teacherName, teacher.id, courseId, cohortId],
      );
      group = {
        id: groupInsert.rows[0].id,
        name: groupInsert.rows[0].name,
        teacherId: groupInsert.rows[0].teacher_id,
      };
      groupByName.set(row.teacherName, group);
      result.groupsCreated += 1;
    }

    const existingStudent = studentByIdentity.get(identityKey(row));
    const payload = [
      row.firstName,
      row.lastName,
      row.schoolYear,
      row.phone || null,
      row.phone || null,
      row.teacherName,
      group.id,
      teacher.id,
      courseId,
      cohortId,
    ];

    if (existingStudent) {
      await client.query(
        `update mqs.students
            set first_name = $1,
                last_name = $2,
                school_year = $3,
                phone = coalesce($4, phone),
                primary_parent_phone = coalesce($5, primary_parent_phone),
                "group" = $6,
                group_id = $7,
                teacher_id = $8,
                cohort_id = $10,
                updated_at = now()
          where id = $9`,
        [...payload.slice(0, 8), existingStudent.id, payload[9]],
      );
      result.studentsUpdated += 1;
      continue;
    }

    await client.query(
      `insert into mqs.students (
         first_name, last_name, school_year, phone, primary_parent_phone,
         transport_required, "group", group_id, teacher_id, course_id, cohort_id
       ) values (
         $1, $2, $3, $4, $5, false, $6, $7, $8, $9, $10
       )`,
      payload,
    );
    result.studentsCreated += 1;
  }

  await client.query("commit");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
