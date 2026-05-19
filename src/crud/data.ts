import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";
import type { EntityDefinition, FieldDefinition, SchemaName } from "./entities";

export type CrudRow = Record<string, string | number | boolean | null>;
export type CrudValue = string | number | boolean | null;
export type CourseId = number;
export type CourseSlug = string;

export interface Course {
  id: CourseId;
  slug: CourseSlug;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AdminUser {
  userId: string;
  email: string | null;
  owner: boolean;
  createdAt: string | null;
}

export type CourseInput = {
  description?: string | null;
  isActive?: boolean;
  name: string;
  slug: string;
};

export type AdminUserInput = {
  email?: string | null;
  owner?: boolean;
  userId: string;
};

export const appSchema: SchemaName = import.meta.env.VITE_NEON_APP_SCHEMA || "mqs";

const schemaClients = new Map<SchemaName, ReturnType<typeof createClient>>();

function getSchemaClient(schema: SchemaName) {
  const existingClient = schemaClients.get(schema);

  if (existingClient) {
    return existingClient;
  }

  const client = createClient({
    auth: {
      adapter: BetterAuthReactAdapter(),
      url: import.meta.env.VITE_NEON_AUTH_URL ?? "",
    },
    dataApi: {
      url: import.meta.env.VITE_NEON_DATA_API_URL ?? "",
      options: {
        db: { schema: schema as "public" },
      },
    },
  });

  schemaClients.set(schema, client);
  return client;
}

function isPostgrestError(error: unknown): error is { message?: string } {
  return Boolean(error && typeof error === "object" && "message" in error);
}

function throwIfError(error: unknown) {
  if (error) {
    throw new Error(
      isPostgrestError(error) && error.message
        ? error.message
        : "The database request failed.",
    );
  }
}

function toAppRow(entity: EntityDefinition, dbRow: Record<string, unknown>) {
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

function toDbPayload(
  entity: EntityDefinition,
  values: Record<string, CrudValue>,
) {
  return Object.fromEntries(
    entity.fields
      .filter((field) => field.key in values)
      .map((field) => [field.column, values[field.key]]),
  );
}

function applyCoursePayload(
  entity: EntityDefinition,
  values: Record<string, CrudValue>,
  course?: Course,
) {
  const { course_id: _courseIdColumn, courseId: _courseIdKey, ...payload } =
    values;

  if (!entity.courseScoped || !course) {
    return payload;
  }

  return {
    ...payload,
    course_id: course.id,
  };
}

function toCourse(row: Record<string, unknown>): Course {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : null,
    isActive: row.is_active !== false,
  };
}

function toAdminUser(row: Record<string, unknown>): AdminUser {
  return {
    userId: String(row.user_id),
    email: typeof row.email === "string" ? row.email : null,
    owner: row.owner === true,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  };
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  throwIfError(response.error);
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

  throwIfError(response.error);
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

  throwIfError(response.error);
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

  throwIfError(response.error);
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

  throwIfError(response.error);
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

  throwIfError(response.error);
  return response.data ? toCourse(response.data as Record<string, unknown>) : null;
}

export async function listAdminUsers() {
  const client = getSchemaClient("public");
  const response = await client
    .from("app_admins")
    .select("user_id,email,owner,created_at")
    .order("created_at", { ascending: true });

  throwIfError(response.error);
  return ((response.data ?? []) as Record<string, unknown>[]).map(toAdminUser);
}

export async function createAdminUser(values: AdminUserInput) {
  const client = getSchemaClient("public");
  const response = await client
    .from("app_admins")
    .insert({
      user_id: values.userId.trim(),
      email: values.email?.trim() || null,
      owner: values.owner ?? false,
    })
    .select("user_id,email,owner,created_at")
    .single();

  throwIfError(response.error);
  return response.data
    ? toAdminUser(response.data as Record<string, unknown>)
    : null;
}

export async function updateAdminUser(
  userId: string,
  values: Partial<Omit<AdminUserInput, "userId">>,
) {
  const client = getSchemaClient("public");
  const payload: Record<string, CrudValue> = {};

  if (values.email !== undefined) {
    payload.email = values.email?.trim() || null;
  }

  if (values.owner !== undefined) {
    payload.owner = values.owner;
  }

  const response = await client
    .from("app_admins")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id,email,owner,created_at")
    .single();

  throwIfError(response.error);
  return response.data
    ? toAdminUser(response.data as Record<string, unknown>)
    : null;
}

export async function deleteAdminUser(userId: string) {
  const client = getSchemaClient("public");
  const response = await client
    .from("app_admins")
    .delete()
    .eq("user_id", userId);

  throwIfError(response.error);
}

export function getEditableFields(
  entity: EntityDefinition,
  mode: "create" | "edit",
) {
  const blockedKeys =
    mode === "create"
      ? new Set(["id", "createdAt", "updatedAt", "deletedAt"])
      : new Set(["id", "createdAt", "deletedAt"]);

  return entity.fields.filter(
    (field) => !field.readOnly && !blockedKeys.has(field.key),
  );
}

export function formatValue(value: CrudValue | undefined) {
  if (value === null || value === undefined || value === "") {
    return "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
  }

  if (typeof value === "boolean") {
    return value ? "\u0646\u0639\u0645" : "\u0644\u0627";
  }

  return String(value);
}

export function getRowLabel(entity: EntityDefinition, row: CrudRow) {
  const label = entity.displayFields
    .map((key) => formatValue(row[key]))
    .filter((value) => value !== "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F")
    .join(" ");

  return label || `${entity.singularLabel} #${formatValue(row.id)}`;
}

export async function listRows(entity: EntityDefinition, course?: Course) {
  const client = getSchemaClient(entity.schema);
  let query = client
    .from(entity.table)
    .select("*")
    .is("deleted_at", null)
    .order("id", { ascending: true });

  if (entity.courseScoped && course) {
    query = query.eq("course_id", course.id);
  }

  const response = await query;

  throwIfError(response.error);
  return ((response.data ?? []) as Record<string, unknown>[]).map((row) =>
    toAppRow(entity, row),
  );
}

export async function getRow(entity: EntityDefinition, id: number, course?: Course) {
  const client = getSchemaClient(entity.schema);
  let query = client
    .from(entity.table)
    .select("*")
    .eq("id", id);

  if (entity.courseScoped && course) {
    query = query.eq("course_id", course.id);
  }

  const response = await query.single();

  throwIfError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export async function createRow(
  entity: EntityDefinition,
  values: Record<string, CrudValue>,
  course?: Course,
) {
  const client = getSchemaClient(entity.schema);
  const response = await client
    .from(entity.table)
    .insert(applyCoursePayload(entity, toDbPayload(entity, values), course))
    .select()
    .single();

  throwIfError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

function getAppClient() {
  return getSchemaClient(appSchema);
}

export async function createRows(
  entity: EntityDefinition,
  values: Record<string, CrudValue>[],
  course?: Course,
) {
  if (values.length === 0) {
    return [];
  }

  const client = getSchemaClient(entity.schema);
  const response = await client
    .from(entity.table)
    .insert(
      values.map((value) =>
        applyCoursePayload(entity, toDbPayload(entity, value), course),
      ),
    )
    .select();

  throwIfError(response.error);
  return ((response.data ?? []) as Record<string, unknown>[]).map((row) =>
    toAppRow(entity, row),
  );
}

export async function updateRow(
  entity: EntityDefinition,
  id: number,
  values: Record<string, CrudValue>,
  course?: Course,
) {
  const client = getSchemaClient(entity.schema);
  let query = client
    .from(entity.table)
    .update(
      applyCoursePayload(
        entity,
        toDbPayload(entity, {
          ...values,
          updatedAt: new Date().toISOString(),
        }),
      ),
    )
    .eq("id", id);

  if (entity.courseScoped && course) {
    query = query.eq("course_id", course.id);
  }

  const response = await query.select().single();

  throwIfError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export async function softDeleteRow(entity: EntityDefinition, id: number, course?: Course) {
  const client = getSchemaClient(entity.schema);
  const now = new Date().toISOString();
  let query = client
    .from(entity.table)
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id);

  if (entity.courseScoped && course) {
    query = query.eq("course_id", course.id);
  }

  const response = await query.select().single();

  throwIfError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export function getInitialValue(
  field: FieldDefinition,
  row?: CrudRow,
): CrudValue {
  const value = row?.[field.key];

  if (value !== undefined) {
    return value;
  }

  if (field.type === "boolean") {
    return false;
  }

  if (field.key === "colorCode") {
    return "#fecdd3,#be123c";
  }

  return null;
}
