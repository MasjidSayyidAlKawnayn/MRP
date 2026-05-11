import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Database,
  Eye,
  FileText,
  GraduationCap,
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
import {
  cleanSearch,
  dashboardPath,
  decodeDraft,
  encodeDraft,
  getEntityId,
  type DraftValues,
  type RouteSearch,
  type ViewMode,
} from "../routing";

type RelationOptions = Partial<Record<EntityId, CrudRow[]>>;

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function getEditDistanceWithinLimit(
  left: string,
  right: string,
  maxDistance: number,
) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );

      current[rightIndex] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }

    previous = current;
  }

  return previous[right.length];
}

function getAllowedFuzzyDistance(term: string) {
  if (term.length <= 2) {
    return 0;
  }

  if (term.length <= 5) {
    return 1;
  }

  return 2;
}

function searchTermMatchesText(term: string, text: string) {
  if (text.includes(term)) {
    return true;
  }

  const maxDistance = getAllowedFuzzyDistance(term);

  if (maxDistance === 0) {
    return false;
  }

  return text
    .split(" ")
    .some(
      (word) =>
        Math.abs(word.length - term.length) <= maxDistance &&
        getEditDistanceWithinLimit(term, word, maxDistance) <= maxDistance,
    );
}

const groupColorClasses = [
  {
    row: "bg-rose-50/70 hover:bg-rose-100/75",
    chip: "border-rose-200 bg-rose-100 text-rose-800",
    marker: "bg-rose-500",
  },
  {
    row: "bg-sky-50/70 hover:bg-sky-100/75",
    chip: "border-sky-200 bg-sky-100 text-sky-800",
    marker: "bg-sky-500",
  },
  {
    row: "bg-lime-50/75 hover:bg-lime-100/80",
    chip: "border-lime-300 bg-lime-100 text-lime-800",
    marker: "bg-lime-600",
  },
  {
    row: "bg-indigo-50/65 hover:bg-indigo-100/70",
    chip: "border-indigo-200 bg-indigo-100 text-indigo-800",
    marker: "bg-indigo-500",
  },
  {
    row: "bg-violet-50/60 hover:bg-violet-100/70",
    chip: "border-violet-200 bg-violet-100 text-violet-800",
    marker: "bg-violet-500",
  },
  {
    row: "bg-teal-50/70 hover:bg-teal-100/75",
    chip: "border-teal-200 bg-teal-100 text-teal-800",
    marker: "bg-teal-500",
  },
  {
    row: "bg-orange-50/65 hover:bg-orange-100/70",
    chip: "border-orange-200 bg-orange-100 text-orange-800",
    marker: "bg-orange-500",
  },
  {
    row: "bg-cyan-50/70 hover:bg-cyan-100/75",
    chip: "border-cyan-200 bg-cyan-100 text-cyan-800",
    marker: "bg-cyan-500",
  },
] as const;

const ui = {
  crudPages: "\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0645\u0646\u0635\u0629",
  adminCrud: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
  settings: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
  settingsTitle: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
  settingsBody:
    "\u0627\u062E\u062A\u0631 \u0645\u062E\u0637\u0637 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0630\u064A \u0633\u062A\u0639\u0645\u0644 \u0639\u0644\u064A\u0647 \u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629.",
  activeSchema: "\u0627\u0644\u0645\u062E\u0637\u0637 \u0627\u0644\u0646\u0634\u0637",
  schema: "\u0627\u0644\u0645\u062E\u0637\u0637",
  data: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
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
  loading: "\u062C\u0627\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...",
  noRecords: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0639\u062F.",
  noMatches: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0628\u062D\u062B.",
  search: "\u0628\u062D\u062B",
  actions: "\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A",
  showing: "\u0627\u0644\u0645\u0639\u0631\u0648\u0636",
  from: "\u0645\u0646",
  createError: "\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u0647\u0630\u0647 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.",
  loadError: "\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.",
  invalidId: "\u0647\u0630\u0627 \u0627\u0644\u0639\u0646\u0635\u0631 \u0644\u0627 \u064A\u062D\u0645\u0644 \u0645\u0639\u0631\u0641\u0627 \u0635\u0627\u0644\u062D\u0627.",
  confirmDelete: "\u061F\u0647\u0644 \u062A\u0631\u064A\u062F \u062D\u0630\u0641",
  hideRecord: "\u0633\u064A\u062A\u0645 \u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0639\u0646\u0635\u0631 \u0645\u0646 \u0627\u0644\u062A\u0637\u0628\u064A\u0642.",
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

function getGroupColor(value: CrudValue | undefined) {
  const text = formatValue(value);
  const hash = Array.from(text).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return groupColorClasses[hash % groupColorClasses.length];
}

function getRelatedRow(
  field: FieldDefinition | undefined,
  value: CrudValue | undefined,
  relationOptions: RelationOptions,
) {
  if (
    !field?.relation ||
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return (
    relationOptions[field.relation.entityId]?.find(
      (row) => String(row.id) === String(value),
    ) ?? null
  );
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
    <aside className="min-w-0 overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-3 shadow-xl shadow-cedar/5 backdrop-blur sm:p-4">
      <h2 className="px-2 text-xs font-bold text-slate-500">{ui.crudPages}</h2>
      <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 lg:mt-4 lg:grid lg:overflow-visible lg:pb-0">
        {entityDefinitions
          .filter((entity) => entity.showInNav !== false)
          .map((entity) => {
            const Icon = entityIcons[getEntityKey(entity.id)] ?? Database;

            return (
              <button
                className={`flex min-h-14 min-w-[11rem] shrink-0 items-center gap-3 rounded-2xl px-3 py-2 text-right text-sm font-bold transition lg:min-w-0 lg:shrink ${
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
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-ink shadow-sm transition placeholder:text-slate-400 focus:border-cedar sm:text-sm";

function EntityForm({
  entity,
  entityDefinitions,
  mode,
  relationOptions,
  row,
  draft,
  onCancel,
  onDraftChange,
  onSubmit,
}: {
  entity: EntityDefinition;
  entityDefinitions: EntityDefinition[];
  mode: "create" | "edit";
  relationOptions: RelationOptions;
  row?: CrudRow;
  draft?: DraftValues;
  onCancel: () => void;
  onDraftChange: (values: DraftValues) => void;
  onSubmit: (values: Record<string, CrudValue>) => Promise<void>;
}) {
  const fields = useMemo(() => getEditableFields(entity, mode), [entity, mode]);
  const [values, setValues] = useState<Record<string, CrudValue>>(() =>
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        draft?.[field.key] ?? getInitialValue(field, row),
      ]),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          draft?.[field.key] ?? getInitialValue(field, row),
        ]),
      ),
    );
  }, [draft, fields, row]);

  function updateField(field: FieldDefinition, value: string) {
    setValues((current) => {
      const next = {
        ...current,
        [field.key]: parseInputValue(field, value),
      };
      onDraftChange(next);
      return next;
    });
  }

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
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label
            className={field.type === "textarea" ? "sm:col-span-2" : undefined}
            key={field.key}
          >
            <span className="text-sm font-bold text-slate-700">
              {field.label}
            </span>

            {field.relation ? (
              <select
                className={inputClass}
                onChange={(event) => updateField(field, event.target.value)}
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
                onChange={(event) => updateField(field, event.target.value)}
                required={field.required}
                value={toInputValue(values[field.key] ?? null, field)}
              />
            ) : field.type === "boolean" ? (
              <select
                className={inputClass}
                onChange={(event) => updateField(field, event.target.value)}
                required={field.required}
                value={toInputValue(values[field.key] ?? false, field)}
              >
                <option value="true">{ui.yes}</option>
                <option value="false">{ui.no}</option>
              </select>
            ) : (
              <input
                className={inputClass}
                onChange={(event) => updateField(field, event.target.value)}
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
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cedar px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cedar/20 transition hover:bg-palm disabled:opacity-60 sm:w-auto"
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
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
    <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-cedar/5 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-cedar">{ui.view}</p>
          <h2 className="mt-1 break-words text-xl font-bold text-ink sm:text-2xl">
            {getRowLabel(entity, row)}
          </h2>
        </div>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-palm sm:w-auto sm:py-2"
          onClick={onEdit}
          type="button"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {ui.edit}
        </button>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
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

export function getConfiguredSchemas() {
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
    <label className="flex w-full flex-col gap-2 text-sm font-bold text-slate-700 sm:min-w-48 sm:w-auto">
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

export function SchemaSettingsPage({
  activeSchema,
  schemas,
  onSelect,
}: {
  activeSchema: SchemaName;
  schemas: SchemaName[];
  onSelect: (schema: SchemaName) => void;
}) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-cedar/5 backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-cedar">{ui.settings}</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
            {ui.settingsTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            {ui.settingsBody}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cedar text-white shadow-lg shadow-cedar/25 sm:h-14 sm:w-14">
          <Database className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <SchemaPicker
            activeSchema={activeSchema}
            onSelect={onSelect}
            schemas={schemas}
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-slate-500">{ui.activeSchema}</p>
          <p className="mt-2 break-all text-2xl font-bold text-ink">
            {activeSchema}
          </p>
        </div>
      </div>
    </section>
  );
}

export function CrudDashboard({
  activeEntityKey,
  activeSchema,
  mode,
  rowId,
  routeSearch,
  topAccessory,
}: {
  activeEntityKey: EntityKey;
  activeSchema: SchemaName;
  mode: ViewMode;
  rowId?: string;
  routeSearch: RouteSearch;
  topAccessory: ReactNode;
}) {
  const navigate = useNavigate();
  const entityDefinitions = useMemo(
    () => getEntityDefinitions(activeSchema),
    [activeSchema],
  );
  const activeEntityId = getEntityId(activeSchema, activeEntityKey);
  const activeEntity =
    findEntityDefinition(activeEntityId, entityDefinitions) ??
    entityDefinitions[0];
  const [rows, setRows] = useState<CrudRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<CrudRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationOptions, setRelationOptions] = useState<RelationOptions>({});
  const searchTerm = routeSearch.q ?? "";
  const draft = useMemo(() => decodeDraft(routeSearch.draft), [routeSearch.draft]);

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
    setSelectedRow(null);
    void refreshRows(activeEntity);
  }, [activeEntity]);

  useEffect(() => {
    if (!rowId || (mode !== "detail" && mode !== "edit")) {
      setSelectedRow(null);
      return;
    }

    const row = rows.find(
      (currentRow) => String(currentRow.id) === String(rowId),
    );

    setSelectedRow(row ?? null);
  }, [mode, rowId, rows]);

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
    await refreshRows();
    void navigate({
      to: dashboardPath({
        schema: activeSchema,
        entity: getEntityKey(activeEntity.id),
      }),
      search: cleanSearch({ q: searchTerm }),
    });
  }

  const filteredRows = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    if (!normalizedSearch) {
      return rows;
    }

    const searchTerms = normalizedSearch.split(" ");

    return rows.filter((row) => {
      const searchableText = normalizeSearchText(
        activeEntity.fields
          .map((field) =>
            formatFieldValue(
              field,
              row[field.key],
              relationOptions,
              entityDefinitions,
            ),
          )
          .join(" "),
      );

      return searchTerms.every((term) =>
        searchTermMatchesText(term, searchableText),
      );
    });
  }, [activeEntity, entityDefinitions, relationOptions, rows, searchTerm]);

  async function handleCreate(values: Record<string, CrudValue>) {
    await createRow(activeEntity, values);
    await refreshRows();
    void navigate({
      to: dashboardPath({
        schema: activeSchema,
        entity: getEntityKey(activeEntity.id),
      }),
      search: cleanSearch({ q: searchTerm }),
    });
  }

  async function handleUpdate(values: Record<string, CrudValue>) {
    if (!selectedRow) {
      return;
    }

    await updateRow(activeEntity, Number(selectedRow.id), values);
    await refreshRows();
    void navigate({
      to: dashboardPath({
        schema: activeSchema,
        entity: getEntityKey(activeEntity.id),
        mode: "detail",
        rowId: selectedRow.id,
      }),
      search: cleanSearch({ q: searchTerm }),
    });
  }

  function handleRelationDetail(field: FieldDefinition, row: CrudRow) {
    if (!field.relation) {
      return;
    }

    const relatedRow = getRelatedRow(field, row[field.key], relationOptions);

    if (!relatedRow) {
      return;
    }

    const [schema, entity] = field.relation.entityId.split(".") as [
      SchemaName,
      EntityKey,
    ];

    void navigate({
      to: dashboardPath({
        schema,
        entity,
        mode: "detail",
        rowId: relatedRow.id,
      }),
    });
  }

  function navigateDashboard(next: {
    entity?: EntityKey;
    mode?: ViewMode;
    replace?: boolean;
    rowId?: CrudValue;
    search?: RouteSearch;
  }) {
    void navigate({
      to: dashboardPath({
        schema: activeSchema,
        entity: next.entity ?? getEntityKey(activeEntity.id),
        mode: next.mode,
        rowId: next.rowId,
      }),
      replace: next.replace,
      search: cleanSearch(next.search ?? { q: searchTerm }),
    });
  }

  function handleDraftChange(values: DraftValues) {
    navigateDashboard({
      mode,
      rowId,
      replace: true,
      search: cleanSearch({
        q: searchTerm,
        draft: encodeDraft(values),
      }),
    });
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="relative z-50 flex min-w-0 items-start justify-between gap-3 px-1">
        <div className="flex min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <p className="text-sm font-bold text-cedar">{ui.adminCrud}</p>
            <h1 className="mt-0.5 truncate text-2xl font-bold text-ink sm:text-3xl">
              {activeEntity.label}
            </h1>
          </div>
        </div>
        <div className="shrink-0">{topAccessory}</div>
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <EntityNav
          activeEntityId={activeEntity.id}
          entityDefinitions={entityDefinitions}
          onSelect={(entityId) => {
            navigateDashboard({
              entity: getEntityKey(entityId),
              search: {},
            });
          }}
        />

        <section className="min-w-0 space-y-4 sm:space-y-5">

        {error ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </p>
        ) : null}

        {mode === "create" ? (
          <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-cedar/5 sm:p-5">
            <h2 className="mb-5 text-xl font-bold text-ink">
              {ui.create} {activeEntity.singularLabel}
            </h2>
            <EntityForm
              entity={activeEntity}
              entityDefinitions={entityDefinitions}
              draft={draft}
              mode="create"
              onCancel={() => navigateDashboard({ search: cleanSearch({ q: searchTerm }) })}
              onDraftChange={handleDraftChange}
              onSubmit={handleCreate}
              relationOptions={relationOptions}
            />
          </div>
        ) : null}

        {mode === "edit" && selectedRow ? (
          <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-cedar/5 sm:p-5">
            <h2 className="mb-5 text-xl font-bold text-ink">
              {ui.edit} {getRowLabel(activeEntity, selectedRow)}
            </h2>
            <EntityForm
              entity={activeEntity}
              entityDefinitions={entityDefinitions}
              draft={draft}
              mode="edit"
              onCancel={() =>
                navigateDashboard({
                  mode: "detail",
                  rowId,
                  search: cleanSearch({ q: searchTerm }),
                })
              }
              onDraftChange={handleDraftChange}
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
            onEdit={() =>
              navigateDashboard({
                mode: "edit",
                rowId: selectedRow.id,
              })
            }
            relationOptions={relationOptions}
            row={selectedRow}
          />
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-xl shadow-cedar/5">
          <div className="space-y-2 border-b border-slate-200/80 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 text-right">
                <h2 className="text-base font-bold text-ink sm:text-lg">{activeEntity.label}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {ui.showing} {filteredRows.length} {ui.from} {rows.length}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  aria-label={ui.refresh}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 sm:h-10 sm:w-10"
                  onClick={() => void refreshRows()}
                  title={ui.refresh}
                  type="button"
                >
                  <RefreshCw className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  aria-label={`${ui.add} ${activeEntity.singularLabel}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cedar text-white shadow-lg shadow-cedar/20 transition hover:bg-palm sm:h-10 sm:w-10"
                  onClick={() => navigateDashboard({ mode: "create", search: {} })}
                  title={`${ui.add} ${activeEntity.singularLabel}`}
                  type="button"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <label className="relative block w-full">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pe-4 ps-10 text-sm shadow-sm"
                onChange={(event) =>
                  navigateDashboard({
                    replace: true,
                    search: cleanSearch({
                      ...routeSearch,
                      q: event.target.value,
                    }),
                  })
                }
                placeholder={`${ui.search} ${activeEntity.label}`}
                type="search"
                value={searchTerm}
              />
            </label>
          </div>

          {isLoading ? (
            <p className="flex items-center gap-2 p-4 text-sm text-slate-600 sm:p-5">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {ui.loading}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-600 sm:p-5">{ui.noRecords}</p>
          ) : filteredRows.length === 0 ? (
            <p className="p-4 text-sm text-slate-600 sm:p-5">{ui.noMatches}</p>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-slate-200 text-right text-xs sm:text-sm">
                <thead className="bg-mist/70">
                  <tr>
                    {activeEntityKey === "students" ? (
                      <th className="w-8 px-1.5 py-1 font-bold text-slate-600 sm:px-2">
                        <span className="sr-only">لون المجموعة</span>
                      </th>
                    ) : null}
                    {activeEntity.listFields.map((key) => (
                      <th className="break-words px-1.5 py-1 font-bold leading-5 text-slate-600 sm:px-2" key={key}>
                        {getField(activeEntity, key)?.label ?? key}
                      </th>
                    ))}
                    <th className="w-24 px-1.5 py-1 font-bold text-slate-600 sm:w-28 sm:px-2">
                      {ui.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const groupColor =
                      activeEntityKey === "students"
                        ? getGroupColor(row.groupId ?? row.group)
                        : null;

                    return (
                      <tr
                        className={`transition ${groupColor?.row ?? "hover:bg-cedar/5"}`}
                        key={String(row.id)}
                      >
                        {groupColor ? (
                          <td className="px-1.5 py-1 sm:px-2">
                            <span
                              className={`mx-auto block h-6 w-1.5 rounded-full ${groupColor.marker}`}
                            />
                          </td>
                        ) : null}
                        {activeEntity.listFields.map((key) => {
                          const field = getField(activeEntity, key);
                          const isStudentGroup =
                            activeEntityKey === "students" && key === "groupId";
                          const value = formatFieldValue(
                            field,
                            row[key],
                            relationOptions,
                            entityDefinitions,
                          );

                          return (
                            <td
                              className="break-words px-1.5 py-1 leading-5 text-slate-700 sm:px-2"
                              key={key}
                            >
                              {isStudentGroup && field?.relation ? (
                                <button
                                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold transition hover:shadow-sm sm:text-sm ${groupColor?.chip ?? "border-slate-200 bg-slate-100 text-slate-700"}`}
                                  onClick={() => handleRelationDetail(field, row)}
                                  type="button"
                                >
                                  <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${groupColor?.marker ?? "bg-slate-400"}`}
                                  />
                                  <span className="min-w-0 truncate">{value}</span>
                                </button>
                              ) : (
                                value
                              )}
                            </td>
                          );
                        })}
                        <td className="px-1.5 py-1 sm:px-2">
                          <div className="flex gap-1">
                            <ActionButton compact icon={Eye} label={ui.view} onClick={() => {
                              navigateDashboard({
                                mode: "detail",
                                rowId: row.id,
                              });
                            }} />
                            <ActionButton compact icon={Pencil} label={ui.edit} onClick={() => {
                              navigateDashboard({
                                mode: "edit",
                                rowId: row.id,
                              });
                            }} />
                            <ActionButton compact danger icon={Trash2} label={ui.delete} onClick={() => void handleSoftDelete(row)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
        </section>
      </div>
    </div>
  );
}

function ActionButton({
  danger,
  icon: Icon,
  label,
  onClick,
  compact,
}: {
  compact?: boolean;
  danger?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl text-xs font-bold transition ${
        danger
          ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "bg-slate-100 text-slate-700 hover:bg-cedar/10 hover:text-cedar"
      } ${compact ? "h-7 w-7 px-0 py-0" : "gap-1.5 px-3 py-1.5"}`}
      aria-label={compact ? label : undefined}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className={compact ? "sr-only" : undefined}>{label}</span>
    </button>
  );
}
