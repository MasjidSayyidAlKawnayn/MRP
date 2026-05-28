import { getAppClient } from "../data/neon";
import { throwIfDataError } from "./dataErrors";
import { normalizeSlug, toCourse } from "./dataMappers";
import type { Course, CourseId, CourseInput, CrudValue } from "./dataTypes";

export async function listCourses({ includeInactive = false } = {}) {
  const client = getAppClient();
  let query = client
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .order("id", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const response = await query;
  throwIfDataError(response.error);
  return ((response.data ?? []) as Record<string, unknown>[]).map(toCourse);
}

export async function getCourseBySlug(slug: string) {
  const client = getAppClient();
  const response = await client
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  throwIfDataError(response.error);
  return response.data ? toCourse(response.data as Record<string, unknown>) : null;
}

async function seedDefaultPageTiers(course: Course) {
  const client = getAppClient();
  const response = await client
    .from("page_point_tiers")
    .insert([
      {
        course_id: course.id,
        min_pages: 1,
        max_pages: 1,
        points: 10,
        name: "1 page/day",
      },
      {
        course_id: course.id,
        min_pages: 2,
        max_pages: 2,
        points: 20,
        name: "2 pages/day",
      },
      {
        course_id: course.id,
        min_pages: 3,
        max_pages: null,
        points: 30,
        name: "3+ pages/day",
      },
    ]);

  throwIfDataError(response.error);
}

export async function createCourse(values: CourseInput) {
  const client = getAppClient();
  const response = await client
    .from("courses")
    .insert({
      description: values.description || null,
      is_active: values.isActive ?? true,
      name: values.name,
      slug: normalizeSlug(values.slug || values.name),
    })
    .select()
    .single();

  throwIfDataError(response.error);
  const course = response.data
    ? toCourse(response.data as Record<string, unknown>)
    : null;

  if (course) {
    await seedDefaultPageTiers(course);
  }

  return course;
}

export async function updateCourse(id: CourseId, values: Partial<CourseInput>) {
  const client = getAppClient();
  const payload: Record<string, CrudValue> = {
    updated_at: new Date().toISOString(),
  };

  if (values.description !== undefined) {
    payload.description = values.description || null;
  }

  if (values.isActive !== undefined) {
    payload.is_active = values.isActive;
  }

  if (values.name !== undefined) {
    payload.name = values.name;
  }

  if (values.slug !== undefined) {
    payload.slug = normalizeSlug(values.slug);
  }

  const response = await client
    .from("courses")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  throwIfDataError(response.error);
  return response.data ? toCourse(response.data as Record<string, unknown>) : null;
}

export async function softDeleteCourse(id: CourseId) {
  const client = getAppClient();
  const now = new Date().toISOString();
  const response = await client
    .from("courses")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id)
    .select()
    .single();

  throwIfDataError(response.error);
  return response.data ? toCourse(response.data as Record<string, unknown>) : null;
}
