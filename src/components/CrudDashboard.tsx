import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  FileText,
  GraduationCap,
  Layers3,
  ListChecks,
  Loader2,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trophy,
  Trash2,
  UserCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  createRow,
  createRows,
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

const groupColorClasses = {
  rose: {
    row: "bg-rose-50/70 hover:bg-rose-100/75",
    chip: "border-rose-200 bg-rose-100 text-rose-800",
    marker: "bg-rose-500",
  },
  sky: {
    row: "bg-sky-50/70 hover:bg-sky-100/75",
    chip: "border-sky-200 bg-sky-100 text-sky-800",
    marker: "bg-sky-500",
  },
  lime: {
    row: "bg-lime-50/75 hover:bg-lime-100/80",
    chip: "border-lime-300 bg-lime-100 text-lime-800",
    marker: "bg-lime-600",
  },
  indigo: {
    row: "bg-indigo-50/65 hover:bg-indigo-100/70",
    chip: "border-indigo-200 bg-indigo-100 text-indigo-800",
    marker: "bg-indigo-500",
  },
  violet: {
    row: "bg-violet-50/60 hover:bg-violet-100/70",
    chip: "border-violet-200 bg-violet-100 text-violet-800",
    marker: "bg-violet-500",
  },
  teal: {
    row: "bg-teal-50/70 hover:bg-teal-100/75",
    chip: "border-teal-200 bg-teal-100 text-teal-800",
    marker: "bg-teal-500",
  },
  orange: {
    row: "bg-orange-50/65 hover:bg-orange-100/70",
    chip: "border-orange-200 bg-orange-100 text-orange-800",
    marker: "bg-orange-500",
  },
  cyan: {
    row: "bg-cyan-50/70 hover:bg-cyan-100/75",
    chip: "border-cyan-200 bg-cyan-100 text-cyan-800",
    marker: "bg-cyan-500",
  },
} as const;

type GroupColorCode = keyof typeof groupColorClasses;
type GroupColorDisplay = {
  row: string;
  chip: string;
  marker: string;
  style?: CSSProperties;
};

const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function getCustomGroupColorStyle(lightColor: string, darkColor: string) {
  return {
    "--group-color-light": lightColor,
    "--group-color-dark": darkColor,
  } as CSSProperties;
}

function getCustomGroupColorByCode(value: string): GroupColorDisplay | null {
  const [lightColor, darkColor, ...extraColors] = value
    .split(",")
    .map((color) => color.trim());

  if (
    extraColors.length > 0 ||
    !hexColorPattern.test(lightColor ?? "") ||
    !hexColorPattern.test(darkColor ?? "")
  ) {
    return null;
  }

  return {
    row: "group-color-row",
    chip: "group-color-chip",
    marker: "group-color-marker",
    style: getCustomGroupColorStyle(lightColor, darkColor),
  };
}

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
  pagePointAwards: Trophy,
  manualPointTransactions: Trophy,
  pagePointTiers: SlidersHorizontal,
  points: Trophy,
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

function getTodayDateString() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function getInitialFormValue(
  entity: EntityDefinition,
  field: FieldDefinition,
  row?: CrudRow,
) {
  const value = row?.[field.key];

  if (value !== undefined) {
    return value;
  }

  if (entity.table === "attendance_sessions") {
    const today = getTodayDateString();

    if (field.key === "sessionDate" || field.key === "label") {
      return today;
    }

    if (field.key === "sequenceOnDate") {
      return 1;
    }
  }

  return getInitialValue(field, row);
}

function getField(entity: EntityDefinition, key: string) {
  return entity.fields.find((field) => field.key === key);
}

function getGroupColorByCode(value: CrudValue | undefined): GroupColorDisplay | null {
  if (typeof value !== "string") {
    return null;
  }

  return (
    groupColorClasses[value as GroupColorCode] ??
    getCustomGroupColorByCode(value) ??
    null
  );
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

function getGroupRowForRecord(
  activeEntityKey: EntityKey,
  row: CrudRow,
  activeSchema: SchemaName,
  relationOptions: RelationOptions,
) {
  const groups = relationOptions[`${activeSchema}.groups` as EntityId] ?? [];

  if (activeEntityKey === "groups") {
    return row;
  }

  if (activeEntityKey === "students") {
    return (
      groups.find((group) => String(group.id) === String(row.groupId)) ?? null
    );
  }

  if (activeEntityKey === "teachers") {
    return groups.find((group) => group.name === row.group) ?? null;
  }

  return null;
}

function getStudentName(student: CrudRow | null | undefined) {
  if (!student) {
    return ui.none;
  }

  return [student.firstName, student.lastName]
    .map((part) => formatValue(part))
    .filter((part) => part !== ui.none)
    .join(" ");
}

function getSessionTime(session: CrudRow | null | undefined) {
  return formatValue(session?.sessionDate ?? session?.label ?? session?.id);
}

function sortSessionsNewestFirst(sessions: CrudRow[]) {
  return [...sessions].sort((left, right) => {
    const leftTime = Date.parse(String(left.sessionDate ?? ""));
    const rightTime = Date.parse(String(right.sessionDate ?? ""));

    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return rightTime - leftTime;
    }

    return Number(right.id ?? 0) - Number(left.id ?? 0);
  });
}

function getDefaultAttendanceSession(sessions: CrudRow[]) {
  const today = getTodayDateString();
  return (
    sessions.find(
      (session) =>
        String(session.sessionDate ?? "").slice(0, 10) === today ||
        String(session.label ?? "").includes(today),
    ) ??
    sessions[0] ??
    null
  );
}

function getStatusLabel(status: CrudValue | undefined) {
  return status === "late" ? "متأخر" : "حاضر";
}

function getStatusClasses(status: CrudValue | undefined) {
  return status === "late"
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function searchRows<T extends CrudRow>(rows: T[], term: string, getText: (row: T) => string) {
  const normalizedSearch = normalizeSearchText(term);

  if (!normalizedSearch) {
    return rows;
  }

  const terms = normalizedSearch.split(" ");
  return rows.filter((row) => {
    const searchableText = normalizeSearchText(getText(row));
    return terms.every((searchTerm) =>
      searchTermMatchesText(searchTerm, searchableText),
    );
  });
}

function getEntityByKey(
  entityDefinitions: EntityDefinition[],
  schema: SchemaName,
  key: EntityKey,
) {
  return findEntityDefinition(getEntityId(schema, key), entityDefinitions);
}

function getNumberValue(value: CrudValue | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getStudentStats(
  student: CrudRow,
  pages: CrudRow[],
  pageAwards: CrudRow[],
  manualTransactions: CrudRow[],
) {
  const studentId = String(student.id);
  const studentPages = pages.filter((page) => String(page.studentId) === studentId);
  const pagePoints = pageAwards
    .filter((award) => String(award.studentId) === studentId)
    .reduce((sum, award) => sum + getNumberValue(award.points), 0);
  const manualPoints = manualTransactions
    .filter((transaction) => String(transaction.studentId) === studentId)
    .reduce((sum, transaction) => sum + getNumberValue(transaction.amount), 0);

  return {
    manualPoints,
    memorizedPages: studentPages.length,
    pagePoints,
    totalPoints: pagePoints + manualPoints,
  };
}

function findTierForCount(tiers: CrudRow[], pageCount: number) {
  return [...tiers]
    .sort((left, right) => getNumberValue(right.minPages) - getNumberValue(left.minPages))
    .find((tier) => {
      const minPages = getNumberValue(tier.minPages);
      const maxPages = tier.maxPages === null ? null : getNumberValue(tier.maxPages);
      return pageCount >= minPages && (maxPages === null || pageCount <= maxPages);
    });
}

function splitPoints(totalPoints: number, count: number) {
  if (count <= 0) {
    return [];
  }

  const base = Math.trunc(totalPoints / count);
  const remainder = totalPoints - base * count;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? base + remainder : base,
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
  activeSchema,
  entityDefinitions,
  isOpen,
  onClose,
  onSelect,
  onSelectAttendanceTaking,
}: {
  activeEntityId: EntityId;
  activeSchema: SchemaName;
  entityDefinitions: EntityDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (entityId: EntityId) => void;
  onSelectAttendanceTaking: () => void;
}) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-[80] w-72 max-w-[82vw] overflow-y-auto border-l border-white/70 bg-white/95 p-4 shadow-2xl shadow-slate-900/20 backdrop-blur transition-transform duration-200 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="px-1 text-sm font-bold text-slate-500">{ui.crudPages}</h2>
        <button
          aria-label={ui.cancel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={onClose}
          title={ui.cancel}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 grid max-w-full gap-2">
        {entityDefinitions
          .filter((entity) => entity.showInNav !== false)
          .map((entity) => {
            const Icon = entityIcons[getEntityKey(entity.id)] ?? Database;

            return (
              <div className="grid gap-1" key={entity.id}>
              <button
                className={`flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold transition ${
                  entity.id === activeEntityId
                    ? "bg-cedar text-white shadow-lg shadow-cedar/25"
                    : "text-slate-700 hover:bg-cedar/5 hover:text-cedar"
                }`}
                onClick={() => {
                  onSelect(entity.id);
                  onClose();
                }}
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
              {entity.id === `${activeSchema}.attendanceRecords` ? (
                <button
                  className="mr-8 flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold text-slate-600 transition hover:bg-cedar/5 hover:text-cedar"
                  onClick={() => {
                    onSelectAttendanceTaking();
                    onClose();
                  }}
                  type="button"
                >
                  <ListChecks className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate">تسجيل الحضور</span>
                    <span className="mt-0.5 block truncate text-xs font-medium opacity-75">
                      صفحة مستقلة
                    </span>
                  </span>
                </button>
              ) : null}
              </div>
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
        draft?.[field.key] ?? getInitialFormValue(entity, field, row),
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
          draft?.[field.key] ?? getInitialFormValue(entity, field, row),
        ]),
      ),
    );
  }, [draft, entity, fields, row]);

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
  const entityKey = getEntityKey(entity.id);
  const pageRows = relationOptions[`${entity.schema}.pages` as EntityId] ?? [];
  const pageAwards =
    relationOptions[`${entity.schema}.pagePointAwards` as EntityId] ?? [];
  const manualTransactions =
    relationOptions[`${entity.schema}.manualPointTransactions` as EntityId] ?? [];
  const studentStats =
    entityKey === "students"
      ? getStudentStats(row, pageRows, pageAwards, manualTransactions)
      : null;
  const recentPages = pageRows
    .filter((page) => String(page.studentId) === String(row.id))
    .slice(-5)
    .reverse();
  const recentManualTransactions = manualTransactions
    .filter((transaction) => String(transaction.studentId) === String(row.id))
    .slice(-5)
    .reverse();

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

      {studentStats ? (
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["صفحات الحفظ", studentStats.memorizedPages],
            ["نقاط الحفظ", studentStats.pagePoints],
            ["النقاط اليدوية", studentStats.manualPoints],
            ["المجموع", studentStats.totalPoints],
          ].map(([label, value]) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4" key={label}>
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
            <p className="text-sm font-bold text-ink">آخر صفحات الحفظ</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {recentPages.length ? recentPages.map((page) => (
                <p className="rounded-xl bg-slate-50 px-3 py-2" key={String(page.id)}>
                  صفحة {formatValue(page.page)} · {formatValue(page.memorizedOn)}
                </p>
              )) : <p className="text-slate-500">{ui.noRecords}</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
            <p className="text-sm font-bold text-ink">آخر حركات النقاط</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {recentManualTransactions.length ? recentManualTransactions.map((transaction) => (
                <p className="rounded-xl bg-slate-50 px-3 py-2" key={String(transaction.id)}>
                  {formatValue(transaction.amount)} · {formatValue(transaction.reason)}
                </p>
              )) : <p className="text-slate-500">{ui.noRecords}</p>}
            </div>
          </div>
        </div>
      ) : null}

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
  const entityDefinitions = useMemo(() => getEntityDefinitions(activeSchema), [activeSchema]);
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

      <PageTierSettings activeSchema={activeSchema} entityDefinitions={entityDefinitions} />
    </section>
  );
}

function PageTierSettings({
  activeSchema,
  entityDefinitions,
}: {
  activeSchema: SchemaName;
  entityDefinitions: EntityDefinition[];
}) {
  const tierEntity = getEntityByKey(entityDefinitions, activeSchema, "pagePointTiers");
  const [tiers, setTiers] = useState<CrudRow[]>([]);
  const [draft, setDraft] = useState({ minPages: "1", maxPages: "", points: "10", name: "" });
  const [error, setError] = useState<string | null>(null);

  async function refreshTiers() {
    if (!tierEntity) {
      return;
    }
    setTiers(await listRows(tierEntity));
  }

  useEffect(() => {
    void refreshTiers().catch((caughtError) =>
      setError(caughtError instanceof Error ? caughtError.message : ui.loadError),
    );
  }, [tierEntity]);

  async function handleAddTier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tierEntity) {
      return;
    }
    const minPages = Number(draft.minPages);
    const maxPages = draft.maxPages ? Number(draft.maxPages) : null;
    const points = Number(draft.points);
    if (!Number.isInteger(minPages) || !Number.isInteger(points) || minPages < 1 || (maxPages !== null && (!Number.isInteger(maxPages) || maxPages < minPages))) {
      setError("أدخل شريحة صحيحة.");
      return;
    }
    await createRow(tierEntity, {
      minPages,
      maxPages,
      points,
      name: draft.name || `${minPages}${maxPages ? `-${maxPages}` : "+"} pages/day`,
    });
    setDraft({ minPages: "1", maxPages: "", points: "10", name: "" });
    await refreshTiers();
  }

  async function handleTierChange(row: CrudRow, key: string, value: CrudValue) {
    if (!tierEntity) {
      return;
    }
    await updateRow(tierEntity, Number(row.id), { [key]: value });
    await refreshTiers();
  }

  async function handleDeleteTier(row: CrudRow) {
    if (!tierEntity) {
      return;
    }
    await softDeleteRow(tierEntity, Number(row.id));
    await refreshTiers();
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">شرائح نقاط الحفظ</p>
          <p className="mt-1 text-xs text-slate-500">تطبق على الصفحات الجديدة المحفوظة في الدفعة الواحدة.</p>
        </div>
        <SlidersHorizontal className="h-5 w-5 text-cedar" aria-hidden="true" />
      </div>
      {error ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}
      <div className="mt-4 grid gap-2">
        {tiers.map((tier) => (
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 md:grid-cols-5 md:items-center" key={String(tier.id)}>
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onBlur={(event) => void handleTierChange(tier, "name", event.target.value)} defaultValue={String(tier.name ?? "")} />
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onBlur={(event) => void handleTierChange(tier, "minPages", Number(event.target.value))} defaultValue={String(tier.minPages ?? "")} type="number" min={1} />
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onBlur={(event) => void handleTierChange(tier, "maxPages", event.target.value ? Number(event.target.value) : null)} defaultValue={tier.maxPages === null ? "" : String(tier.maxPages ?? "")} type="number" min={1} placeholder="بلا حد" />
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onBlur={(event) => void handleTierChange(tier, "points", Number(event.target.value))} defaultValue={String(tier.points ?? "")} type="number" />
            <ActionButton compact danger icon={Trash2} label={ui.delete} onClick={() => void handleDeleteTier(tier)} />
          </div>
        ))}
      </div>
      <form className="mt-4 grid gap-2 md:grid-cols-5" onSubmit={handleAddTier}>
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="اسم الشريحة" value={draft.name} />
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" min={1} onChange={(event) => setDraft((current) => ({ ...current, minPages: event.target.value }))} type="number" value={draft.minPages} />
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" min={1} onChange={(event) => setDraft((current) => ({ ...current, maxPages: event.target.value }))} placeholder="بلا حد" type="number" value={draft.maxPages} />
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => setDraft((current) => ({ ...current, points: event.target.value }))} type="number" value={draft.points} />
        <button className="rounded-xl bg-cedar px-3 py-2 text-sm font-bold text-white" type="submit">إضافة شريحة</button>
      </form>
    </div>
  );
}

function PointsWorkspace({
  activeSchema,
  entityDefinitions,
  relationOptions,
  onRefresh,
  onNavigateStudent,
}: {
  activeSchema: SchemaName;
  entityDefinitions: EntityDefinition[];
  relationOptions: RelationOptions;
  onRefresh: () => Promise<void>;
  onNavigateStudent: (student: CrudRow) => void;
}) {
  const [rankMode, setRankMode] = useState<"points" | "pages" | "recent">("points");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualDate, setManualDate] = useState(getTodayDateString());
  const [manualAmount, setManualAmount] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const students = relationOptions[`${activeSchema}.students` as EntityId] ?? [];
  const groups = relationOptions[`${activeSchema}.groups` as EntityId] ?? [];
  const pages = relationOptions[`${activeSchema}.pages` as EntityId] ?? [];
  const awards = relationOptions[`${activeSchema}.pagePointAwards` as EntityId] ?? [];
  const manual = relationOptions[`${activeSchema}.manualPointTransactions` as EntityId] ?? [];
  const manualEntity = getEntityByKey(
    entityDefinitions,
    activeSchema,
    "manualPointTransactions",
  );

  useEffect(() => {
    if (!manualStudentId && students[0]?.id !== undefined) {
      setManualStudentId(String(students[0].id));
    }
  }, [manualStudentId, students]);

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManualError(null);
    const amount = Number(manualAmount);

    if (!manualEntity || !manualStudentId || !Number.isInteger(amount) || !manualReason.trim()) {
      setManualError("اختر الطالب وأدخل مقدار النقاط والسبب.");
      return;
    }

    try {
      await createRow(manualEntity, {
        studentId: Number(manualStudentId),
        transactionDate: manualDate,
        amount,
        reason: manualReason.trim(),
      });
      setManualAmount("");
      setManualReason("");
      await onRefresh();
    } catch (caughtError) {
      setManualError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  function isInRange(value: CrudValue | undefined) {
    const date = String(value ?? "").slice(0, 10);
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }

  const rankedStudents = searchRows(students, search, (student) => getStudentName(student))
    .map((student) => {
      const stats = getStudentStats(student, pages, awards, manual);
      const studentId = String(student.id);
      const recentPagePoints = awards
        .filter((award) => String(award.studentId) === studentId && isInRange(award.createdAt))
        .reduce((sum, award) => sum + getNumberValue(award.points), 0);
      const recentManualPoints = manual
        .filter((transaction) => String(transaction.studentId) === studentId && isInRange(transaction.transactionDate))
        .reduce((sum, transaction) => sum + getNumberValue(transaction.amount), 0);
      return { student, stats, recentPoints: recentPagePoints + recentManualPoints };
    })
    .sort((left, right) => {
      if (rankMode === "pages") {
        return right.stats.memorizedPages - left.stats.memorizedPages;
      }
      if (rankMode === "recent") {
        return right.recentPoints - left.recentPoints;
      }
      return right.stats.totalPoints - left.stats.totalPoints;
    });

  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-xl shadow-cedar/5">
      <div className="space-y-3 border-b border-slate-200/80 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-cedar">لوحة النقاط</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">ترتيب الطلاب والحفظ</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setRankMode(event.target.value as typeof rankMode)} value={rankMode}>
              <option value="points">حسب مجموع النقاط</option>
              <option value="pages">حسب صفحات الحفظ</option>
              <option value="recent">حسب النشاط ضمن الفترة</option>
            </select>
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="بحث عن طالب" value={search} />
          </div>
        </div>
      </div>
      <form className="grid gap-2 border-b border-slate-200/80 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.65fr))_auto]" onSubmit={handleManualSubmit}>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setManualStudentId(event.target.value)} value={manualStudentId}>
          {students.map((student) => (
            <option key={String(student.id)} value={String(student.id)}>{getStudentName(student)}</option>
          ))}
        </select>
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setManualDate(event.target.value)} type="date" value={manualDate} />
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setManualAmount(event.target.value)} placeholder="نقاط + أو -" type="number" value={manualAmount} />
        <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setManualReason(event.target.value)} placeholder="السبب" value={manualReason} />
        <button className="rounded-xl bg-ink px-3 py-2 text-sm font-bold text-white" type="submit">إضافة حركة</button>
        {manualError ? <p className="text-sm text-amber-800 md:col-span-5">{manualError}</p> : null}
      </form>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-slate-200 text-right text-sm">
          <thead className="bg-mist/70">
            <tr>
              {["الترتيب", "الطالب", "المجموعة", "الصفحات", "نقاط الحفظ", "يدوي", "المجموع", "الفترة", ""].map((label) => (
                <th className="px-3 py-2 font-bold text-slate-600" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankedStudents.map(({ student, stats, recentPoints }, index) => {
              const group = groups.find((currentGroup) => String(currentGroup.id) === String(student.groupId));
              return (
                <tr className="hover:bg-cedar/5" key={String(student.id)}>
                  <td className="px-3 py-2 font-bold text-cedar">#{index + 1}</td>
                  <td className="px-3 py-2 font-bold text-ink">{getStudentName(student)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatValue(group?.name)}</td>
                  <td className="px-3 py-2">{stats.memorizedPages}</td>
                  <td className="px-3 py-2">{stats.pagePoints}</td>
                  <td className="px-3 py-2">{stats.manualPoints}</td>
                  <td className="px-3 py-2 font-bold text-ink">{stats.totalPoints}</td>
                  <td className="px-3 py-2">{recentPoints}</td>
                  <td className="px-3 py-2">
                    <ActionButton compact icon={Eye} label={ui.view} onClick={() => onNavigateStudent(student)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemorizationWorkspace({
  activeSchema,
  entityDefinitions,
  onCreated,
  relationOptions,
}: {
  activeSchema: SchemaName;
  entityDefinitions: EntityDefinition[];
  onCreated: () => Promise<void>;
  relationOptions: RelationOptions;
}) {
  const [studentId, setStudentId] = useState("");
  const [fromPage, setFromPage] = useState("");
  const [toPage, setToPage] = useState("");
  const [memorizedOn, setMemorizedOn] = useState(getTodayDateString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const students = relationOptions[`${activeSchema}.students` as EntityId] ?? [];
  const pages = relationOptions[`${activeSchema}.pages` as EntityId] ?? [];
  const tiers = relationOptions[`${activeSchema}.pagePointTiers` as EntityId] ?? [];
  const pagesEntity = getEntityByKey(entityDefinitions, activeSchema, "pages");
  const awardsEntity = getEntityByKey(entityDefinitions, activeSchema, "pagePointAwards");

  useEffect(() => {
    if (!studentId && students[0]?.id !== undefined) {
      setStudentId(String(students[0].id));
    }
  }, [studentId, students]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const firstPage = Number(fromPage);
    const lastPage = Number(toPage || fromPage);
    const normalizedStart = Math.min(firstPage, lastPage);
    const normalizedEnd = Math.max(firstPage, lastPage);

    if (!pagesEntity || !awardsEntity || !studentId || !Number.isInteger(firstPage) || !Number.isInteger(lastPage) || normalizedStart < 1 || normalizedEnd > 604) {
      setError("أدخل طالبا وصفحة أو نطاقا صحيحا بين 1 و604.");
      return;
    }

    const requestedPages = Array.from({ length: normalizedEnd - normalizedStart + 1 }, (_, index) => normalizedStart + index);
    const duplicatePages = requestedPages.filter((page) =>
      pages.some((existingPage) => String(existingPage.studentId) === studentId && Number(existingPage.page) === page),
    );

    if (duplicatePages.length) {
      setError(`هذه الصفحات مسجلة مسبقا لهذا الطالب: ${duplicatePages.join(", ")}`);
      return;
    }

    const tier = findTierForCount(tiers, requestedPages.length);
    const totalPoints = getNumberValue(tier?.points);
    const pointSplit = splitPoints(totalPoints, requestedPages.length);
    const ruleName = String(tier?.name ?? `${requestedPages.length} page/day`);
    const snapshot = `${requestedPages.length} pages on ${memorizedOn}: ${totalPoints} points`;

    setIsSaving(true);
    try {
      const createdPages = await createRows(
        pagesEntity,
        requestedPages.map((page) => ({
          studentId: Number(studentId),
          page,
          memorizedOn,
        })),
      );
      try {
        await createRows(
          awardsEntity,
          createdPages.map((page, index) => ({
            memorizationPageId: Number(page.id),
            studentId: Number(studentId),
            ruleName,
            snapshot,
            points: pointSplit[index] ?? 0,
          })),
        );
      } catch (awardError) {
        await Promise.all(
          createdPages
            .map((page) => Number(page.id))
            .filter((id) => Number.isFinite(id))
            .map((id) => softDeleteRow(pagesEntity, id)),
        );
        throw awardError;
      }
      setFromPage("");
      setToPage("");
      await onCreated();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-cedar/5" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.7fr))_auto] md:items-end">
          <label className="text-sm font-bold text-slate-700">
            الطالب
            <select className={inputClass} onChange={(event) => setStudentId(event.target.value)} value={studentId}>
              {students.map((student) => (
                <option key={String(student.id)} value={String(student.id)}>{getStudentName(student)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            من صفحة
            <input className={inputClass} min={1} max={604} onChange={(event) => setFromPage(event.target.value)} type="number" value={fromPage} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            إلى صفحة
            <input className={inputClass} min={1} max={604} onChange={(event) => setToPage(event.target.value)} placeholder="اختياري" type="number" value={toPage} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            التاريخ
            <input className={inputClass} onChange={(event) => setMemorizedOn(event.target.value)} type="date" value={memorizedOn} />
          </label>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cedar px-4 text-sm font-bold text-white shadow-lg shadow-cedar/20 transition hover:bg-palm disabled:opacity-60" disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </button>
        </div>
        {error ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}
      </form>
    </div>
  );
}

type AttendanceWorkspaceMode = "student" | "group" | "taking" | "records";

function AttendanceWorkspace({
  activeSchema,
  attendanceEntity,
  isLoading,
  isTakingPage,
  onMarkAttendance,
  onNavigateRecord,
  onNavigateStudent,
  onOpenTakingPage,
  onRefresh,
  records,
  relationOptions,
}: {
  activeSchema: SchemaName;
  attendanceEntity: EntityDefinition;
  isLoading: boolean;
  isTakingPage: boolean;
  onMarkAttendance: (
    studentId: CrudValue,
    sessionId: CrudValue,
    status: "present" | "late",
    existingRecord?: CrudRow,
  ) => Promise<void>;
  onNavigateRecord: (row: CrudRow, mode: "detail" | "edit") => void;
  onNavigateStudent: (student: CrudRow) => void;
  onOpenTakingPage: () => void;
  onRefresh: () => void;
  records: CrudRow[];
  relationOptions: RelationOptions;
}) {
  const [viewMode, setViewMode] = useState<AttendanceWorkspaceMode>(
    isTakingPage ? "taking" : "student",
  );
  const [studentSearch, setStudentSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<CrudValue | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<CrudValue | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<CrudValue | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const students = relationOptions[`${activeSchema}.students` as EntityId] ?? [];
  const groups = relationOptions[`${activeSchema}.groups` as EntityId] ?? [];
  const sessions = sortSessionsNewestFirst(
    relationOptions[`${activeSchema}.attendanceSessions` as EntityId] ?? [],
  );
  const availableModes = isTakingPage
    ? ([{ key: "taking", label: "تسجيل سريع", icon: ListChecks }] as const)
    : ([
        { key: "student", label: "الطالب", icon: UserCheck },
        { key: "group", label: "المجموعة", icon: Layers3 },
        { key: "records", label: "كل السجلات", icon: Database },
      ] as const);

  useEffect(() => {
    setViewMode(isTakingPage ? "taking" : "student");
  }, [isTakingPage]);

  const selectedStudent =
    students.find((student) => String(student.id) === String(selectedStudentId)) ??
    students[0] ??
    null;
  const selectedGroup =
    groups.find((group) => String(group.id) === String(selectedGroupId)) ??
    groups.find((group) =>
      students.some((student) => String(student.groupId) === String(group.id)),
    ) ??
    groups[0] ??
    null;
  const selectedSession =
    sessions.find((session) => String(session.id) === String(selectedSessionId)) ??
    getDefaultAttendanceSession(sessions) ??
    null;

  useEffect(() => {
    if (!selectedStudentId && students[0]?.id !== undefined) {
      setSelectedStudentId(students[0].id);
    }
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (!selectedGroupId && selectedGroup?.id !== undefined) {
      setSelectedGroupId(selectedGroup.id);
    }
  }, [selectedGroup, selectedGroupId]);

  useEffect(() => {
    const defaultSession = getDefaultAttendanceSession(sessions);

    if (!selectedSessionId && defaultSession?.id !== undefined) {
      setSelectedSessionId(defaultSession.id);
    }
  }, [selectedSessionId, sessions]);

  const recordsByStudent = useMemo(() => {
    const grouped = new Map<string, CrudRow[]>();

    records.forEach((record) => {
      const key = String(record.studentId);
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    });

    return grouped;
  }, [records]);

  const filteredStudents = searchRows(students, studentSearch, (student) => {
    const group = groups.find((currentGroup) => String(currentGroup.id) === String(student.groupId));
    return [
      student.id,
      student.firstName,
      student.lastName,
      student.phone,
      student.fatherPhone,
      student.motherPhone,
      group?.name,
    ].join(" ");
  });

  const filteredGroups = searchRows(groups, groupSearch, (group) =>
    [group.id, group.name, group.colorCode].join(" "),
  );

  const groupStudents = students.filter(
    (student) => String(student.groupId) === String(selectedGroup?.id),
  );
  const visibleRosterStudents = searchRows(groupStudents, rosterSearch, (student) =>
    [student.id, student.firstName, student.lastName, student.phone].join(" "),
  );
  const selectedStudentRecords = (recordsByStudent.get(String(selectedStudent?.id)) ?? [])
    .map((record) => ({
      record,
      session:
        sessions.find((session) => String(session.id) === String(record.attendanceSessionId)) ??
        null,
    }))
    .sort((left, right) => {
      const leftTime = Date.parse(String(left.session?.sessionDate ?? ""));
      const rightTime = Date.parse(String(right.session?.sessionDate ?? ""));
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    });
  const presentCount = selectedStudentRecords.filter(({ record }) => record.status === "present").length;
  const lateCount = selectedStudentRecords.filter(({ record }) => record.status === "late").length;
  const missingCount = Math.max(0, sessions.length - selectedStudentRecords.length);

  async function handleMark(
    studentId: CrudValue,
    sessionId: CrudValue,
    status: "present" | "late",
    existingRecord?: CrudRow,
  ) {
    const key = `${studentId}-${sessionId}-${status}`;
    setSavingKey(key);

    try {
      await onMarkAttendance(studentId, sessionId, status, existingRecord);
    } finally {
      setSavingKey(null);
    }
  }

  const groupColor = getGroupColorByCode(selectedGroup?.colorCode);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-xl shadow-cedar/5">
      <div className="border-b border-slate-200/80 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-cedar">لوحة حضور سريعة</p>
            <h2 className="mt-1 text-xl font-bold text-ink sm:text-2xl">
              مركز سجلات الحضور
            </h2>
          </div>
          {availableModes.length > 1 ? (
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 text-xs font-bold sm:flex">
            {[
              ...availableModes,
            ].map((item) => {
              const Icon = item.icon;
              const isActive = viewMode === item.key;

              return (
                <button
                  className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 transition ${
                    isActive
                      ? "bg-white text-cedar shadow-sm"
                      : "text-slate-600 hover:bg-white/70"
                  }`}
                  key={item.key}
                  onClick={() => setViewMode(item.key as AttendanceWorkspaceMode)}
                  type="button"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          ) : null}
          {!isTakingPage ? (
            <button
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-cedar px-3 text-sm font-bold text-white shadow-lg shadow-cedar/15 transition hover:bg-palm"
              onClick={onOpenTakingPage}
              type="button"
            >
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              تسجيل الحضور
            </button>
          ) : null}
        </div>
      </div>

      {viewMode === "student" ? (
        <div className="grid items-stretch gap-4 p-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:p-4">
          <div className="flex min-h-0 flex-col gap-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-3 ps-10 text-sm shadow-sm"
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="بحث سريع عن طالب"
                type="search"
                value={studentSearch}
              />
            </label>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pe-1">
              {filteredStudents.map((student) => {
                const studentGroup = groups.find((group) => String(group.id) === String(student.groupId));
                const color = getGroupColorByCode(studentGroup?.colorCode);
                const isSelected = String(student.id) === String(selectedStudent?.id);

                return (
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-right transition ${
                      isSelected
                        ? "border-cedar bg-cedar/5 shadow-sm"
                        : "border-slate-200 bg-white hover:border-cedar/40"
                    }`}
                    key={String(student.id)}
                    onClick={() => setSelectedStudentId(student.id)}
                    type="button"
                  >
                    <span className={`h-10 w-1.5 rounded-full ${color?.marker ?? "bg-slate-300"}`} style={color?.style} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">{getStudentName(student)}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        #{formatValue(student.id)} · {formatValue(studentGroup?.name)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            {selectedStudent ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-bold text-ink">{getStudentName(selectedStudent)}</h3>
                    <p className="mt-1 text-sm text-slate-500">#{formatValue(selectedStudent.id)}</p>
                  </div>
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-cedar px-3 text-sm font-bold text-white shadow-lg shadow-cedar/15 transition hover:bg-palm"
                    onClick={() => onNavigateStudent(selectedStudent)}
                    type="button"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    ملف الطالب
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["الجلسات", sessions.length],
                    ["حاضر", presentCount],
                    ["متأخر", lateCount],
                    ["بدون سجل", missingCount],
                  ].map(([label, value]) => (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3" key={label}>
                      <p className="text-xs font-bold text-slate-500">{label}</p>
                      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {selectedStudentRecords.length ? (
                    selectedStudentRecords.slice(0, 10).map(({ record, session }) => (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2" key={String(record.id)}>
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-ink">{getSessionTime(session)}</span>
                          <span className="block text-xs text-slate-500">{formatValue(session?.label)}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-full border px-2 py-1 text-xs font-bold ${getStatusClasses(record.status)}`}>
                            {getStatusLabel(record.status)}
                          </span>
                          <ActionButton compact icon={Eye} label={ui.view} onClick={() => onNavigateRecord(record, "detail")} />
                          <ActionButton compact icon={Pencil} label={ui.edit} onClick={() => onNavigateRecord(record, "edit")} />
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      لا توجد سجلات لهذا الطالب بعد.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="p-4 text-sm text-slate-500">{ui.noRecords}</p>
            )}
          </div>
        </div>
      ) : null}

      {viewMode === "group" ? (
        <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)] lg:p-4">
          <div className="space-y-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-3 ps-10 text-sm shadow-sm"
                onChange={(event) => setGroupSearch(event.target.value)}
                placeholder="بحث عن مجموعة"
                type="search"
                value={groupSearch}
              />
            </label>
            <div className="space-y-2">
              {filteredGroups.map((group) => {
                const color = getGroupColorByCode(group.colorCode);
                const isSelected = String(group.id) === String(selectedGroup?.id);
                const count = students.filter((student) => String(student.groupId) === String(group.id)).length;

                return (
                  <button
                    className={`w-full rounded-2xl border px-3 py-2 text-right transition ${color?.row ?? "bg-white hover:bg-slate-50"} ${
                      isSelected ? "border-cedar shadow-sm" : "border-slate-200"
                    }`}
                    key={String(group.id)}
                    onClick={() => setSelectedGroupId(group.id)}
                    style={color?.style}
                    type="button"
                  >
                    <span className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2 py-1 text-sm font-bold ${color?.chip ?? "border-slate-200 bg-slate-100 text-slate-700"}`} style={color?.style}>
                      <span className={`h-2.5 w-2.5 rounded-full ${color?.marker ?? "bg-slate-400"}`} style={color?.style} />
                      <span className="truncate">{formatValue(group.name)}</span>
                    </span>
                    <span className="mt-2 block text-xs text-slate-500">{count} طالب</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate text-xl font-bold text-ink">{formatValue(selectedGroup?.name)}</h3>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-bold ${groupColor?.chip ?? "border-slate-200 bg-white text-slate-700"}`} style={groupColor?.style}>
                {groupStudents.length} طالب
              </span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {groupStudents.map((student) => {
                const studentRecords = recordsByStudent.get(String(student.id)) ?? [];
                const studentPresent = studentRecords.filter((record) => record.status === "present").length;
                const studentLate = studentRecords.filter((record) => record.status === "late").length;

                return (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3" key={String(student.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{getStudentName(student)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">#{formatValue(student.id)}</p>
                      </div>
                      <ActionButton compact icon={Eye} label={ui.view} onClick={() => onNavigateStudent(student)} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs font-bold">
                      <span className="rounded-xl bg-emerald-50 px-2 py-1 text-emerald-800">حاضر {studentPresent}</span>
                      <span className="rounded-xl bg-amber-50 px-2 py-1 text-amber-800">متأخر {studentLate}</span>
                      <span className="rounded-xl bg-slate-100 px-2 py-1 text-slate-700">سجل {studentRecords.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {viewMode === "taking" ? (
        <div className="space-y-4 p-3 lg:p-4">
          <div className="grid min-w-0 gap-3 xl:grid-cols-3">
            <label className="min-w-0 text-sm font-bold text-slate-700">
              جلسة الحضور
              <select
                className="mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
                onChange={(event) => setSelectedSessionId(event.target.value)}
                value={String(selectedSession?.id ?? "")}
              >
                {sessions.map((session) => (
                  <option key={String(session.id)} value={String(session.id)}>
                    {getSessionTime(session)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-sm font-bold text-slate-700">
              المجموعة
              <div className="mt-2 flex min-w-0 flex-wrap gap-2 overflow-hidden rounded-xl bg-slate-100 p-1">
                {groups.map((group) => {
                  const color = getGroupColorByCode(group.colorCode);
                  const isSelected = String(group.id) === String(selectedGroup?.id);

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`inline-flex min-h-10 min-w-0 flex-1 basis-[9rem] items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
                        isSelected
                          ? `${color?.chip ?? "border-cedar bg-white text-cedar"} shadow-sm`
                          : "border-transparent bg-transparent text-slate-600 hover:bg-white/70"
                      }`}
                      key={String(group.id)}
                      onClick={() => setSelectedGroupId(group.id)}
                      style={isSelected ? color?.style : undefined}
                      type="button"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${color?.marker ?? "bg-slate-400"}`}
                        style={color?.style}
                      />
                      <span className="min-w-0 truncate">{formatValue(group.name)}</span>
                    </button>
                  );
                })}
              </div>
            </label>
            <label className="relative block min-w-0 text-sm font-bold text-slate-700">
              بحث داخل القائمة
              <Search className="pointer-events-none absolute right-4 top-[2.65rem] h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                className="mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white py-2.5 pe-3 ps-10 text-sm shadow-sm"
                onChange={(event) => setRosterSearch(event.target.value)}
                placeholder="اسم الطالب أو رقمه"
                type="search"
                value={rosterSearch}
              />
            </label>
          </div>

          <div className="space-y-2">
            {visibleRosterStudents.map((student) => {
              const existingRecord = records.find(
                (record) =>
                  String(record.studentId) === String(student.id) &&
                  String(record.attendanceSessionId) === String(selectedSession?.id),
              );
              const currentStatus = existingRecord?.status;

              return (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between" key={String(student.id)}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-11 w-1.5 rounded-full ${groupColor?.marker ?? "bg-slate-300"}`} style={groupColor?.style} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink">{getStudentName(student)}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        #{formatValue(student.id)} · {currentStatus ? getStatusLabel(currentStatus) : "لم يسجل"}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:w-56">
                    {(["present", "late"] as const).map((status) => {
                      const isSelected = currentStatus === status;
                      const key = `${student.id}-${selectedSession?.id}-${status}`;

                      return (
                        <button
                          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition ${
                            isSelected
                              ? getStatusClasses(status)
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-cedar/5 hover:text-cedar"
                          }`}
                          disabled={!selectedSession || savingKey === key || isLoading}
                          key={status}
                          onClick={() =>
                            selectedSession
                              ? void handleMark(student.id, selectedSession.id, status, existingRecord)
                              : undefined
                          }
                          type="button"
                        >
                          {savingKey === key ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : status === "present" ? (
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Clock3 className="h-4 w-4" aria-hidden="true" />
                          )}
                          <span>{getStatusLabel(status)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {viewMode === "records" ? (
        <div className="flex items-center justify-between gap-3 p-4 text-sm text-slate-600">
          <span>
            استخدم الجدول الكامل بالأسفل لإدارة {attendanceEntity.label} مباشرة.
          </span>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={onRefresh}
            title={ui.refresh}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function CrudDashboard({
  activeEntityKey,
  activeSchema,
  attendanceTaking = false,
  mode,
  rowId,
  routeSearch,
  topAccessory,
}: {
  activeEntityKey: EntityKey;
  activeSchema: SchemaName;
  attendanceTaking?: boolean;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchTerm = routeSearch.q ?? "";
  const draft = useMemo(() => decodeDraft(routeSearch.draft), [routeSearch.draft]);

  const relationEntityIds = useMemo(
    () => {
      const entityIds = activeEntity.fields
        .map((field) => field.relation?.entityId)
        .filter((entityId): entityId is EntityId => Boolean(entityId));

      if (activeEntityKey === "teachers") {
        entityIds.push(`${activeSchema}.groups` as EntityId);
      }

      if (activeEntityKey === "attendanceRecords") {
        entityIds.push(`${activeSchema}.groups` as EntityId);
      }

      if (activeEntityKey === "students") {
        entityIds.push(
          `${activeSchema}.pages` as EntityId,
          `${activeSchema}.pagePointAwards` as EntityId,
          `${activeSchema}.manualPointTransactions` as EntityId,
        );
      }

      if (activeEntityKey === "pages") {
        entityIds.push(
          `${activeSchema}.students` as EntityId,
          `${activeSchema}.pagePointAwards` as EntityId,
          `${activeSchema}.pagePointTiers` as EntityId,
        );
      }

      if (activeEntityKey === "points") {
        entityIds.push(
          `${activeSchema}.students` as EntityId,
          `${activeSchema}.groups` as EntityId,
          `${activeSchema}.pages` as EntityId,
          `${activeSchema}.pagePointAwards` as EntityId,
          `${activeSchema}.manualPointTransactions` as EntityId,
        );
      }

      return Array.from(new Set(entityIds));
    },
    [activeEntity, activeEntityKey, activeSchema],
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

  async function refreshRelationOptions() {
    const entries = await Promise.all(
      relationEntityIds.map(async (entityId) => {
        const entity = findEntityDefinition(entityId, entityDefinitions);
        return entity ? ([entityId, await listRows(entity)] as const) : null;
      }),
    );

    setRelationOptions(
      Object.fromEntries(
        entries.filter((entry): entry is [EntityId, CrudRow[]] =>
          Boolean(entry),
        ),
      ),
    );
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

    if (relationEntityIds.length) {
      void refreshRelationOptions().catch(() => {
        if (isMounted) {
          setRelationOptions({});
        }
      });
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

  async function handleMarkAttendance(
    studentId: CrudValue,
    sessionId: CrudValue,
    status: "present" | "late",
    existingRecord?: CrudRow,
  ) {
    if (existingRecord?.id !== undefined && existingRecord.id !== null) {
      await updateRow(activeEntity, Number(existingRecord.id), { status });
    } else {
      await createRow(activeEntity, {
        studentId,
        attendanceSessionId: sessionId,
        status,
      });
    }

    await refreshRows();
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
        <div className="flex min-w-0 items-start gap-2">
          <button
            aria-expanded={isSidebarOpen}
            aria-label={ui.crudPages}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cedar text-white shadow-lg shadow-cedar/20 transition hover:bg-palm"
            onClick={() => setIsSidebarOpen(true)}
            title={ui.crudPages}
            type="button"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 text-right">
            <p className="text-sm font-bold text-cedar">{ui.adminCrud}</p>
            <h1 className="mt-0.5 truncate text-2xl font-bold text-ink sm:text-3xl">
              {activeEntity.label}
            </h1>
          </div>
        </div>
        <div className="shrink-0">{topAccessory}</div>
      </div>

      {isSidebarOpen ? (
        <button
          aria-label={ui.cancel}
          className="fixed inset-0 z-[70] cursor-default bg-slate-950/30 backdrop-blur-[1px]"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <EntityNav
        activeEntityId={activeEntity.id}
        activeSchema={activeSchema}
        entityDefinitions={entityDefinitions}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={(entityId) => {
          navigateDashboard({
            entity: getEntityKey(entityId),
            search: {},
          });
        }}
        onSelectAttendanceTaking={() => {
          void navigate({
            to: dashboardPath({
              schema: activeSchema,
              entity: "attendanceRecords",
              subpage: "take",
            }),
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

        {activeEntityKey === "points" ? (
          <PointsWorkspace
            activeSchema={activeSchema}
            entityDefinitions={entityDefinitions}
            onRefresh={refreshRelationOptions}
            onNavigateStudent={(student) =>
              navigateDashboard({
                entity: "students",
                mode: "detail",
                rowId: student.id,
                search: {},
              })
            }
            relationOptions={relationOptions}
          />
        ) : null}

        {activeEntityKey === "pages" ? (
          <MemorizationWorkspace
            activeSchema={activeSchema}
            entityDefinitions={entityDefinitions}
            onCreated={async () => {
              await refreshRows();
              await refreshRelationOptions();
            }}
            relationOptions={relationOptions}
          />
        ) : null}

        {mode === "create" && !["attendanceRecords", "pages", "points"].includes(activeEntityKey) ? (
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

        {mode === "edit" && selectedRow && !["attendanceRecords", "points"].includes(activeEntityKey) ? (
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

        {mode === "detail" && selectedRow && activeEntityKey !== "points" ? (
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

        {activeEntityKey === "attendanceRecords" ? (
          <AttendanceWorkspace
            activeSchema={activeSchema}
            attendanceEntity={activeEntity}
            isTakingPage={attendanceTaking}
            isLoading={isLoading}
            onMarkAttendance={handleMarkAttendance}
            onNavigateRecord={(row, nextMode) =>
              navigateDashboard({
                mode: nextMode,
                rowId: row.id,
              })
            }
            onNavigateStudent={(student) =>
              navigateDashboard({
                entity: "students",
                mode: "detail",
                rowId: student.id,
                search: {},
              })
            }
            onOpenTakingPage={() =>
              void navigate({
                to: dashboardPath({
                  schema: activeSchema,
                  entity: "attendanceRecords",
                  subpage: "take",
                }),
                search: {},
              })
            }
            onRefresh={() => void refreshRows()}
            records={rows}
            relationOptions={relationOptions}
          />
        ) : null}

        {!attendanceTaking && activeEntityKey !== "points" ? (
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
                {!["attendanceRecords", "pages", "points"].includes(activeEntityKey) ? (
                  <button
                    aria-label={`${ui.add} ${activeEntity.singularLabel}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cedar text-white shadow-lg shadow-cedar/20 transition hover:bg-palm sm:h-10 sm:w-10"
                    onClick={() => navigateDashboard({ mode: "create", search: {} })}
                    title={`${ui.add} ${activeEntity.singularLabel}`}
                    type="button"
                  >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </button>
                ) : null}
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
                    {["groups", "students", "teachers"].includes(activeEntityKey) ? (
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
                    const groupRow = getGroupRowForRecord(
                      activeEntityKey,
                      row,
                      activeSchema,
                      relationOptions,
                    );
                    const groupColor = getGroupColorByCode(groupRow?.colorCode);
                    const showsGroupColorColumn = [
                      "groups",
                      "students",
                      "teachers",
                    ].includes(activeEntityKey);

                    return (
                      <tr
                        className={`transition ${groupColor?.row ?? "hover:bg-cedar/5"}`}
                        key={String(row.id)}
                        style={groupColor?.style}
                      >
                        {showsGroupColorColumn ? (
                          <td className="px-1.5 py-1 sm:px-2">
                            {groupColor ? (
                              <span
                                className={`mx-auto block h-6 w-1.5 rounded-full ${groupColor.marker}`}
                                style={groupColor.style}
                              />
                            ) : null}
                          </td>
                        ) : null}
                        {activeEntity.listFields.map((key) => {
                          const field = getField(activeEntity, key);
                          const isStudentGroup =
                            activeEntityKey === "students" && key === "groupId";
                          const isGroupName =
                            activeEntityKey === "groups" && key === "name";
                          const isGroupColor =
                            activeEntityKey === "groups" && key === "colorCode";
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
                              {isGroupColor ? (
                                <span
                                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold sm:text-sm ${groupColor?.chip ?? "border-slate-200 bg-slate-100 text-slate-700"}`}
                                  style={groupColor?.style}
                                >
                                  <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${groupColor?.marker ?? "bg-slate-400"}`}
                                    style={groupColor?.style}
                                  />
                                  <span className="min-w-0 truncate">{value}</span>
                                </span>
                              ) : isStudentGroup && field?.relation ? (
                                <button
                                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold transition hover:shadow-sm sm:text-sm ${groupColor?.chip ?? "border-slate-200 bg-slate-100 text-slate-700"}`}
                                  onClick={() => handleRelationDetail(field, row)}
                                  style={groupColor?.style}
                                  type="button"
                                >
                                  <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${groupColor?.marker ?? "bg-slate-400"}`}
                                    style={groupColor?.style}
                                  />
                                  <span className="min-w-0 truncate">{value}</span>
                                </button>
                              ) : isGroupName ? (
                                <span
                                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold sm:text-sm ${groupColor?.chip ?? "border-slate-200 bg-slate-100 text-slate-700"}`}
                                  style={groupColor?.style}
                                >
                                  <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${groupColor?.marker ?? "bg-slate-400"}`}
                                    style={groupColor?.style}
                                  />
                                  <span className="min-w-0 truncate">{value}</span>
                                </span>
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
                            {activeEntityKey !== "attendanceRecords" ? (
                              <>
                                <ActionButton compact icon={Pencil} label={ui.edit} onClick={() => {
                                  navigateDashboard({
                                    mode: "edit",
                                    rowId: row.id,
                                  });
                                }} />
                                <ActionButton compact danger icon={Trash2} label={ui.delete} onClick={() => void handleSoftDelete(row)} />
                              </>
                            ) : null}
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
        ) : null}
      </section>
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
