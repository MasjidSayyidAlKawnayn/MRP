import { getAppClient } from "../data/neon";
import { throwIfDataError } from "./dataErrors";
import { normalizeSlug, toCohort } from "./dataMappers";
import type { CohortInput, CourseId } from "./dataTypes";

export async function listCohorts(
  courseId: CourseId,
  { includeArchived = false } = {},
) {
  const client = getAppClient();
  let query = client
    .from("cohorts")
    .select("*")
    .eq("course_id", courseId)
    .order("id", { ascending: true });

  if (!includeArchived) {
    query = query.is("deleted_at", null);
  }

  const response = await query;
  throwIfDataError(response.error);
  return ((response.data ?? []) as Record<string, unknown>[]).map(toCohort);
}

export async function getCohortByTag(courseId: CourseId, tag: string) {
  const client = getAppClient();
  const response = await client
    .from("cohorts")
    .select("*")
    .eq("course_id", courseId)
    .eq("tag", tag)
    .is("deleted_at", null)
    .single();

  throwIfDataError(response.error);
  return response.data ? toCohort(response.data as Record<string, unknown>) : null;
}

export async function createCohort(values: CohortInput) {
  const client = getAppClient();
  const response = await client
    .from("cohorts")
    .insert({
      course_id: values.courseId,
      ends_at: values.endsAt ?? null,
      name: values.name,
      previous_cohort_id: values.previousCohortId ?? null,
      starts_at: values.startsAt ?? null,
      status: values.status ?? "active",
      tag: normalizeSlug(values.tag),
    })
    .select()
    .single();

  throwIfDataError(response.error);
  return response.data ? toCohort(response.data as Record<string, unknown>) : null;
}
