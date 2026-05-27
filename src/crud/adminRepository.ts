import { getSchemaClient } from "../data/neon";
import { throwIfDataError } from "./dataErrors";
import { toAdminUser } from "./dataMappers";
import type { AdminUserInput, CrudValue } from "./dataTypes";

const adminColumns = "user_id,email,owner,created_at";

export async function listAdminUsers() {
  const client = getSchemaClient("public");
  const response = await client
    .from("app_admins")
    .select(adminColumns)
    .order("created_at", { ascending: true });

  throwIfDataError(response.error);
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
    .select(adminColumns)
    .single();

  throwIfDataError(response.error);
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
    .select(adminColumns)
    .single();

  throwIfDataError(response.error);
  return response.data
    ? toAdminUser(response.data as Record<string, unknown>)
    : null;
}

export async function deleteAdminUser(userId: string) {
  const client = getSchemaClient("public");
  const response = await client.from("app_admins").delete().eq("user_id", userId);

  throwIfDataError(response.error);
}
