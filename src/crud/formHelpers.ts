import type { EntityDefinition, FieldDefinition } from "./entities";
import type { CrudRow, CrudValue } from "./dataTypes";

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
