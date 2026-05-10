import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createRow,
  formatValue,
  getEditableFields,
  getInitialValue,
  getRowLabel,
  listRows,
  softDeleteRow,
  updateRow,
  type CrudRow,
  type CrudValue,
} from "../crud/data";
import {
  findEntityDefinition,
  getEntityDefinitions,
  type EntityDefinition,
  type EntityId,
  type FieldDefinition,
  type SchemaName,
} from "../crud/entities";

type ViewMode = "list" | "create" | "detail" | "edit";
type RelationOptions = Partial<Record<EntityId, CrudRow[]>>;

function parseInputValue(field: FieldDefinition, value: string): CrudValue {
  if (field.type === "boolean") {
    return value === "true";
  }

  if (value === "") {
    return null;
  }

  if (field.type === "number") {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return null;
    }

    return numberValue;
  }

  if (field.type === "datetime") {
    return new Date(value).toISOString();
  }

  return value;
}

function toInputValue(value: CrudValue, field: FieldDefinition) {
  if (value === null) {
    return "";
  }

  if (field.type === "datetime" && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toISOString().slice(0, 16);
  }

  return String(value);
}

function getField(entity: EntityDefinition, key: string) {
  return entity.fields.find((field) => field.key === key);
}

function getRelationLabel(
  field: FieldDefinition,
  value: CrudValue | undefined,
  relationOptions: RelationOptions,
  entityDefinitions: EntityDefinition[],
) {
  if (
    !field.relation ||
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return formatValue(value);
  }

  const relatedEntity = findEntityDefinition(
    field.relation.entityId,
    entityDefinitions,
  );
  const relatedRows = relationOptions[field.relation.entityId] ?? [];
  const relatedRow = relatedRows.find(
    (row) => String(row.id) === String(value),
  );

  if (!relatedEntity || !relatedRow) {
    return `#${formatValue(value)}`;
  }

  return getRowLabel(relatedEntity, relatedRow);
}

function formatFieldValue(
  field: FieldDefinition | undefined,
  value: CrudValue | undefined,
  relationOptions: RelationOptions,
  entityDefinitions: EntityDefinition[],
) {
  if (!field) {
    return formatValue(value);
  }

  if (field.type === "datetime" && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
  }

  if (field.type === "date" && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
          date,
        );
  }

  return getRelationLabel(field, value, relationOptions, entityDefinitions);
}

function EntityNav({
  activeEntityId,
  entityDefinitions,
  onSelect,
}: {
  activeEntityId: EntityId;
  entityDefinitions: EntityDefinition[];
  onSelect: (entityId: EntityId) => void;
}) {
  return (
    <aside className="border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        CRUD pages
      </h2>
      <div className="mt-3 grid gap-1">
        {entityDefinitions
          .filter((entity) => entity.showInNav !== false)
          .map((entity) => (
            <button
              className={`px-3 py-2 text-left text-sm font-medium transition ${
                entity.id === activeEntityId
                  ? "bg-cedar text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              key={entity.id}
              onClick={() => onSelect(entity.id)}
              type="button"
            >
              {entity.label}
            </button>
          ))}
      </div>
    </aside>
  );
}

function EntityForm({
  entity,
  entityDefinitions,
  mode,
  relationOptions,
  row,
  onCancel,
  onSubmit,
}: {
  entity: EntityDefinition;
  entityDefinitions: EntityDefinition[];
  mode: "create" | "edit";
  relationOptions: RelationOptions;
  row?: CrudRow;
  onCancel: () => void;
  onSubmit: (values: Record<string, CrudValue>) => Promise<void>;
}) {
  const fields = useMemo(() => getEditableFields(entity, mode), [entity, mode]);
  const [values, setValues] = useState<Record<string, CrudValue>>(() =>
    Object.fromEntries(
      fields.map((field) => [field.key, getInitialValue(field, row)]),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(
      Object.fromEntries(
        fields.map((field) => [field.key, getInitialValue(field, row)]),
      ),
    );
  }, [fields, row]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await onSubmit(values);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save this record.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label
            className={field.type === "textarea" ? "md:col-span-2" : undefined}
            key={field.key}
          >
            <span className="text-sm font-medium text-slate-700">
              {field.label}
            </span>

            {field.relation ? (
              <select
                className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: parseInputValue(field, event.target.value),
                  }))
                }
                required={field.required}
                value={toInputValue(values[field.key] ?? null, field)}
              >
                <option value="">
                  {field.required ? `Select ${field.label}` : "None"}
                </option>
                {(relationOptions[field.relation.entityId] ?? []).map(
                  (option) => {
                    const optionId = option.id;

                    return (
                      <option key={String(optionId)} value={String(optionId)}>
                        {getRowLabel(
                          findEntityDefinition(
                            field.relation!.entityId,
                            entityDefinitions,
                          )!,
                          option,
                        )}
                      </option>
                    );
                  },
                )}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                className="mt-1 min-h-28 w-full border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: parseInputValue(field, event.target.value),
                  }))
                }
                required={field.required}
                value={toInputValue(values[field.key] ?? null, field)}
              />
            ) : field.type === "boolean" ? (
              <select
                className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: parseInputValue(field, event.target.value),
                  }))
                }
                required={field.required}
                value={toInputValue(values[field.key] ?? false, field)}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input
                className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: parseInputValue(field, event.target.value),
                  }))
                }
                required={field.required}
                max={field.max}
                min={field.min}
                type={
                  field.type === "number"
                    ? "number"
                    : field.type === "date"
                      ? "date"
                      : field.type === "datetime"
                        ? "datetime-local"
                        : "text"
                }
                value={toInputValue(values[field.key] ?? null, field)}
              />
            )}
            {field.helpText ? (
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {field.helpText}
              </span>
            ) : null}
          </label>
        ))}
      </div>

      {error ? (
        <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="bg-cedar px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DetailView({
  entity,
  entityDefinitions,
  row,
  onEdit,
  relationOptions,
}: {
  entity: EntityDefinition;
  entityDefinitions: EntityDefinition[];
  row: CrudRow;
  onEdit: () => void;
  relationOptions: RelationOptions;
}) {
  return (
    <div className="border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">
          {getRowLabel(entity, row)}
        </h2>
        <button
          className="bg-ink px-4 py-2 text-sm font-semibold text-white"
          onClick={onEdit}
          type="button"
        >
          Edit
        </button>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-2">
        {entity.fields.map((field) => (
          <div className="border-b border-slate-200 pb-3" key={field.key}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {field.label}
            </dt>
            <dd className="mt-1 break-words text-sm text-ink">
              {formatFieldValue(
                field,
                row[field.key],
                relationOptions,
                entityDefinitions,
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function getConfiguredSchemas() {
  const configuredSchemas = import.meta.env.VITE_NEON_SCHEMAS;

  if (!configuredSchemas) {
    return ["mqs"];
  }

  const schemas = configuredSchemas
    .split(",")
    .map((schema) => schema.trim())
    .filter(Boolean);

  return schemas.length ? schemas : ["mqs"];
}

function SchemaPicker({
  activeSchema,
  schemas,
  onSelect,
}: {
  activeSchema: SchemaName;
  schemas: SchemaName[];
  onSelect: (schema: SchemaName) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:w-64">
      <span>Schema</span>
      <select
        className="border border-slate-300 bg-white px-3 py-2 text-sm"
        onChange={(event) => onSelect(event.target.value)}
        value={activeSchema}
      >
        {schemas.map((schema) => (
          <option key={schema} value={schema}>
            {schema}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CrudDashboard() {
  const schemas = useMemo(() => getConfiguredSchemas(), []);
  const [activeSchema, setActiveSchema] = useState<SchemaName>(schemas[0]);
  const entityDefinitions = useMemo(
    () => getEntityDefinitions(activeSchema),
    [activeSchema],
  );
  const [activeEntityId, setActiveEntityId] = useState<EntityId>(
    entityDefinitions[0].id,
  );
  const activeEntity =
    findEntityDefinition(activeEntityId, entityDefinitions) ??
    entityDefinitions[0];
  const [rows, setRows] = useState<CrudRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<CrudRow | null>(null);
  const [mode, setMode] = useState<ViewMode>("list");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationOptions, setRelationOptions] = useState<RelationOptions>({});
  const [searchTerm, setSearchTerm] = useState("");

  const relationEntityIds = useMemo(
    () =>
      Array.from(
        new Set(
          activeEntity.fields
            .map((field) => field.relation?.entityId)
            .filter((entityId): entityId is EntityId => Boolean(entityId)),
        ),
      ),
    [activeEntity],
  );

  async function refreshRows(entity = activeEntity) {
    setIsLoading(true);
    setError(null);

    try {
      setRows(await listRows(entity));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load records.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setActiveEntityId(entityDefinitions[0].id);
  }, [entityDefinitions]);

  useEffect(() => {
    setSelectedRow(null);
    setSearchTerm("");
    setMode("list");
    void refreshRows(activeEntity);
  }, [activeEntity]);

  useEffect(() => {
    let isMounted = true;

    async function loadRelationOptions() {
      const entries = await Promise.all(
        relationEntityIds.map(async (entityId) => {
          const entity = findEntityDefinition(entityId, entityDefinitions);
          return entity ? ([entityId, await listRows(entity)] as const) : null;
        }),
      );

      if (isMounted) {
        setRelationOptions(
          Object.fromEntries(
            entries.filter((entry): entry is [EntityId, CrudRow[]] =>
              Boolean(entry),
            ),
          ),
        );
      }
    }

    if (relationEntityIds.length) {
      void loadRelationOptions().catch(() => setRelationOptions({}));
    } else {
      setRelationOptions({});
    }

    return () => {
      isMounted = false;
    };
  }, [entityDefinitions, relationEntityIds]);

  async function handleSoftDelete(row: CrudRow) {
    const label = getRowLabel(activeEntity, row);
    const confirmed = window.confirm(
      `Delete ${label}? This hides the record from the app.`,
    );

    if (!confirmed) {
      return;
    }

    const id = Number(row.id);

    if (!Number.isFinite(id)) {
      setError("This record does not have a valid ID.");
      return;
    }

    await softDeleteRow(activeEntity, id);
    setSelectedRow(null);
    setMode("list");
    await refreshRows();
  }

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((row) =>
      activeEntity.fields.some((field) =>
        formatFieldValue(
          field,
          row[field.key],
          relationOptions,
          entityDefinitions,
        )
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    );
  }, [activeEntity, entityDefinitions, relationOptions, rows, searchTerm]);

  async function handleCreate(values: Record<string, CrudValue>) {
    await createRow(activeEntity, values);
    setMode("list");
    await refreshRows();
  }

  async function handleUpdate(values: Record<string, CrudValue>) {
    if (!selectedRow) {
      return;
    }

    await updateRow(activeEntity, Number(selectedRow.id), values);
    setMode("list");
    setSelectedRow(null);
    await refreshRows();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <EntityNav
        activeEntityId={activeEntity.id}
        entityDefinitions={entityDefinitions}
        onSelect={setActiveEntityId}
      />

      <section className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cedar">
              Admin CRUD
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">
              {activeEntity.label}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {activeEntity.description}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <SchemaPicker
              activeSchema={activeSchema}
              onSelect={setActiveSchema}
              schemas={schemas}
            />
            <button
              className="bg-cedar px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                setSelectedRow(null);
                setMode("create");
              }}
              type="button"
            >
              New {activeEntity.singularLabel}
            </button>
          </div>
        </div>

        {error ? (
          <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {mode === "create" ? (
          <div className="border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-ink">
              Create {activeEntity.singularLabel}
            </h2>
            <EntityForm
              entity={activeEntity}
              entityDefinitions={entityDefinitions}
              mode="create"
              onCancel={() => setMode("list")}
              onSubmit={handleCreate}
              relationOptions={relationOptions}
            />
          </div>
        ) : null}

        {mode === "edit" && selectedRow ? (
          <div className="border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-ink">
              Edit {getRowLabel(activeEntity, selectedRow)}
            </h2>
            <EntityForm
              entity={activeEntity}
              entityDefinitions={entityDefinitions}
              mode="edit"
              onCancel={() => setMode("detail")}
              onSubmit={handleUpdate}
              relationOptions={relationOptions}
              row={selectedRow}
            />
          </div>
        ) : null}

        {mode === "detail" && selectedRow ? (
          <DetailView
            entity={activeEntity}
            entityDefinitions={entityDefinitions}
            onEdit={() => setMode("edit")}
            relationOptions={relationOptions}
            row={selectedRow}
          />
        ) : null}

        <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Records</h2>
              <p className="mt-1 text-xs text-slate-500">
                Showing {filteredRows.length} of {rows.length}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="w-56 max-w-full border border-slate-300 px-3 py-1.5 text-sm"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`Search ${activeEntity.label.toLowerCase()}`}
                type="search"
                value={searchTerm}
              />
              <button
                className="border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
                onClick={() => void refreshRows()}
                type="button"
              >
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <p className="p-4 text-sm text-slate-600">Loading records...</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-600">No records found.</p>
          ) : filteredRows.length === 0 ? (
            <p className="p-4 text-sm text-slate-600">
              No records match your search.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {activeEntity.listFields.map((key) => (
                      <th
                        className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600"
                        key={key}
                      >
                        {getField(activeEntity, key)?.label ?? key}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={String(row.id)}>
                      {activeEntity.listFields.map((key) => (
                        <td className="whitespace-nowrap px-4 py-3" key={key}>
                          {formatFieldValue(
                            getField(activeEntity, key),
                            row[key],
                            relationOptions,
                            entityDefinitions,
                          )}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="text-sm font-semibold text-cedar"
                            onClick={() => {
                              setSelectedRow(row);
                              setMode("detail");
                            }}
                            type="button"
                          >
                            View
                          </button>
                          <button
                            className="text-sm font-semibold text-ink"
                            onClick={() => {
                              setSelectedRow(row);
                              setMode("edit");
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm font-semibold text-red-700"
                            onClick={() => void handleSoftDelete(row)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
