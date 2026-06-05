import { getSchemaClient } from "../data/neon";
import { throwIfDataError } from "./dataErrors";
import { applyCoursePayload, toAppRow, toDbPayload } from "./dataMappers";
import type { EntityDefinition } from "./entities";
import type { Cohort, Course, CrudValue } from "./dataTypes";

const systemManagedKeys = new Set(["id", "createdAt", "updatedAt", "deletedAt"]);

function omitSystemManagedValues(values: Record<string, CrudValue>) {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !systemManagedKeys.has(key)),
  );
}

export async function listRows(
  entity: EntityDefinition,
  course?: Course,
  cohort?: Cohort,
) {
  const client = getSchemaClient(entity.schema);
  let query = client
    .from(entity.table)
    .select("*")
    .is("deleted_at", null)
    .order("id", { ascending: true });

  if (entity.courseScoped && course) {
    query = query.eq("course_id", course.id);
  }

  if (entity.cohortScoped && cohort) {
    query = query.eq("cohort_id", cohort.id);
  }

  const response = await query;

  throwIfDataError(response.error);
  return ((response.data ?? []) as Record<string, unknown>[]).map((row) =>
    toAppRow(entity, row),
  );
}

export async function getRow(
  entity: EntityDefinition,
  id: number,
  course?: Course,
  cohort?: Cohort,
) {
  const client = getSchemaClient(entity.schema);
  let query = client.from(entity.table).select("*").eq("id", id);

  if (entity.courseScoped && course) {
    query = query.eq("course_id", course.id);
  }

  if (entity.cohortScoped && cohort) {
    query = query.eq("cohort_id", cohort.id);
  }

  const response = await query.single();

  throwIfDataError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export async function createRow(
  entity: EntityDefinition,
  values: Record<string, CrudValue>,
  course?: Course,
  cohort?: Cohort,
) {
  const client = getSchemaClient(entity.schema);
  const response = await client
    .from(entity.table)
    .insert(
      applyCoursePayload(
        entity,
        toDbPayload(entity, omitSystemManagedValues(values)),
        course,
        cohort,
      ),
    )
    .select()
    .single();

  throwIfDataError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export async function createRows(
  entity: EntityDefinition,
  values: Record<string, CrudValue>[],
  course?: Course,
  cohort?: Cohort,
) {
  if (values.length === 0) {
    return [];
  }

  const client = getSchemaClient(entity.schema);
  const response = await client
    .from(entity.table)
    .insert(
      values.map((value) =>
        applyCoursePayload(
          entity,
          toDbPayload(entity, omitSystemManagedValues(value)),
          course,
          cohort,
        ),
      ),
    )
    .select();

  throwIfDataError(response.error);
  return ((response.data ?? []) as Record<string, unknown>[]).map((row) =>
    toAppRow(entity, row),
  );
}

export async function updateRow(
  entity: EntityDefinition,
  id: number,
  values: Record<string, CrudValue>,
  course?: Course,
  cohort?: Cohort,
) {
  const client = getSchemaClient(entity.schema);
  let query = client
    .from(entity.table)
    .update(
      applyCoursePayload(
        entity,
        toDbPayload(entity, {
          ...omitSystemManagedValues(values),
          updatedAt: new Date().toISOString(),
        }),
        course,
        cohort,
      ),
    )
    .eq("id", id);

  if (entity.courseScoped && course) {
    query = query.eq("course_id", course.id);
  }

  if (entity.cohortScoped && cohort) {
    query = query.eq("cohort_id", cohort.id);
  }

  const response = await query.select().single();

  throwIfDataError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export async function softDeleteRow(
  entity: EntityDefinition,
  id: number,
  course?: Course,
  cohort?: Cohort,
) {
  const client = getSchemaClient(entity.schema);
  const now = new Date().toISOString();
  let query = client
    .from(entity.table)
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id);

  if (entity.courseScoped && course) {
    query = query.eq("course_id", course.id);
  }

  if (entity.cohortScoped && cohort) {
    query = query.eq("cohort_id", cohort.id);
  }

  const response = await query.select().single();

  throwIfDataError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}
