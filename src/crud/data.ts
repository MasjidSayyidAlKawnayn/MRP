import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";
import type { EntityDefinition, FieldDefinition, SchemaName } from "./entities";

export type CrudRow = Record<string, string | number | boolean | null>;
export type CrudValue = string | number | boolean | null;

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

export async function listRows(entity: EntityDefinition) {
  const client = getSchemaClient(entity.schema);
  const response = await client
    .from(entity.table)
    .select("*")
    .is("deleted_at", null)
    .order("id", { ascending: true });

  throwIfError(response.error);
  return ((response.data ?? []) as Record<string, unknown>[]).map((row) =>
    toAppRow(entity, row),
  );
}

export async function getRow(entity: EntityDefinition, id: number) {
  const client = getSchemaClient(entity.schema);
  const response = await client
    .from(entity.table)
    .select("*")
    .eq("id", id)
    .single();

  throwIfError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export async function createRow(
  entity: EntityDefinition,
  values: Record<string, CrudValue>,
) {
  const client = getSchemaClient(entity.schema);
  const response = await client
    .from(entity.table)
    .insert(toDbPayload(entity, values))
    .select()
    .single();

  throwIfError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export async function updateRow(
  entity: EntityDefinition,
  id: number,
  values: Record<string, CrudValue>,
) {
  const client = getSchemaClient(entity.schema);
  const response = await client
    .from(entity.table)
    .update(
      toDbPayload(entity, {
        ...values,
        updatedAt: new Date().toISOString(),
      }),
    )
    .eq("id", id)
    .select()
    .single();

  throwIfError(response.error);
  return response.data
    ? toAppRow(entity, response.data as Record<string, unknown>)
    : null;
}

export async function softDeleteRow(entity: EntityDefinition, id: number) {
  const client = getSchemaClient(entity.schema);
  const now = new Date().toISOString();
  const response = await client
    .from(entity.table)
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id)
    .select()
    .single();

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

  return null;
}
