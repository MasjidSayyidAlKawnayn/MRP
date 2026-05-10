import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Database,
  Eye,
  FileText,
  GraduationCap,
  Layers3,
  ListFilter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  type EntityKey,
  type FieldDefinition,
  type SchemaName,
} from "../crud/entities";

type ViewMode = "list" | "create" | "detail" | "edit";
type RelationOptions = Partial<Record<EntityId, CrudRow[]>>;

const ui = {
  crudPages: "\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0645\u0646\u0635\u0629",
  adminCrud: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
  schema: "\u0627\u0644\u0645\u062E\u0637\u0637",
  records: "\u0627\u0644\u0633\u062C\u0644\u0627\u062A",
  totalRecords: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0633\u062C\u0644\u0627\u062A",
  visibleRecords: "\u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0638\u0627\u0647\u0631\u0629",
  tableFields: "\u0623\u0639\u0645\u062F\u0629 \u0627\u0644\u062C\u062F\u0648\u0644",
  relations: "\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
  add: "\u0625\u0636\u0627\u0641\u0629",
  create: "\u0625\u0646\u0634\u0627\u0621",
  edit: "\u062A\u0639\u062F\u064A\u0644",
  view: "\u0639\u0631\u0636",
  delete: "\u062D\u0630\u0641",
  refresh: "\u062A\u062D\u062F\u064A\u062B",
  save: "\u062D\u0641\u0638",
  saving: "\u062C\u0627\u0631 \u0627\u0644\u062D\u0641\u0638...",
  cancel: "\u0625\u0644\u063A\u0627\u0621",
  none: "\u0628\u062F\u0648\u0646",
  select: "\u0627\u062E\u062A\u0631",
  yes: "\u0646\u0639\u0645",
  no: "\u0644\u0627",
  loading: "\u062C\u0627\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0633\u062C\u0644\u0627\u062A...",
  noRecords: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0633\u062C\u0644\u0627\u062A \u0628\u0639\u062F.",
  noMatches: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0628\u062D\u062B.",
  search: "\u0628\u062D\u062B",
  actions: "\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A",
  showing: "\u0627\u0644\u0645\u0639\u0631\u0648\u0636",
  from: "\u0645\u0646",
  createError: "\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u0647\u0630\u0627 \u0627\u0644\u0633\u062C\u0644.",
  loadError: "\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0633\u062C\u0644\u0627\u062A.",
  invalidId: "\u0647\u0630\u0627 \u0627\u0644\u0633\u062C\u0644 \u0644\u0627 \u064A\u062D\u0645\u0644 \u0645\u0639\u0631\u0641\u0627 \u0635\u0627\u0644\u062D\u0627.",
  confirmDelete: "\u061F\u0647\u0644 \u062A\u0631\u064A\u062F \u062D\u0630\u0641",
  hideRecord: "\u0633\u064A\u062A\u0645 \u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0633\u062C\u0644 \u0645\u0646 \u0627\u0644\u062A\u0637\u0628\u064A\u0642.",
};

const entityIcons: Record<EntityKey, LucideIcon> = {
  students: GraduationCap,
  teachers: UserRound,
  groups: UsersRound,
  assignments: FileText,
  pages: BookOpen,
  attendanceSessions: CalendarCheck,
  attendanceRecords: CheckCircle2,
};

function getEntityKey(entityId: EntityId) {
  return entityId.split(".").at(-1) as EntityKey;
}

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
      : new Intl.DateTimeFormat("ar", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
  }

  if (field.type === "date" && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(date);
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
    <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-xl shadow-cedar/5 backdrop-blur">
      <h2 className="px-2 text-xs font-bold text-slate-500">{ui.crudPages}</h2>
      <div className="mt-4 grid gap-2">
        {entityDefinitions
          .filter((entity) => entity.showInNav !== false)
          .map((entity) => {
            const Icon = entityIcons[getEntityKey(entity.id)] ?? Database;

            return (
              <button
                className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 text-right text-sm font-bold transition ${
                  entity.id === activeEntityId
                    ? "bg-cedar text-white shadow-lg shadow-cedar/25"
                    : "text-slate-700 hover:bg-cedar/5 hover:text-cedar"
                }`}
                key={entity.id}
                onClick={() => onSelect(entity.id)}
                type="button"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate">{entity.label}</span>
                  <span className="mt-0.5 block truncate text-xs font-medium opacity-75">
                    {entity.singularLabel}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </aside>
  );
}

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink shadow-sm transition placeholder:text-slate-400 focus:border-cedar";

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
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
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
            <span className="text-sm font-bold text-slate-700">
              {field.label}
            </span>

            {field.relation ? (
              <select
                className={inputClass}
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
                  {field.required ? `${ui.select} ${field.label}` : ui.none}
                </option>
                {(relationOptions[field.relation.entityId] ?? []).map(
                  (option) => {
                    const optionId = option.id;
                    const relationEntity = findEntityDefinition(
                      field.relation!.entityId,
                      entityDefinitions,
                    );

                    return (
                      <option key={String(optionId)} value={String(optionId)}>
                        {relationEntity
                          ? getRowLabel(relationEntity, option)
                          : formatValue(optionId)}
                      </option>
                    );
                  },
                )}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                className={`${inputClass} min-h-32 resize-y leading-7`}
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
                className={inputClass}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: parseInputValue(field, event.target.value),
                  }))
                }
                required={field.required}
                value={toInputValue(values[field.key] ?? false, field)}
              >
                <option value="true">{ui.yes}</option>
                <option value="false">{ui.no}</option>
              </select>
            ) : (
              <input
                className={inputClass}
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
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                {field.helpText}
              </span>
            ) : null}
          </label>
        ))}
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-2xl bg-cedar px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cedar/20 transition hover:bg-palm disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {isSaving ? ui.saving : ui.save}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={onCancel}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {ui.cancel}
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
    <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-cedar/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-cedar">{ui.view}</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">
            {getRowLabel(entity, row)}
          </h2>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-palm"
          onClick={onEdit}
          type="button"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {ui.edit}
        </button>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-2">
        {entity.fields.map((field) => (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4" key={field.key}>
            <dt className="text-xs font-bold text-slate-500">{field.label}</dt>
            <dd className="mt-2 break-words text-sm font-semibold text-ink">
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
    <label className="flex min-w-48 flex-col gap-2 text-sm font-bold text-slate-700">
      <span>{ui.schema}</span>
      <select
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
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

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cedar/10 text-cedar">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
        </div>
      </div>
    </div>
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
      setError(caughtError instanceof Error ? caughtError.message : ui.loadError);
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
    const confirmed = window.confirm(`${ui.confirmDelete} ${label}؟ ${ui.hideRecord}`);

    if (!confirmed) {
      return;
    }

    const id = Number(row.id);

    if (!Number.isFinite(id)) {
      setError(ui.invalidId);
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

  const ActiveIcon = entityIcons[getEntityKey(activeEntity.id)] ?? Database;

  return (
    <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
      <EntityNav
        activeEntityId={activeEntity.id}
        entityDefinitions={entityDefinitions}
        onSelect={setActiveEntityId}
      />

      <section className="min-w-0 space-y-5">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-cedar/5 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cedar text-white shadow-lg shadow-cedar/25">
                <ActiveIcon className="h-7 w-7" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-cedar">{ui.adminCrud}</p>
                <h1 className="mt-1 text-3xl font-bold text-ink">
                  {activeEntity.label}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  {activeEntity.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <SchemaPicker
                activeSchema={activeSchema}
                onSelect={setActiveSchema}
                schemas={schemas}
              />
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => void refreshRows()}
                type="button"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {ui.refresh}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-cedar px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cedar/20 transition hover:bg-palm"
                onClick={() => {
                  setSelectedRow(null);
                  setMode("create");
                }}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {ui.add} {activeEntity.singularLabel}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Database} label={ui.totalRecords} value={rows.length} />
          <StatCard icon={ListFilter} label={ui.visibleRecords} value={filteredRows.length} />
          <StatCard icon={Layers3} label={ui.tableFields} value={activeEntity.listFields.length} />
          <StatCard icon={RefreshCw} label={ui.relations} value={relationEntityIds.length} />
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {mode === "create" ? (
          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-cedar/5">
            <h2 className="mb-5 text-xl font-bold text-ink">
              {ui.create} {activeEntity.singularLabel}
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
          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-cedar/5">
            <h2 className="mb-5 text-xl font-bold text-ink">
              {ui.edit} {getRowLabel(activeEntity, selectedRow)}
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

        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-xl shadow-cedar/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-ink">{ui.records}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {ui.showing} {filteredRows.length} {ui.from} {rows.length}
              </p>
            </div>
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pe-4 ps-10 text-sm shadow-sm"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`${ui.search} ${activeEntity.label}`}
                type="search"
                value={searchTerm}
              />
            </label>
          </div>

          {isLoading ? (
            <p className="flex items-center gap-2 p-5 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {ui.loading}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{ui.noRecords}</p>
          ) : filteredRows.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{ui.noMatches}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-right text-sm">
                <thead className="bg-mist/70">
                  <tr>
                    {activeEntity.listFields.map((key) => (
                      <th className="whitespace-nowrap px-5 py-4 font-bold text-slate-600" key={key}>
                        {getField(activeEntity, key)?.label ?? key}
                      </th>
                    ))}
                    <th className="px-5 py-4 font-bold text-slate-600">
                      {ui.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr className="transition hover:bg-cedar/5" key={String(row.id)}>
                      {activeEntity.listFields.map((key) => (
                        <td className="max-w-[18rem] truncate whitespace-nowrap px-5 py-4 text-slate-700" key={key}>
                          {formatFieldValue(
                            getField(activeEntity, key),
                            row[key],
                            relationOptions,
                            entityDefinitions,
                          )}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <ActionButton icon={Eye} label={ui.view} onClick={() => {
                            setSelectedRow(row);
                            setMode("detail");
                          }} />
                          <ActionButton icon={Pencil} label={ui.edit} onClick={() => {
                            setSelectedRow(row);
                            setMode("edit");
                          }} />
                          <ActionButton danger icon={Trash2} label={ui.delete} onClick={() => void handleSoftDelete(row)} />
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

function ActionButton({
  danger,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
        danger
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-slate-100 text-slate-700 hover:bg-cedar/10 hover:text-cedar"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
