import type { EntityDefinition } from "./entities";
import type { AdminUser, Cohort, Course, CrudRow, CrudValue } from "./dataTypes";

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toAppRow(
  entity: EntityDefinition,
  dbRow: Record<string, unknown>,
) {
  return entity.fields.reduce<CrudRow>((row, field) => {
    const value = dbRow[field.column];
    row[field.key] =
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
        ? value
        : value === undefined
          ? null
          : String(value);
    return row;
  }, {});
}

export function toDbPayload(
  entity: EntityDefinition,
  values: Record<string, CrudValue>,
) {
  return Object.fromEntries(
    entity.fields
      .filter((field) => field.key in values)
      .map((field) => [field.column, values[field.key]]),
  );
}

export function applyCoursePayload(
  entity: EntityDefinition,
  values: Record<string, CrudValue>,
  course?: Course,
  cohort?: Cohort,
) {
  const {
    cohort_id: _cohortIdColumn,
    cohortId: _cohortIdKey,
    course_id: _courseIdColumn,
    courseId: _courseIdKey,
    ...payload
  } = values;

  if (!entity.courseScoped && !entity.cohortScoped) {
    return payload;
  }

  if (entity.cohortScoped && cohort) {
    return {
      ...payload,
      cohort_id: cohort.id,
      course_id: cohort.courseId,
    };
  }

  if (!course) {
    return payload;
  }

  return {
    ...payload,
    course_id: course.id,
  };
}

export function toCourse(row: Record<string, unknown>): Course {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : null,
    isActive: row.is_active !== false,
  };
}

export function toCohort(row: Record<string, unknown>): Cohort {
  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    name: String(row.name),
    tag: String(row.tag),
    status: typeof row.status === "string" ? row.status : "active",
    startsAt: typeof row.starts_at === "string" ? row.starts_at : null,
    endsAt: typeof row.ends_at === "string" ? row.ends_at : null,
    previousCohortId:
      row.previous_cohort_id === null || row.previous_cohort_id === undefined
        ? null
        : Number(row.previous_cohort_id),
    deletedAt: typeof row.deleted_at === "string" ? row.deleted_at : null,
  };
}

export function toAdminUser(row: Record<string, unknown>): AdminUser {
  return {
    userId: String(row.user_id),
    email: typeof row.email === "string" ? row.email : null,
    owner: row.owner === true,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  };
}
