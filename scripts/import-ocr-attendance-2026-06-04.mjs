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

const courseSlug = "main";
const cohortTag = "summer2026";
const groupId = 1;
const sessionDate = "2026-06-04";
const sessionLabel = "OCR 2026-06-04";

const studentNames = [
  "عبد الرحمن الإشي",
  "ليث الحايك",
  "عماد ساعاتي",
  "صفوان الحوني",
  "محمد إدغيم",
  "أمجد محيرس",
  "نبال حسن",
  "يحيى بازرياشي",
  "مالك جيوسي",
  "محمد العجل",
  "شوقي رمضان",
  "يوسف الجوني",
  "عامر بكورة",
  "عبد القادر العجل",
  "زيد إدريس",
  "قصي كزكاز",
  "بسام العابة",
  "جاد الحمصي",
  "أيمن الحلقي",
  "آدم بازرياشي",
  "أمجد الخطيب",
  "عماد بازرياشي",
  "محمد كزكاز",
  "معاوية الدغيم",
  "محمد زين",
  "عبد الهادي عابدين",
  "عمر الساعاتي",
  "وليد بكورة",
  "هيثم بيطار",
  "إبراهيم موصلي",
  "سليم سلام",
];

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1),
  };
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

try {
  await client.query("begin");

  const courseResult = await client.query(
    `select id from mqs.courses where slug = $1 and deleted_at is null`,
    [courseSlug],
  );
  const courseId = courseResult.rows[0]?.id;

  if (!courseId) {
    throw new Error(`Could not find course ${courseSlug}.`);
  }

  const cohortResult = await client.query(
    `select id from mqs.cohorts where course_id = $1 and tag = $2 and deleted_at is null`,
    [courseId, cohortTag],
  );
  const cohortId = cohortResult.rows[0]?.id;

  if (!cohortId) {
    throw new Error(`Could not find cohort ${cohortTag}.`);
  }

  const groupResult = await client.query(
    `select id, name, teacher_id from mqs.groups where id = $1 and course_id = $2 and cohort_id = $3 and deleted_at is null`,
    [groupId, courseId, cohortId],
  );
  const group = groupResult.rows[0];

  if (!group) {
    throw new Error(`Could not find group ${groupId} in ${courseSlug}/${cohortTag}.`);
  }

  const insertedStudents = [];
  const reusedStudents = [];

  for (const fullName of studentNames) {
    const { firstName, lastName } = splitName(fullName);
    const existing = await client.query(
      `
        select id, first_name, last_name
        from mqs.students
        where course_id = $1
          and cohort_id = $2
          and group_id = $3
          and first_name = $4
          and last_name = $5
          and deleted_at is null
        order by id
        limit 1
      `,
      [courseId, cohortId, group.id, firstName, lastName],
    );

    if (existing.rows[0]) {
      reusedStudents.push(existing.rows[0]);
      continue;
    }

    const inserted = await client.query(
      `
        insert into mqs.students (
          first_name,
          last_name,
          "group",
          group_id,
          teacher_id,
          course_id,
          cohort_id
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id, first_name, last_name
      `,
      [firstName, lastName, group.name, group.id, group.teacher_id, courseId, cohortId],
    );
    insertedStudents.push(inserted.rows[0]);
  }

  const allStudents = [...reusedStudents, ...insertedStudents];

  const existingSession = await client.query(
    `
      select id
      from mqs.attendance_sessions
      where course_id = $1
        and cohort_id = $2
        and session_date = $3
        and sequence_on_date = 1
        and deleted_at is null
      limit 1
    `,
    [courseId, cohortId, sessionDate],
  );

  let sessionId = existingSession.rows[0]?.id;

  if (!sessionId) {
    const insertedSession = await client.query(
      `
        insert into mqs.attendance_sessions (
          session_date,
          label,
          sequence_on_date,
          course_id,
          cohort_id
        )
        values ($1, $2, 1, $3, $4)
        returning id
      `,
      [sessionDate, sessionLabel, courseId, cohortId],
    );
    sessionId = insertedSession.rows[0].id;
  }

  let attendanceCreated = 0;
  let attendanceUpdated = 0;

  for (const student of allStudents) {
    const upserted = await client.query(
      `
        insert into mqs.attendance_records (
          student_id,
          attendance_session_id,
          status,
          course_id,
          cohort_id
        )
        values ($1, $2, 'present', $3, $4)
        on conflict (course_id, student_id, attendance_session_id)
        do update set status = excluded.status, updated_at = now()
        returning (xmax = 0) as inserted
      `,
      [student.id, sessionId, courseId, cohortId],
    );

    if (upserted.rows[0].inserted) {
      attendanceCreated += 1;
    } else {
      attendanceUpdated += 1;
    }
  }

  await client.query("commit");

  const verification = await client.query(
    `
      select students.id, students.first_name, students.last_name, records.status
      from mqs.students students
      join mqs.attendance_records records
        on records.student_id = students.id
       and records.course_id = students.course_id
       and records.deleted_at is null
      join mqs.attendance_sessions sessions
        on sessions.id = records.attendance_session_id
       and sessions.deleted_at is null
      where students.course_id = $1
        and students.cohort_id = $2
        and sessions.session_date = $3
        and sessions.sequence_on_date = 1
        and students.deleted_at is null
        and (students.first_name || ' ' || students.last_name) = any($4)
      order by students.id
    `,
    [courseId, cohortId, sessionDate, studentNames],
  );

  console.log(
    JSON.stringify(
      {
        attendanceCreated,
        attendanceUpdated,
        cohortId,
        courseId,
        groupId: group.id,
        insertedStudents: insertedStudents.length,
        reusedStudents: reusedStudents.length,
        sessionDate,
        sessionId,
        verifiedRows: verification.rows.length,
        students: verification.rows,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
