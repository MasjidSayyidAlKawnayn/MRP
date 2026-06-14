import type { CrudValue } from "./crud/data";
import {
  findEntityDefinition,
  getEntityDefinitions,
  type EntityId,
  type EntityKey,
  type SchemaName,
} from "./crud/entities";

export type WorkspacePage =
  | "home"
  | "logout"
  | "courseCreate"
  | "courseDelete"
  | "courseDetail"
  | "courseEdit"
  | "courses"
  | "dashboard"
  | "profile"
  | "settings";
export type ViewMode = "list" | "create" | "detail" | "edit";
export type CourseMode = "list" | "create" | "detail" | "edit" | "delete";
export type RouteSearch = {
  draft?: string;
  q?: string;
};
export type DraftValues = Record<string, CrudValue>;
export type WorkspaceContext = {
  cohortTag?: string;
  courseSlug: string;
};

export function getDefaultSchema(schemas: SchemaName[]) {
  return schemas[0] ?? "mqs";
}

export function getDefaultEntityKey(schema: SchemaName) {
  return getEntityDefinitions(schema)[0].id.split(".").at(-1) as EntityKey;
}

export function getEntityId(schema: SchemaName, entityKey: EntityKey): EntityId {
  return `${schema}.${entityKey}`;
}

export function validateSchema(schema: string | undefined, schemas: SchemaName[]) {
  return schema && schemas.includes(schema) ? schema : getDefaultSchema(schemas);
}

export function validateEntityKey(schema: SchemaName, entity: string | undefined) {
  const entityId = entity ? getEntityId(schema, entity as EntityKey) : undefined;
  return entityId && findEntityDefinition(entityId, getEntityDefinitions(schema))
    ? (entity as EntityKey)
    : getDefaultEntityKey(schema);
}

export function dashboardPath({
  cohortTag,
  courseSlug,
  entity,
  mode = "list",
  rowId,
  subpage,
}: {
  cohortTag?: string;
  courseSlug: string;
  entity: EntityKey;
  mode?: ViewMode;
  rowId?: CrudValue;
  subpage?: "deductions" | "manual" | "take" | "charts" | "phones" | "wizard";
}) {
  const cohortSegment = cohortTag ? `/cohorts/${cohortTag}` : "";
  const basePath = `/courses/${courseSlug}${cohortSegment}/dashboard/${entity}`;

  if (subpage === "manual") {
    return `${basePath}/manual`;
  }

  if (subpage === "deductions") {
    return `${basePath}/deductions`;
  }

  if (subpage === "take") {
    return `${basePath}/take`;
  }

  if (subpage === "charts") {
    return `${basePath}/charts`;
  }

  if (subpage === "phones") {
    return `${basePath}/phones`;
  }

  if (subpage === "wizard") {
    return `${basePath}/wizard`;
  }

  if (mode === "create") {
    return `${basePath}/new`;
  }

  if ((mode === "detail" || mode === "edit") && rowId !== undefined && rowId !== null) {
    return `${basePath}/${encodeURIComponent(String(rowId))}${mode === "edit" ? "/edit" : ""}`;
  }

  return basePath;
}

export function coursePath({
  courseSlug,
  mode = "list",
}: {
  courseSlug?: string;
  mode?: CourseMode;
}) {
  if (mode === "create") {
    return "/courses/new";
  }

  if (!courseSlug || mode === "list") {
    return "/courses";
  }

  if (mode === "edit") {
    return `/courses/${courseSlug}/edit`;
  }

  if (mode === "delete") {
    return `/courses/${courseSlug}/delete`;
  }

  return `/courses/${courseSlug}`;
}

export function encodeDraft(values: DraftValues) {
  return btoa(encodeURIComponent(JSON.stringify(values)));
}

export function decodeDraft(value: string | undefined): DraftValues | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(atob(value)));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as DraftValues)
      : undefined;
  } catch {
    return undefined;
  }
}

export function cleanSearch(search: RouteSearch = {}) {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined && value !== ""),
  ) as RouteSearch;
}
