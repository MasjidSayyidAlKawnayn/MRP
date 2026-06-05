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
  { firstName: "محمد", lastName: "زين", phone: "0980254920" },
  { firstName: "عبد الهادي", lastName: "عابدين", phone: "0981684768" },
  { firstName: "عبد الرحمن", lastName: "الألشي", phone: "0964591314", previousLastName: "الإشي" },
  { firstName: "صفوان", lastName: "الجوني", phone: "0932886647", duplicateName: ["صفوان", "الحوني"] },
  { firstName: "عماد", lastName: "بازرياشي" },
  { firstName: "محمد", lastName: "كزكاز" },
  { firstName: "عماد", lastName: "ساعاتي" },
  { firstName: "أمجد", lastName: "محيرس", phone: "0935744809" },
  { firstName: "أمجد", lastName: "الخطيب", phone: "0932655290" },
  { firstName: "ليث", lastName: "الحايك", phone: "0980227287" },
  { firstName: "معاوية", lastName: "الدغيم", phone: "0980008504" },
  { firstName: "محمد", lastName: "الدغيم" },
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

async function moveReferences(client, source, target) {
  await client.query(
    `
      update mqs.attendance_records
      set student_id = $1, cohort_id = coalesce(cohort_id, $4), updated_at = now()
      where student_id = $2 and course_id = $3 and deleted_at is null
    `,
    [target.id, source.id, source.course_id, target.cohort_id],
  );
  await client.query(
    `
      update mqs.cohort_enrollments
      set student_id = $1, cohort_id = coalesce(cohort_id, $4), updated_at = now()
      where student_id = $2 and course_id = $3 and deleted_at is null
    `,
    [target.id, source.id, source.course_id, target.cohort_id],
  );
  await client.query(
    `
      update mqs.memorization_pages
      set student_id = $1, cohort_id = coalesce(cohort_id, $4), updated_at = now()
      where student_id = $2 and course_id = $3 and deleted_at is null
    `,
    [target.id, source.id, source.course_id, target.cohort_id],
  );
  await client.query(
    `
      update mqs.homework_assignments
      set student_id = $1, cohort_id = coalesce(cohort_id, $4), updated_at = now()
      where student_id = $2 and course_id = $3 and deleted_at is null
    `,
    [target.id, source.id, source.course_id, target.cohort_id],
  );
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

try {
  await client.query("begin");

  const created = [];
  const updated = [];
  const merged = [];
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
          `
            update mqs.students
            set last_name = $1, updated_at = now()
            where id = $2
            returning *
          `,
          [row.lastName, previous.id],
        );
        student = renamed.rows[0];
        updated.push({ id: student.id, name: `${row.firstName} ${row.lastName}`, action: "renamed" });
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
      created.push({ id: student.id, name: `${row.firstName} ${row.lastName}` });
    }

    if (row.duplicateName) {
      const duplicate = await findStudent(client, {
        firstName: row.duplicateName[0],
        lastName: row.duplicateName[1],
      });
      if (duplicate && duplicate.id !== student.id) {
        await moveReferences(client, duplicate, student);
        await client.query(
          `update mqs.students set deleted_at = now(), updated_at = now() where id = $1`,
          [duplicate.id],
        );
        merged.push({
          fromId: duplicate.id,
          fromName: `${duplicate.first_name} ${duplicate.last_name}`,
          toId: student.id,
          toName: `${student.first_name} ${student.last_name}`,
        });
      }
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
        and (
          (cohort_id = $2 and (first_name, last_name) in (
            ('محمد','زين'),
            ('عبد الهادي','عابدين'),
            ('عبد الرحمن','الألشي'),
            ('صفوان','الجوني'),
            ('عماد','بازرياشي'),
            ('محمد','كزكاز'),
            ('عماد','ساعاتي'),
            ('أمجد','محيرس'),
            ('أمجد','الخطيب'),
            ('ليث','الحايك'),
            ('معاوية','الدغيم'),
            ('محمد','الدغيم')
          ))
          or id in (63)
        )
      order by id
    `,
    [courseId, cohortId],
  );

  console.log(JSON.stringify({ created, merged, mismatches, updated, verification: verification.rows }, null, 2));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
