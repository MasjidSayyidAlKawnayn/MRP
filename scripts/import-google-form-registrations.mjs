import { readFileSync } from "node:fs";
import pg from "pg";

const DEFAULT_SOURCE =
  "C:/Users/ASUS/Downloads/إستمارة التسجيل في الدورة الصيفية لمسجد سيد الكونين  ﷺ 1448 _  2026 (ذكور) (Responses) - Form Responses 1.tsv";
const COURSE_SLUG = process.env.COURSE_SLUG ?? "main";
const COHORT_TAG = process.env.COHORT_TAG ?? "summer2026";
const GROUP_NAME = process.env.GROUP_NAME ?? "المسجلون الجدد";

const headers = {
  timestamp: "Timestamp",
  firstName: "اسم الطالب",
  lastName: "الكنية",
  fatherName: "اسم الأب",
  birthYear: "سنة التولد",
  schoolYear: "السنة الدراسية",
  fatherPhone: "رقم والد الطالب (WhatsApp)",
  motherPhone: "رقم والدة الطالب (WhatsApp)",
  phone: "رقم الطالب (WhatsApp)",
  residence: "مكان السكن",
  memorization: "المحفوظات من القرآن الكريم",
  awqaf: "شهادات الحفظ من الأوقاف",
  transport: "هل ترغب بالإشتراك بالمواصلات؟",
};

function parseTsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const names = lines.shift().split("\t");
  return lines.map((line) =>
    Object.fromEntries(line.split("\t").map((value, index) => [names[index], value])),
  );
}

function normalizeDigits(value) {
  return String(value ?? "").translate?.() ?? String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function cleanPhone(value) {
  return normalizeDigits(value).replace(/[^\d+]/g, "");
}

function extractYear(value) {
  const years = normalizeDigits(value).match(/\d{4}/g);
  if (!years?.length) return null;
  const plausible = years.map(Number).find((year) => year >= 1900 && year <= 2100);
  return plausible ?? null;
}

const schoolYears = new Map([
  ["الأول", 1], ["الثاني", 2], ["الثالث", 3], ["الرابع", 4],
  ["الخامس", 5], ["السادس", 6], ["السابع", 7], ["الثامن", 8],
  ["التاسع", 9], ["العاشر", 10], ["الحادي عشر", 11], ["الثاني عشر", 12],
]);

function extractSchoolYear(value) {
  const normalized = normalizeDigits(cleanText(value)).replace(/^الصف\s+/, "");
  const number = normalized.match(/\d+/)?.[0];
  if (number) return Number(number);
  return schoolYears.get(normalized) ?? null;
}

function parseTimestamp(value) {
  const match = normalizeDigits(value).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
  );
  if (!match) throw new Error(`Unsupported timestamp: ${value}`);
  const [, month, day, year, hour, minute, second] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+03:00`;
}

function identity(row) {
  return [
    cleanText(row[headers.firstName]),
    cleanText(row[headers.lastName]),
    cleanText(row[headers.fatherName]),
    extractYear(row[headers.birthYear]) ?? "",
  ].join("|");
}

const sourcePath = process.argv[2] ?? DEFAULT_SOURCE;
const rows = parseTsv(readFileSync(sourcePath, "utf8"));
const latestRows = new Map();
for (const row of rows) {
  const key = identity(row);
  const previous = latestRows.get(key);
  if (!previous || parseTimestamp(row.Timestamp) > parseTimestamp(previous.Timestamp)) {
    latestRows.set(key, row);
  }
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const result = { sourceRows: rows.length, uniqueStudents: latestRows.size, created: 0, updated: 0 };
try {
  await client.query("begin");
  const context = await client.query(
    `select courses.id as course_id, cohorts.id as cohort_id, groups.id as group_id,
            groups.teacher_id
       from mqs.courses courses
       join mqs.cohorts cohorts on cohorts.course_id = courses.id
       join mqs.groups groups on groups.course_id = courses.id
                            and groups.cohort_id = cohorts.id
      where courses.slug = $1 and cohorts.tag = $2 and groups.name = $3
        and cohorts.deleted_at is null and groups.deleted_at is null`,
    [COURSE_SLUG, COHORT_TAG, GROUP_NAME],
  );
  if (context.rowCount !== 1) {
    throw new Error(`Expected one target course/cohort/group, found ${context.rowCount}.`);
  }
  const { course_id, cohort_id, group_id, teacher_id } = context.rows[0];

  for (const row of latestRows.values()) {
    const values = {
      firstName: cleanText(row[headers.firstName]),
      lastName: cleanText(row[headers.lastName]),
      fatherName: cleanText(row[headers.fatherName]),
      birthYear: extractYear(row[headers.birthYear]),
      schoolYear: extractSchoolYear(row[headers.schoolYear]),
      fatherPhone: cleanPhone(row[headers.fatherPhone]),
      motherPhone: cleanPhone(row[headers.motherPhone]),
      phone: cleanPhone(row[headers.phone]),
      residence: cleanText(row[headers.residence]),
      memorization: cleanText(row[headers.memorization]),
      awqaf: cleanText(row[headers.awqaf]),
      transport: cleanText(row[headers.transport]) === "نعم",
      submittedAt: parseTimestamp(row[headers.timestamp]),
    };
    const existing = await client.query(
      `select id from mqs.students
        where course_id = $1 and deleted_at is null
          and regexp_replace(btrim(first_name), '\\s+', ' ', 'g') = $2
          and regexp_replace(btrim(last_name), '\\s+', ' ', 'g') = $3
          and coalesce(regexp_replace(btrim(father_name), '\\s+', ' ', 'g'), '') = $4
          and coalesce(birth_year, 0) = coalesce($5, 0)
        order by id limit 1 for update`,
      [course_id, values.firstName, values.lastName, values.fatherName, values.birthYear],
    );
    const params = [
      values.firstName, values.lastName, values.fatherName, values.birthYear,
      values.schoolYear, values.phone || null, values.fatherPhone || null,
      values.motherPhone || null, values.fatherPhone || values.motherPhone || null,
      values.residence, values.transport, values.submittedAt, values.memorization,
      values.awqaf, JSON.stringify(row), GROUP_NAME, group_id, teacher_id,
      course_id, cohort_id,
    ];
    if (existing.rowCount) {
      await client.query(
        `update mqs.students set
          first_name=$1, last_name=$2, father_name=$3, birth_year=$4, school_year=$5,
          phone=$6, father_phone=$7, mother_phone=$8, primary_parent_phone=$9,
          residence=$10, transport_required=$11, registration_submitted_at=$12,
          memorization_summary=$13, awqaf_certificates_summary=$14,
          registration_source_data=$15::jsonb, "group"=$16, group_id=$17,
          teacher_id=$18, cohort_id=$19, updated_at=now()
         where id=$20`,
        [...params.slice(0, 18), cohort_id, existing.rows[0].id],
      );
      result.updated += 1;
    } else {
      await client.query(
        `insert into mqs.students (
          first_name,last_name,father_name,birth_year,school_year,phone,father_phone,
          mother_phone,primary_parent_phone,residence,transport_required,
          registration_submitted_at,memorization_summary,awqaf_certificates_summary,
          registration_source_data,"group",group_id,teacher_id,course_id,cohort_id
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19,$20
        )`,
        params,
      );
      result.created += 1;
    }
  }
  await client.query("commit");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
