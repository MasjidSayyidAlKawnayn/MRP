import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const courseId = 6;
const cohortId = 2;
const groupId = 1;
const teacherId = 1;

const rows = [
  { firstName: "مالك", lastName: "جيوسي", phone: "0933715263" },
  { firstName: "محمد", lastName: "العجل", phone: "0944170562" },
  { firstName: "عبد القادر", lastName: "العجل", phone: "0944170562" },
  { firstName: "عمر", lastName: "الساعاتي", phone: "0968679530" },
  { firstName: "وليد", lastName: "بكورة" },
  { firstName: "قصي", lastName: "كزكاز" },
  { firstName: "شوقي", lastName: "رمضان", phone: "0922400010" },
  { firstName: "آدم", lastName: "بازرياشي", phone: "0951585981" },
  { firstName: "يوسف", lastName: "الجوني", phone: "0924886647" },
  { firstName: "إبراهيم", lastName: "الموصلي", phone: "0944422784", previousLastName: "موصلي" },
  { firstName: "فجر", lastName: "منصور", phone: "0966676974", fallbackSourceId: 33 },
  { firstName: "هيثم", lastName: "بيطار", phone: "092220004" },
];

function normalizePhone(value) {
  return String(value ?? "").replace(/^\+963/, "0").replace(/\D/g, "");
}

function phoneMatches(left, right) {
  const normalizedLeft = normalizePhone(left);
  const normalizedRight = normalizePhone(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

async function findStudent(client, { firstName, lastName }) {
  const result = await client.query(
    `
      select *
      from mqs.students
      where course_id = $1
        and cohort_id = $2
        and first_name = $3
        and last_name = $4
        and deleted_at is null
      order by id
      limit 1
    `,
    [courseId, cohortId, firstName, lastName],
  );
  return result.rows[0];
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

try {
  await client.query("begin");

  const created = [];
  const updated = [];
  const mismatches = [];

  for (const row of rows) {
    let student = await findStudent(client, row);

    if (!student && row.previousLastName) {
      const previous = await findStudent(client, {
        firstName: row.firstName,
        lastName: row.previousLastName,
      });
      if (previous) {
        const renamed = await client.query(
          `update mqs.students set last_name = $1, updated_at = now() where id = $2 returning *`,
          [row.lastName, previous.id],
        );
        student = renamed.rows[0];
        updated.push({ id: student.id, name: `${student.first_name} ${student.last_name}`, action: "renamed" });
      }
    }

    if (!student && row.fallbackSourceId) {
      const source = await client.query(
        `select * from mqs.students where id = $1 and course_id = $2 and deleted_at is null for update`,
        [row.fallbackSourceId, courseId],
      );
      if (source.rows[0]) {
        const moved = await client.query(
          `
            update mqs.students
            set first_name = $1,
                last_name = $2,
                "group" = 'المسجلون الجدد',
                group_id = $3,
                teacher_id = $4,
                cohort_id = $5,
                updated_at = now()
            where id = $6
            returning *
          `,
          [row.firstName, row.lastName, groupId, teacherId, cohortId, row.fallbackSourceId],
        );
        student = moved.rows[0];
        updated.push({ id: student.id, name: `${student.first_name} ${student.last_name}`, action: "moved_to_cohort" });
      }
    }

    if (!student) {
      const inserted = await client.query(
        `
          insert into mqs.students (
            first_name, last_name, "group", group_id, teacher_id, course_id, cohort_id
          )
          values ($1, $2, 'المسجلون الجدد', $3, $4, $5, $6)
          returning *
        `,
        [row.firstName, row.lastName, groupId, teacherId, courseId, cohortId],
      );
      student = inserted.rows[0];
      created.push({ id: student.id, name: `${student.first_name} ${student.last_name}` });
    }

    if (row.phone) {
      const currentPhones = [
        ["phone", student.phone],
        ["primary_parent_phone", student.primary_parent_phone],
        ["father_phone", student.father_phone],
        ["mother_phone", student.mother_phone],
      ].filter(([, value]) => value);
      const matchingPhone = currentPhones.find(([, value]) => phoneMatches(value, row.phone));
      const differentPhones = currentPhones.filter(([, value]) => !phoneMatches(value, row.phone));

      if (differentPhones.length > 0 && !matchingPhone) {
        mismatches.push({
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          incomingPhone: row.phone,
          existingPhones: Object.fromEntries(differentPhones),
        });
      }

      if (!student.phone) {
        const phoneUpdate = await client.query(
          `update mqs.students set phone = $1, updated_at = now() where id = $2 returning *`,
          [row.phone, student.id],
        );
        student = phoneUpdate.rows[0];
        updated.push({ id: student.id, name: `${student.first_name} ${student.last_name}`, action: "phone_set" });
      }
    }
  }

  await client.query("commit");

  const verification = await client.query(
    `
      select id, first_name, last_name, phone, primary_parent_phone, father_phone, mother_phone, deleted_at
      from mqs.students
      where course_id = $1
        and cohort_id = $2
        and (first_name, last_name) in (
          ('مالك','جيوسي'),
          ('محمد','العجل'),
          ('عبد القادر','العجل'),
          ('عمر','الساعاتي'),
          ('وليد','بكورة'),
          ('قصي','كزكاز'),
          ('شوقي','رمضان'),
          ('آدم','بازرياشي'),
          ('يوسف','الجوني'),
          ('إبراهيم','الموصلي'),
          ('فجر','منصور'),
          ('هيثم','بيطار')
        )
      order by id
    `,
    [courseId, cohortId],
  );

  console.log(JSON.stringify({ created, mismatches, updated, verification: verification.rows }, null, 2));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
