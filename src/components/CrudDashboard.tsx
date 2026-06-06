import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { HexAlphaColorPicker } from "react-colorful";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  BarChart3,
  Database,
  Download,
  Eye,
  ExternalLink,
  FileUp,
  FileText,
  GraduationCap,
  Layers3,
  ListChecks,
  Loader2,
  Menu,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  Trophy,
  Trash2,
  UserCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  createAdminUser,
  createRow,
  createRows,
  createCourse,
  deleteAdminUser,
  formatValue,
  getEditableFields,
  getInitialValue,
  getRowLabel,
  listAdminUsers,
  listRows,
  softDeleteCourse,
  softDeleteRow,
  updateAdminUser,
  updateCourse,
  updateRow,
  type AdminUser,
  type Cohort,
  type Course,
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
  blobToDataUrl,
  buildGroupAttendanceStats,
  buildGroupFileName,
  buildZipBlob,
  buildZipFileName,
  copyBlobToClipboard,
  getDateRangeSessions,
  renderAttendanceChartPngBlob,
  triggerBlobDownload,
  type AttendanceChartData,
} from "../crud/attendanceCharts";
import {
  importAttendanceData,
  parseAttendanceImportFile,
  type AttendanceImportResult,
  type ParsedAttendanceImport,
} from "../crud/importAttendance";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { queryKeys } from "../features/query/keys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  RoutedViewDialogContent,
} from "./ui/dialog";
import { Sheet, SheetContent } from "./ui/sheet";
import { Select } from "./ui/select";
import {
  cleanSearch,
  coursePath,
  dashboardPath,
  decodeDraft,
  getEntityId,
  type DraftValues,
  type RouteSearch,
  type ViewMode,
} from "../routing";
import {
  searchRows,
} from "../features/dashboard/utils/search";
import {
  getDateDaysAgoString,
  getTodayDateString,
} from "../features/dashboard/utils/date";
import { downloadGoogleContactsCsv } from "../crud/googleContacts";

type RelationOptions = Partial<Record<EntityId, CrudRow[]>>;

function SearchInput({
  className,
  inputRef,
  onChange,
  onClear,
  placeholder,
  value,
}: {
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="relative w-full">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <input
        className={cn(
          "w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pe-10 ps-10 text-sm shadow-sm [&::-webkit-search-cancel-button]:appearance-none",
          className,
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={inputRef}
        type="search"
        value={value}
      />
      {value ? (
        <Button
          aria-label="مسح البحث"
          className="absolute left-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg text-slate-500 hover:text-slate-800"
          onClick={onClear}
          size="icon"
          title="مسح البحث"
          variant="secondary"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
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

const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const groupColorPickerDefaults: Record<string, string> = {
  rose: "#e11d48",
  sky: "#0ea5e9",
  lime: "#65a30d",
  indigo: "#4f46e5",
  violet: "#7c3aed",
  teal: "#0d9488",
  orange: "#ea580c",
  cyan: "#0891b2",
};

function mixHexWithWhite(hex: string, whiteRatio = 0.72) {
  const normalized = hex.slice(1);
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16),
  );
  const mixed = channels.map((channel) =>
    Math.round(channel + (255 - channel) * whiteRatio)
      .toString(16)
      .padStart(2, "0"),
  );
  const alpha = normalized.length === 8 ? normalized.slice(6) : "";
  return `#${mixed.join("")}${alpha}`;
}

function getPickerColor(value: CrudValue | undefined) {
  if (typeof value !== "string") {
    return "#e11d48";
  }

  const customDarkColor = value.split(",")[1]?.trim();
  if (customDarkColor && /^#[0-9a-f]{3}$/i.test(customDarkColor)) {
    return `#${customDarkColor
      .slice(1)
      .split("")
      .map((character) => character.repeat(2))
      .join("")}`;
  }

  return groupColorPickerDefaults[value] ??
    (/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(customDarkColor ?? "")
      ? customDarkColor
      : undefined) ??
    "#e11d48";
}

function getCustomGroupColorStyle(lightColor: string, darkColor: string) {
  return {
    "--group-color-light": lightColor,
    "--group-color-dark": darkColor,
    "--group-color-selected": darkColor,
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
  cohorts: Layers3,
  cohortEnrollments: ListChecks,
  students: GraduationCap,
  teachers: UserRound,
  groups: UsersRound,
  assignments: FileText,
  pages: BookOpen,
  awqafCertificatePages: ShieldCheck,
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

  if (entity.table === "groups" && field.key === "colorCode") {
    return "#f3a5b5,#e11d48";
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
      (row) =>
        String(row[field.relation!.valueField ?? "id"]) === String(value),
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

const studentPhoneFields = [
  { key: "phone", label: "هاتف الطالب" },
  { key: "primaryParentPhone", label: "الهاتف الأساسي" },
  { key: "fatherPhone", label: "هاتف الأب" },
  { key: "motherPhone", label: "هاتف الأم" },
] as const;

function displayPhone(value: CrudValue | undefined) {
  const phone = String(value ?? "").trim();
  return phone || null;
}

function StudentPhoneManagement({
  groups,
  onOpenStudentList,
  onEdit,
  students,
}: {
  groups: CrudRow[];
  onOpenStudentList: () => void;
  onEdit: (student: CrudRow) => void;
  students: CrudRow[];
}) {
  const [search, setSearch] = useState("");
  const filteredStudents = searchRows(students, search, (student) => {
    const group = groups.find(
      (candidate) => String(candidate.id) === String(student.groupId),
    );
    return [
      getStudentName(student),
      group?.name,
      ...studentPhoneFields.map(({ key }) => student[key]),
    ].join(" ");
  });
  const withPhones = students.filter((student) =>
    studentPhoneFields.some(({ key }) => displayPhone(student[key])),
  ).length;
  const completeSets = students.filter((student) =>
    studentPhoneFields.every(({ key }) => displayPhone(student[key])),
  ).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-xl shadow-cedar/5">
      <div className="border-b border-slate-200/80 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-cedar">الطلاب</p>
            <h2 className="text-xl font-bold text-ink">إدارة أرقام الهواتف</h2>
            <p className="mt-1 text-sm text-slate-500">
              عرض سريع لجميع أرقام الطالب والعائلة في مكان واحد.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <Button className="gap-2 self-start sm:self-auto" onClick={onOpenStudentList} variant="outline">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              تعديل بيانات الطلاب
            </Button>
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
              <div className="rounded-xl bg-slate-100 px-3 py-2">
                <span className="block font-bold text-ink">{students.length}</span>
                <span className="text-slate-500">طالب</span>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2">
                <span className="block font-bold text-emerald-800">{withPhones}</span>
                <span className="text-emerald-700">لديه رقم</span>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2">
                <span className="block font-bold text-amber-800">{completeSets}</span>
                <span className="text-amber-700">مكتمل</span>
              </div>
            </div>
          </div>
        </div>
        <SearchInput
          className="mt-3"
          onChange={setSearch}
          onClear={() => setSearch("")}
          placeholder="ابحث بالاسم أو المجموعة أو رقم الهاتف"
          value={search}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] divide-y divide-slate-200 text-right text-sm">
          <thead className="bg-mist/70 text-slate-600">
            <tr>
              <th className="px-3 py-3 font-bold">الطالب</th>
              <th className="px-3 py-3 font-bold">المجموعة</th>
              {studentPhoneFields.map((field) => (
                <th className="px-3 py-3 font-bold" key={field.key}>
                  {field.label}
                </th>
              ))}
              <th className="px-3 py-3 font-bold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => {
              const group = groups.find(
                (candidate) => String(candidate.id) === String(student.groupId),
              );
              return (
                <tr className="hover:bg-cedar/5" key={String(student.id)}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-bold text-ink">
                    {getStudentName(student)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                    {formatValue(group?.name)}
                  </td>
                  {studentPhoneFields.map(({ key }) => {
                    const phone = displayPhone(student[key]);
                    return (
                      <td className="whitespace-nowrap px-3 py-2.5" key={key}>
                        {phone ? (
                          <a
                            className="inline-flex items-center gap-1.5 font-semibold text-cedar hover:underline"
                            dir="ltr"
                            href={`tel:${phone.replace(/\s/g, "")}`}
                          >
                            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                            {phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">غير مسجل</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5">
                    <Button onClick={() => onEdit(student)} size="sm" variant="outline">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      تعديل
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredStudents.length === 0 ? (
        <p className="p-5 text-center text-sm text-slate-500">{ui.noMatches}</p>
      ) : null}
    </div>
  );
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

function toReadableLoadError(error: unknown) {
  const fallback = ui.loadError;

  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  const lowerMessage = error.message.toLowerCase();
  if (lowerMessage.includes("permission denied")) {
    return "لا تملك صلاحية الوصول إلى هذه البيانات. تواصل مع مدير النظام لتحديث الصلاحيات.";
  }

  return error.message;
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

function formatPageRange(start: number, end: number) {
  return start === end ? String(start) : `${start}-${end}`;
}

function formatPageRanges(pages: number[]) {
  const sortedPages = Array.from(new Set(pages)).sort((left, right) => left - right);
  const ranges: string[] = [];
  let rangeStart: number | null = null;
  let previousPage: number | null = null;

  sortedPages.forEach((page) => {
    if (rangeStart === null || previousPage === null) {
      rangeStart = page;
      previousPage = page;
      return;
    }

    if (page === previousPage + 1) {
      previousPage = page;
      return;
    }

    ranges.push(formatPageRange(rangeStart, previousPage));
    rangeStart = page;
    previousPage = page;
  });

  if (rangeStart !== null && previousPage !== null) {
    ranges.push(formatPageRange(rangeStart, previousPage));
  }

  return ranges.join(", ");
}

function getGroupedMemorizationPageRows(rows: CrudRow[]) {
  const rowGroups = new Map<string, CrudRow[]>();

  rows.forEach((row) => {
    const key = `${String(row.studentId ?? "")}|${String(row.memorizedOn ?? "")}`;
    rowGroups.set(key, [...(rowGroups.get(key) ?? []), row]);
  });

  return Array.from(rowGroups.entries()).map(([key, groupRows]) => {
    const pages = groupRows
      .map((row) => Number(row.page))
      .filter((page) => Number.isInteger(page));
    const firstRow = groupRows[0];

    return {
      ...firstRow,
      id: `group:${key}`,
      page: formatPageRanges(pages),
      groupedRowCount: groupRows.length,
      isGroupedPageRow: true,
    };
  });
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
    (row) =>
      String(row[field.relation!.valueField ?? "id"]) === String(value),
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

const arabicSortCollator = new Intl.Collator("ar", {
  numeric: true,
  sensitivity: "base",
});

function compareTableValues(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return arabicSortCollator.compare(String(left ?? ""), String(right ?? ""));
}

function SortableHeader({
  canSort,
  label,
  onToggle,
  sorted,
}: {
  canSort: boolean;
  label: ReactNode;
  onToggle?: () => void;
  sorted: false | "asc" | "desc";
}) {
  if (!canSort) {
    return <>{label}</>;
  }

  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  const directionLabel =
    sorted === "asc" ? "تصاعدياً" : sorted === "desc" ? "تنازلياً" : "غير مرتب";

  return (
    <button
      aria-label={`ترتيب ${String(label)}، ${directionLabel}`}
      className="inline-flex w-full items-center gap-1 text-right transition hover:text-cedar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cedar/40"
      onClick={onToggle}
      type="button"
    >
      <span>{label}</span>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function EntityNav({
  activeEntityId,
  activeSchema,
  entityDefinitions,
  getEntityPath,
  isOpen,
  onClose,
  onSelectAttendanceTaking,
  onSelectAttendanceCharts,
  onSelectStudentPhones,
  showAttendanceChartsActive,
  showStudentPhonesActive,
}: {
  activeEntityId: EntityId;
  activeSchema: SchemaName;
  entityDefinitions: EntityDefinition[];
  getEntityPath: (entityId: EntityId) => string;
  isOpen: boolean;
  onClose: () => void;
  onSelectAttendanceTaking: () => void;
  onSelectAttendanceCharts: () => void;
  onSelectStudentPhones: () => void;
  showAttendanceChartsActive: boolean;
  showStudentPhonesActive: boolean;
}) {
  const navItems = entityDefinitions.filter((entity) => entity.showInNav !== false);

  const navContent = (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="px-1 text-sm font-bold text-slate-500">{ui.crudPages}</h2>
      </div>
      <div className="mt-4 grid max-w-full gap-2">
        {navItems.map((entity) => {
          const Icon = entityIcons[getEntityKey(entity.id)] ?? Database;

          return (
            <div className="grid gap-1" key={entity.id}>
            <Link
              className={`flex min-h-14 min-w-0 flex-row-reverse items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold transition ${
                entity.id === activeEntityId
                  ? "bg-cedar text-white shadow-lg shadow-cedar/25"
                  : "text-slate-700 hover:bg-cedar/5 hover:text-cedar"
              }`}
              onClick={onClose}
              search={{}}
              to={getEntityPath(entity.id)}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate">{entity.label}</span>
                <span className="mt-0.5 block truncate text-xs font-medium opacity-75">
                  {entity.description}
                </span>
              </span>
            </Link>
            {entity.id === `${activeSchema}.attendanceRecords` ? (
              <>
                <button
                  className={`mr-8 flex min-h-12 min-w-0 flex-row-reverse items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold transition ${
                    !showAttendanceChartsActive
                      ? "bg-cedar/10 text-cedar"
                      : "text-slate-600 hover:bg-cedar/5 hover:text-cedar"
                  }`}
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
                      تسجيل سريع للحضور والتأخر حسب المجموعة
                    </span>
                  </span>
                </button>
                <button
                  className={`mr-8 flex min-h-12 min-w-0 flex-row-reverse items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold transition ${
                    showAttendanceChartsActive
                      ? "bg-cedar/10 text-cedar"
                      : "text-slate-600 hover:bg-cedar/5 hover:text-cedar"
                  }`}
                  onClick={() => {
                    onSelectAttendanceCharts();
                    onClose();
                  }}
                  type="button"
                >
                  <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate">مخططات الحضور</span>
                    <span className="mt-0.5 block truncate text-xs font-medium opacity-75">
                      رسوم توضح نسب الحضور والتأخر عبر الجلسات
                    </span>
                  </span>
                </button>
              </>
            ) : null}
            {entity.id === `${activeSchema}.students` ? (
              <button
                className={`mr-8 flex min-h-12 min-w-0 flex-row-reverse items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold transition ${
                  showStudentPhonesActive
                    ? "bg-cedar/10 text-cedar"
                    : "text-slate-600 hover:bg-cedar/5 hover:text-cedar"
                }`}
                onClick={() => {
                  onSelectStudentPhones();
                  onClose();
                }}
                type="button"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate">إدارة الهواتف</span>
                  <span className="mt-0.5 block truncate text-xs font-medium opacity-75">
                    مراجعة أرقام الطالب وولي الأمر بسرعة
                  </span>
                </span>
              </button>
            ) : null}
          </div>
          );
        })}
      </div>
    </>
  );

  const desktopNav =
    typeof document === "undefined"
      ? null
      : createPortal(
          <aside
            className="fixed right-0 top-0 z-[80] hidden h-screen w-72 overflow-y-auto border-l border-white/70 bg-white/95 p-4 pt-6 shadow-2xl shadow-slate-900/20 backdrop-blur xl:block"
            data-onboarding="dashboard-nav"
          >
            {navContent}
          </aside>,
          document.body,
        );

  return (
    <>
      {desktopNav}
      <div className="xl:hidden">
        <Sheet
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              onClose();
            }
          }}
          open={isOpen}
        >
          <SheetContent
            className="w-72 max-w-[82vw] overflow-y-auto p-4 pt-20"
            data-onboarding="dashboard-nav"
            side="right"
          >
            {navContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

const inputClass =
  "mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-ink shadow-sm transition placeholder:text-slate-400 focus:border-cedar sm:text-sm";

const textareaClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-ink shadow-sm transition placeholder:text-slate-400 focus:border-cedar sm:text-sm";

function EntityForm({
  entity,
  entityDefinitions,
  mode,
  relationOptions,
  row,
  draft,
  onCancel,
  onSubmit,
}: {
  entity: EntityDefinition;
  entityDefinitions: EntityDefinition[];
  mode: "create" | "edit";
  relationOptions: RelationOptions;
  row?: CrudRow;
  draft?: DraftValues;
  onCancel: () => void;
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

  function updateField(field: FieldDefinition, value: string) {
    setValues((current) => {
      const next = {
        ...current,
        [field.key]: parseInputValue(field, value),
      };
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
            className={`flex min-w-0 flex-col ${
              field.type === "textarea" ? "sm:col-span-2" : ""
            }`}
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
                    const optionValue =
                      option[field.relation!.valueField ?? "id"];
                    const relationEntity = findEntityDefinition(
                      field.relation!.entityId,
                      entityDefinitions,
                    );

                    return (
                      <option
                        key={String(optionId)}
                        value={String(optionValue ?? "")}
                      >
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
                className={`${textareaClass} min-h-32 resize-y leading-7`}
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
            ) : field.type === "color" ? (
              <div className="group-color-picker mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <HexAlphaColorPicker
                  color={getPickerColor(values[field.key])}
                  onChange={(darkColor) => {
                    updateField(
                      field,
                      `${mixHexWithWhite(darkColor)},${darkColor}`,
                    );
                  }}
                />
                <div className="mt-3 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-10 flex-1 rounded-xl border border-black/10 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0px]"
                  >
                    <span
                      className="block h-full rounded-xl"
                      style={{
                        backgroundColor: getPickerColor(values[field.key]),
                      }}
                    />
                  </span>
                  <span className="text-sm font-bold text-slate-600">
                    اللون والشفافية
                  </span>
                </div>
              </div>
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
    <div className="rounded-3xl border border-white/70 bg-white/90 p-3 shadow-xl shadow-cedar/5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {[
            ["صفحات الحفظ", studentStats.memorizedPages],
            ["نقاط الحفظ", studentStats.pagePoints],
            ["النقاط اليدوية", studentStats.manualPoints],
            ["المجموع", studentStats.totalPoints],
          ].map(([label, value]) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3" key={label}>
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-bold text-ink">{value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 md:col-span-2">
            <p className="text-sm font-bold text-ink">آخر صفحات الحفظ</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
              {recentPages.length ? recentPages.map((page) => (
                <p className="rounded-xl bg-slate-50 px-3 py-2" key={String(page.id)}>
                  صفحة {formatValue(page.page)} · {formatValue(page.memorizedOn)}
                </p>
              )) : <p className="text-slate-500">{ui.noRecords}</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 md:col-span-2">
            <p className="text-sm font-bold text-ink">آخر حركات النقاط</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
              {recentManualTransactions.length ? recentManualTransactions.map((transaction) => (
                <p className="rounded-xl bg-slate-50 px-3 py-2" key={String(transaction.id)}>
                  {formatValue(transaction.amount)} · {formatValue(transaction.reason)}
                </p>
              )) : <p className="text-slate-500">{ui.noRecords}</p>}
            </div>
          </div>
        </div>
      ) : null}

      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {entity.fields.map((field) => (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5" key={field.key}>
            <dt className="text-xs font-bold text-slate-500">{field.label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-ink">
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

const courseUi = {
  active: "\u0646\u0634\u0637\u0629",
  back: "\u0631\u062C\u0648\u0639",
  cancel: "\u0625\u0644\u063A\u0627\u0621",
  courseDetails: "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062F\u0648\u0631\u0629",
  coursesTitle: "\u0627\u0644\u062F\u0648\u0631\u0627\u062A",
  deleteBody:
    "\u0633\u064A\u062A\u0645 \u0625\u062E\u0641\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u062F\u0648\u0631\u0629 \u0645\u0646 \u0627\u0644\u0642\u0648\u0627\u0626\u0645\u060C \u0645\u0639 \u0627\u0644\u0627\u062D\u062A\u0641\u0627\u0638 \u0628\u0628\u064A\u0627\u0646\u0627\u062A\u0647\u0627 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629.",
  deleteTitle: "\u062D\u0630\u0641 \u0627\u0644\u062F\u0648\u0631\u0629",
  description: "\u0627\u0644\u0648\u0635\u0641",
  inactive: "\u0645\u0639\u0637\u0644\u0629",
  name: "\u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0631\u0629",
  newCourse: "\u062F\u0648\u0631\u0629 \u062C\u062F\u064A\u062F\u0629",
  noCourses: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062F\u0648\u0631\u0627\u062A \u0628\u0639\u062F.",
  notFound: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u062F\u0648\u0631\u0629.",
  openDashboard: "\u0641\u062A\u062D \u0644\u0648\u062D\u0629 \u0627\u0644\u062F\u0648\u0631\u0629",
  openCourse: "\u0641\u062A\u062D \u0627\u0644\u062F\u0648\u0631\u0629",
  saveChanges: "\u062D\u0641\u0638 \u0627\u0644\u062A\u0639\u062F\u064A\u0644\u0627\u062A",
  slug: "\u0631\u0627\u0628\u0637 \u0627\u0644\u062F\u0648\u0631\u0629",
};

function CourseStatusBadge({ course }: { course: Course }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${
        course.isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {course.isActive ? courseUi.active : courseUi.inactive}
    </span>
  );
}

function CourseForm({
  course,
  error,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  course?: Course | null;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: {
    description: string;
    isActive: boolean;
    name: string;
    slug: string;
  }) => Promise<void>;
  submitLabel: string;
}) {
  const [draft, setDraft] = useState({
    description: course?.description ?? "",
    isActive: course?.isActive ?? true,
    name: course?.name ?? "",
    slug: course?.slug ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDraft({
      description: course?.description ?? "",
      isActive: course?.isActive ?? true,
      name: course?.name ?? "",
      slug: course?.slug ?? "",
    });
  }, [course]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(draft);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        <span>{courseUi.name}</span>
        <input
          className="arabic-readable min-h-12 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          onChange={(event) =>
            setDraft((current) => ({ ...current, name: event.target.value }))
          }
          value={draft.name}
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        <span>{courseUi.slug}</span>
        <input
          className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm"
          dir="ltr"
          onChange={(event) =>
            setDraft((current) => ({ ...current, slug: event.target.value }))
          }
          placeholder="course-slug"
          value={draft.slug}
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        <span>{courseUi.description}</span>
        <textarea
          className="min-h-28 min-w-0 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          value={draft.description}
        />
      </label>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
        <input
          checked={draft.isActive}
          className="h-4 w-4 accent-cedar"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              isActive: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>{courseUi.active}</span>
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={onCancel}
          type="button"
        >
          {courseUi.cancel}
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cedar px-4 text-sm font-bold text-white transition hover:bg-palm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{submitLabel}</span>
        </button>
      </div>
    </form>
  );
}

export function CourseListPage({ courses }: { courses: Course[] }) {
  const navigate = useNavigate();

  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-cedar/5 backdrop-blur sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-cedar">{courseUi.coursesTitle}</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
            {courseUi.coursesTitle}
          </h1>
        </div>
        <button
          aria-label={courseUi.newCourse}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cedar text-white shadow-lg shadow-cedar/20 transition hover:bg-palm"
          onClick={() => void navigate({ to: coursePath({ mode: "create" }) })}
          title={courseUi.newCourse}
          type="button"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {courses.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {courseUi.noCourses}
          </p>
        ) : (
          courses.map((course) => (
            <div
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              key={course.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="arabic-readable min-w-0 break-words text-base font-bold text-ink">
                    {course.name}
                  </p>
                  <CourseStatusBadge course={course} />
                </div>
                <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                  /{course.slug}
                </p>
                {course.description ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                    {course.description}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cedar px-3 text-xs font-bold text-white shadow-lg shadow-cedar/20 transition hover:bg-palm"
                  onClick={() =>
                    void navigate({
                      to: dashboardPath({
                        courseSlug: course.slug,
                        entity: "cohorts",
                      }),
                    })
                  }
                  type="button"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{courseUi.openCourse}</span>
                </button>
                <ActionButton
                  compact
                  icon={Eye}
                  label={ui.view}
                  onClick={() =>
                    void navigate({
                      to: coursePath({
                        courseSlug: course.slug,
                        mode: "detail",
                      }),
                    })
                  }
                />
                <ActionButton
                  compact
                  icon={Pencil}
                  label={ui.edit}
                  onClick={() =>
                    void navigate({
                      to: coursePath({
                        courseSlug: course.slug,
                        mode: "edit",
                      }),
                    })
                  }
                />
                <ActionButton
                  compact
                  danger
                  icon={Trash2}
                  label={ui.delete}
                  onClick={() =>
                    void navigate({
                      to: coursePath({
                        courseSlug: course.slug,
                        mode: "delete",
                      }),
                    })
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function CourseCreatePage({
  onCoursesChanged,
}: {
  onCoursesChanged: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: {
    description: string;
    isActive: boolean;
    name: string;
    slug: string;
  }) {
    setError(null);

    if (!values.name.trim()) {
      setError("\u0623\u062F\u062E\u0644 \u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0631\u0629.");
      return;
    }

    try {
      const course = await createCourse({
        description: values.description,
        isActive: values.isActive,
        name: values.name,
        slug: values.slug || values.name,
      });
      await onCoursesChanged();
      if (course) {
        void navigate({
          to: coursePath({ courseSlug: course.slug, mode: "detail" }),
        });
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-cedar/5 backdrop-blur sm:p-5">
      <div className="mb-5">
        <p className="text-sm font-bold text-cedar">{courseUi.coursesTitle}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          {courseUi.newCourse}
        </h1>
      </div>
      <CourseForm
        error={error}
        onCancel={() => void navigate({ to: coursePath({ mode: "list" }) })}
        onSubmit={handleSubmit}
        submitLabel={ui.create}
      />
    </section>
  );
}

function CourseNotFound() {
  const navigate = useNavigate();

  return (
    <section className="rounded-3xl border border-amber-100 bg-white/90 p-6 shadow-xl shadow-amber-950/5">
      <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
        {courseUi.notFound}
      </p>
      <div className="mt-4">
        <button
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={() => void navigate({ to: coursePath({ mode: "list" }) })}
          type="button"
        >
          {courseUi.back}
        </button>
      </div>
    </section>
  );
}

export function CourseDetailPage({ course }: { course: Course | null }) {
  const navigate = useNavigate();

  if (!course) {
    return <CourseNotFound />;
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-cedar/5 backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-cedar">{courseUi.courseDetails}</p>
          <h1 className="arabic-readable mt-1 break-words text-2xl font-bold text-ink sm:text-3xl">
            {course.name}
          </h1>
          <p className="mt-1 break-all text-xs font-semibold text-slate-500">
            /{course.slug}
          </p>
        </div>
        <CourseStatusBadge course={course} />
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <dt className="text-xs font-bold text-slate-500">{courseUi.name}</dt>
          <dd className="arabic-readable mt-2 break-words text-sm font-semibold text-ink">
            {course.name}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <dt className="text-xs font-bold text-slate-500">{courseUi.slug}</dt>
          <dd className="mt-2 break-all text-sm font-semibold text-ink">
            {course.slug}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">
          <dt className="text-xs font-bold text-slate-500">
            {courseUi.description}
          </dt>
          <dd className="mt-2 break-words text-sm font-semibold leading-7 text-ink">
            {course.description || ui.none}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={() => void navigate({ to: coursePath({ mode: "list" }) })}
          type="button"
        >
          {courseUi.back}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={() =>
            void navigate({
              to: coursePath({ courseSlug: course.slug, mode: "edit" }),
            })
          }
          type="button"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span>{ui.edit}</span>
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
          onClick={() =>
            void navigate({
              to: coursePath({ courseSlug: course.slug, mode: "delete" }),
            })
          }
          type="button"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span>{ui.delete}</span>
        </button>
        <button
          className="inline-flex h-10 items-center justify-center rounded-xl bg-cedar px-4 text-sm font-bold text-white transition hover:bg-palm"
          onClick={() =>
            void navigate({
              to: dashboardPath({
                courseSlug: course.slug,
                entity: "students",
              }),
            })
          }
          type="button"
        >
          {courseUi.openDashboard}
        </button>
      </div>
    </section>
  );
}

export function CourseEditPage({
  course,
  onCoursesChanged,
}: {
  course: Course | null;
  onCoursesChanged: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  if (!course) {
    return <CourseNotFound />;
  }

  async function handleSubmit(values: {
    description: string;
    isActive: boolean;
    name: string;
    slug: string;
  }) {
    if (!course) {
      return;
    }

    setError(null);

    if (!values.name.trim()) {
      setError("\u0623\u062F\u062E\u0644 \u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0631\u0629.");
      return;
    }

    try {
      const updatedCourse = await updateCourse(course.id, {
        description: values.description,
        isActive: values.isActive,
        name: values.name,
        slug: values.slug || values.name,
      });
      await onCoursesChanged();
      if (updatedCourse) {
        if (router.history.canGoBack()) {
          router.history.back();
        } else {
          void navigate({
            to: coursePath({
              courseSlug: updatedCourse.slug,
              mode: "detail",
            }),
          });
        }
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-cedar/5 backdrop-blur sm:p-5">
      <div className="mb-5">
        <p className="text-sm font-bold text-cedar">{courseUi.coursesTitle}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          {ui.edit} {course.name}
        </h1>
      </div>
      <CourseForm
        course={course}
        error={error}
        onCancel={() =>
          void navigate({
            to: coursePath({ courseSlug: course.slug, mode: "detail" }),
          })
        }
        onSubmit={handleSubmit}
        submitLabel={courseUi.saveChanges}
      />
    </section>
  );
}

export function CourseDeletePage({
  course,
  onCoursesChanged,
}: {
  course: Course | null;
  onCoursesChanged: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!course) {
    return <CourseNotFound />;
  }

  async function handleDelete() {
    if (!course) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await softDeleteCourse(course.id);
      await onCoursesChanged();
      void navigate({ to: coursePath({ mode: "list" }) });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-amber-100 bg-white/90 p-4 shadow-xl shadow-amber-950/5 sm:p-5">
      <p className="text-sm font-bold text-amber-800">{courseUi.deleteTitle}</p>
      <h1 className="arabic-readable mt-1 break-words text-2xl font-bold text-ink sm:text-3xl">
        {course.name}
      </h1>
      <p className="mt-1 break-all text-xs font-semibold text-slate-500">
        /{course.slug}
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
        {courseUi.deleteBody}
      </p>
      {error ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={() =>
            void navigate({
              to: coursePath({ courseSlug: course.slug, mode: "detail" }),
            })
          }
          type="button"
        >
          {courseUi.cancel}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-bold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDeleting}
          onClick={() => void handleDelete()}
          type="button"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{ui.delete}</span>
        </button>
      </div>
    </section>
  );
}

export function CourseSettingsPage({
  activeCourse,
  activeSchema,
  courses,
  onCoursesChanged,
  onSelect,
  showAdminSections = true,
}: {
  activeCourse: Course | null;
  activeSchema: SchemaName;
  courses: Course[];
  onCoursesChanged: () => Promise<void>;
  onSelect: (course: Course) => void;
  showAdminSections?: boolean;
}) {
  const entityDefinitions = useMemo(() => getEntityDefinitions(activeSchema), [activeSchema]);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "" });
  const [editDraft, setEditDraft] = useState({
    description: "",
    isActive: true,
    name: "",
    slug: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setEditDraft({
      description: activeCourse?.description ?? "",
      isActive: activeCourse?.isActive ?? true,
      name: activeCourse?.name ?? "",
      slug: activeCourse?.slug ?? "",
    });
  }, [activeCourse]);

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!draft.name.trim()) {
      setError("\u0623\u062F\u062E\u0644 \u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0631\u0629.");
      return;
    }

    try {
      const course = await createCourse({
        description: draft.description,
        name: draft.name,
        slug: draft.slug || draft.name,
      });
      setDraft({ name: "", slug: "", description: "" });
      await onCoursesChanged();
      if (course) {
        onSelect(course);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  async function handleUpdateActiveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!activeCourse) {
      setError("\u0627\u062E\u062A\u0631 \u062F\u0648\u0631\u0629 \u0644\u062A\u0639\u062F\u064A\u0644\u0647\u0627.");
      return;
    }

    if (!editDraft.name.trim()) {
      setError("\u0623\u062F\u062E\u0644 \u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0631\u0629.");
      return;
    }

    try {
      const updatedCourse = await updateCourse(activeCourse.id, {
        description: editDraft.description,
        isActive: editDraft.isActive,
        name: editDraft.name,
        slug: editDraft.slug || editDraft.name,
      });
      await onCoursesChanged();
      if (updatedCourse) {
        onSelect(updatedCourse);
      }
      setSuccess("\u062A\u0645 \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644\u0627\u062A \u0627\u0644\u062F\u0648\u0631\u0629.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  async function handleToggleCourse(course: Course) {
    try {
      setError(null);
      setSuccess(null);
      await updateCourse(course.id, { isActive: !course.isActive });
      await onCoursesChanged();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

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
          <label className="flex w-full flex-col gap-2 text-sm font-bold text-slate-700">
            <span>{"\u0627\u0644\u062F\u0648\u0631\u0629"}</span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
              onChange={(event) => {
                const course = courses.find(
                  (currentCourse) => currentCourse.slug === event.target.value,
                );
                if (course) {
                  onSelect(course);
                }
              }}
              value={activeCourse?.slug ?? ""}
            >
              {!activeCourse ? (
                <option value="" disabled>
                  {"\u0627\u062E\u062A\u0631 \u062F\u0648\u0631\u0629"}
                </option>
              ) : null}
              {courses.map((course) => (
                <option key={course.id} value={course.slug}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-slate-500">{"\u0627\u0644\u062F\u0648\u0631\u0629 \u0627\u0644\u0646\u0634\u0637\u0629"}</p>
          <p className="arabic-readable mt-2 break-all text-2xl font-bold text-ink">
            {activeCourse?.name ?? "\u0644\u0627 \u062A\u0648\u062C\u062F \u062F\u0648\u0631\u0629 \u0645\u062D\u062F\u062F\u0629"}
          </p>
          {activeCourse ? (
            <p className="mt-1 break-all text-xs font-semibold text-slate-500">
              /{activeCourse.slug}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">{"\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062F\u0648\u0631\u0627\u062A"}</p>
            <p className="mt-1 text-xs text-slate-500">{"\u0643\u0644 \u062F\u0648\u0631\u0629 \u062A\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A\u0647\u0627 \u0641\u0642\u0637."}</p>
          </div>
          <Layers3 className="h-5 w-5 text-cedar" aria-hidden="true" />
        </div>
        {error ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}
        {success ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p> : null}
        <div className="mt-4 grid gap-2">
          {courses.map((course) => (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between" key={course.id}>
              <div className="min-w-0">
                <p className="arabic-readable truncate text-sm font-bold text-ink">{course.name}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{course.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => onSelect(course)}
                  type="button"
                >
                  {ui.view}
                </button>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => void handleToggleCourse(course)}
                  type="button"
                >
                  {course.isActive ? "\u062A\u0639\u0637\u064A\u0644" : "\u062A\u0641\u0639\u064A\u0644"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-end" onSubmit={handleCreateCourse}>
          <input className="arabic-readable min-h-12 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder={"\u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0631\u0629"} value={draft.name} />
          <input className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="course-slug" value={draft.slug} />
          <input className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder={"\u0648\u0635\u0641 \u0627\u062E\u062A\u064A\u0627\u0631\u064A"} value={draft.description} />
          <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-cedar px-4 text-sm font-bold text-white md:w-auto" type="submit">{ui.create}</button>
        </form>
      </div>

      <form className="mt-5 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={handleUpdateActiveCourse}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">{"\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062F\u0648\u0631\u0629"}</p>
            <p className="mt-1 text-xs text-slate-500">{"\u063A\u064A\u0631 \u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0631\u0629 \u0648\u0627\u0644\u0631\u0627\u0628\u0637 \u0648\u0627\u0644\u0648\u0635\u0641."}</p>
          </div>
          <Pencil className="h-5 w-5 text-cedar" aria-hidden="true" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            <span>{"\u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0631\u0629"}</span>
            <input
              className="arabic-readable min-h-12 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              disabled={!activeCourse}
              onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))}
              value={editDraft.name}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            <span>{"\u0631\u0627\u0628\u0637 \u0627\u0644\u062F\u0648\u0631\u0629"}</span>
            <input
              className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              disabled={!activeCourse}
              dir="ltr"
              onChange={(event) => setEditDraft((current) => ({ ...current, slug: event.target.value }))}
              value={editDraft.slug}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
            <span>{"\u0627\u0644\u0648\u0635\u0641"}</span>
            <textarea
              className="min-h-24 min-w-0 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm"
              disabled={!activeCourse}
              onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))}
              value={editDraft.description}
            />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
            <input
              checked={editDraft.isActive}
              className="h-4 w-4 accent-cedar"
              disabled={!activeCourse}
              onChange={(event) => setEditDraft((current) => ({ ...current, isActive: event.target.checked }))}
              type="checkbox"
            />
            <span>{"\u062F\u0648\u0631\u0629 \u0646\u0634\u0637\u0629"}</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cedar px-4 text-sm font-bold text-white transition hover:bg-palm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!activeCourse}
            type="submit"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{ui.save}</span>
          </button>
        </div>
      </form>

      {showAdminSections ? <AdminUsersSettings /> : null}

      {showAdminSections && activeCourse ? (
        <PageTierSettings activeCourse={activeCourse} activeSchema={activeSchema} entityDefinitions={entityDefinitions} />
      ) : null}
    </section>
  );
}

function AdminUsersSettings() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [draft, setDraft] = useState({ userId: "", email: "", owner: false });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshAdmins() {
    setIsLoading(true);
    setError(null);

    try {
      setAdmins(await listAdminUsers());
    } catch (caughtError) {
      setError(toReadableLoadError(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshAdmins();
  }, []);

  async function handleCreateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!draft.userId.trim()) {
      setError("أدخل معرف المستخدم.");
      return;
    }

    try {
      await createAdminUser({
        email: draft.email,
        owner: draft.owner,
        userId: draft.userId,
      });
      setDraft({ userId: "", email: "", owner: false });
      await refreshAdmins();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  async function handleEmailChange(admin: AdminUser, email: string) {
    try {
      await updateAdminUser(admin.userId, { email });
      await refreshAdmins();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  async function handleOwnerChange(admin: AdminUser, owner: boolean) {
    try {
      await updateAdminUser(admin.userId, { owner });
      await refreshAdmins();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  async function handleDeleteAdmin(admin: AdminUser) {
    try {
      await deleteAdminUser(admin.userId);
      await refreshAdmins();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">إدارة المستخدمين والصلاحيات</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            المستخدم المالك يستطيع إدارة المستخدمين والصلاحيات وله وصول كامل لكل البيانات.
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 text-cedar" aria-hidden="true" />
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">{ui.loading}</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {admins.map((admin) => (
            <div
              className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] lg:items-center"
              key={admin.userId}
            >
              <div className="min-w-0">
                <p className="break-all text-sm font-bold text-ink">
                  {admin.userId}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : ui.none}
                </p>
              </div>
              <input
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue={admin.email ?? ""}
                onBlur={(event) => void handleEmailChange(admin, event.target.value)}
                placeholder="email@example.com"
              />
              <label className="inline-flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                <span>مالك</span>
                <input
                  checked={admin.owner}
                  className="h-4 w-4 accent-cedar"
                  onChange={(event) => void handleOwnerChange(admin, event.target.checked)}
                  type="checkbox"
                />
              </label>
              <ActionButton
                compact
                danger
                icon={Trash2}
                label={ui.delete}
                onClick={() => void handleDeleteAdmin(admin)}
              />
            </div>
          ))}
        </div>
      )}

      <form
        className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] lg:items-center"
        onSubmit={handleCreateAdmin}
      >
        <input
          className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          onChange={(event) =>
            setDraft((current) => ({ ...current, userId: event.target.value }))
          }
          placeholder="Neon Auth user ID"
          value={draft.userId}
        />
        <input
          className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          onChange={(event) =>
            setDraft((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="email@example.com"
          value={draft.email}
        />
        <label className="inline-flex h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
          <span>مالك</span>
          <input
            checked={draft.owner}
            className="h-4 w-4 accent-cedar"
            onChange={(event) =>
              setDraft((current) => ({ ...current, owner: event.target.checked }))
            }
            type="checkbox"
          />
        </label>
        <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-cedar px-4 text-sm font-bold text-white lg:w-auto" type="submit">
          {ui.create}
        </button>
      </form>
    </div>
  );
}

function PageTierSettings({
  activeCourse,
  activeSchema,
  entityDefinitions,
}: {
  activeCourse: Course;
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
    setTiers(await listRows(tierEntity, activeCourse));
  }

  useEffect(() => {
    void refreshTiers().catch((caughtError) =>
      setError(caughtError instanceof Error ? caughtError.message : ui.loadError),
    );
  }, [activeCourse, tierEntity]);

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
    }, activeCourse);
    setDraft({ minPages: "1", maxPages: "", points: "10", name: "" });
    await refreshTiers();
  }

  async function handleTierChange(row: CrudRow, key: string, value: CrudValue) {
    if (!tierEntity) {
      return;
    }
    await updateRow(tierEntity, Number(row.id), { [key]: value }, activeCourse);
    await refreshTiers();
  }

  async function handleDeleteTier(row: CrudRow) {
    if (!tierEntity) {
      return;
    }
    await softDeleteRow(tierEntity, Number(row.id), activeCourse);
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
      <form className="mt-4 grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end" onSubmit={handleAddTier}>
        <input className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="اسم الشريحة" value={draft.name} />
        <input className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm" min={1} onChange={(event) => setDraft((current) => ({ ...current, minPages: event.target.value }))} type="number" value={draft.minPages} />
        <input className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm" min={1} onChange={(event) => setDraft((current) => ({ ...current, maxPages: event.target.value }))} placeholder="بلا حد" type="number" value={draft.maxPages} />
        <input className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => setDraft((current) => ({ ...current, points: event.target.value }))} type="number" value={draft.points} />
        <button className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl bg-cedar px-3 text-sm font-bold text-white md:w-auto" type="submit">إضافة شريحة</button>
      </form>
    </div>
  );
}

function PointsWorkspace({
  activeSchema,
  relationOptions,
  onOpenManualPoints,
  onNavigateStudent,
}: {
  activeSchema: SchemaName;
  relationOptions: RelationOptions;
  onOpenManualPoints: () => void;
  onNavigateStudent: (student: CrudRow) => void;
}) {
  const [rankMode, setRankMode] = useState<"points" | "pages" | "recent">("points");
  const [leaderboardSorting, setLeaderboardSorting] = useState<SortingState>([
    { id: "totalPoints", desc: true },
  ]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const students = relationOptions[`${activeSchema}.students` as EntityId] ?? [];
  const groups = relationOptions[`${activeSchema}.groups` as EntityId] ?? [];
  const pages = relationOptions[`${activeSchema}.pages` as EntityId] ?? [];
  const awards = relationOptions[`${activeSchema}.pagePointAwards` as EntityId] ?? [];
  const manual = relationOptions[`${activeSchema}.manualPointTransactions` as EntityId] ?? [];

  useEffect(() => {
    setLeaderboardSorting([
      {
        id:
          rankMode === "pages"
            ? "memorizedPages"
            : rankMode === "recent"
              ? "recentPoints"
              : "totalPoints",
        desc: true,
      },
    ]);
  }, [rankMode]);

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
  const activeLeaderboardSort = leaderboardSorting[0];
  const sortedStudents = activeLeaderboardSort
    ? [...rankedStudents].sort((left, right) => {
        const leftGroup = groups.find(
          (group) => String(group.id) === String(left.student.groupId),
        );
        const rightGroup = groups.find(
          (group) => String(group.id) === String(right.student.groupId),
        );
        const values: Record<string, [unknown, unknown]> = {
          student: [getStudentName(left.student), getStudentName(right.student)],
          group: [leftGroup?.name, rightGroup?.name],
          memorizedPages: [left.stats.memorizedPages, right.stats.memorizedPages],
          pagePoints: [left.stats.pagePoints, right.stats.pagePoints],
          manualPoints: [left.stats.manualPoints, right.stats.manualPoints],
          totalPoints: [left.stats.totalPoints, right.stats.totalPoints],
          recentPoints: [left.recentPoints, right.recentPoints],
        };
        const [leftValue, rightValue] = values[activeLeaderboardSort.id] ?? ["", ""];
        const comparison = compareTableValues(leftValue, rightValue);
        return activeLeaderboardSort.desc ? -comparison : comparison;
      })
    : rankedStudents;
  const leaderboardHeaders = [
    { id: "rank", label: "الترتيب", sortable: false },
    { id: "student", label: "الطالب", sortable: true },
    { id: "group", label: "المجموعة", sortable: true },
    { id: "memorizedPages", label: "الصفحات", sortable: true },
    { id: "pagePoints", label: "نقاط الحفظ", sortable: true },
    { id: "manualPoints", label: "يدوي", sortable: true },
    { id: "totalPoints", label: "المجموع", sortable: true },
    { id: "recentPoints", label: "الفترة", sortable: true },
    { id: "actions", label: "", sortable: false },
  ];

  function toggleLeaderboardSort(id: string) {
    setLeaderboardSorting((current) => {
      const sort = current[0];
      if (sort?.id !== id) {
        return [{ id, desc: false }];
      }
      if (!sort.desc) {
        return [{ id, desc: true }];
      }
      return [];
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-xl shadow-cedar/5">
      <div className="space-y-3 border-b border-slate-200/80 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-cedar">لوحة النقاط</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">ترتيب الطلاب والحفظ</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto] sm:items-center">
            <select className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setRankMode(event.target.value as typeof rankMode)} value={rankMode}>
              <option value="points">حسب مجموع النقاط</option>
              <option value="pages">حسب صفحات الحفظ</option>
              <option value="recent">حسب النشاط ضمن الفترة</option>
            </select>
            <input className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
            <input className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
            <SearchInput
              className="h-11 min-w-0"
              onChange={setSearch}
              onClear={() => setSearch("")}
              placeholder="بحث عن طالب"
              value={search}
            />
            <button
              aria-label="إضافة نقاط يدوية"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cedar text-white shadow-lg shadow-cedar/20 transition hover:bg-palm"
              onClick={onOpenManualPoints}
              title="إضافة نقاط يدوية"
              type="button"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-slate-200 text-right text-sm">
          <thead className="bg-mist/70">
            <tr>
              {leaderboardHeaders.map(({ id, label, sortable }) => (
                <th className="px-3 py-2 font-bold text-slate-600" key={id}>
                  <SortableHeader
                    canSort={sortable}
                    label={label}
                    onToggle={() => toggleLeaderboardSort(id)}
                    sorted={
                      activeLeaderboardSort?.id === id
                        ? activeLeaderboardSort.desc
                          ? "desc"
                          : "asc"
                        : false
                    }
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedStudents.map(({ student, stats, recentPoints }, index) => {
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

function ManualPointsPage({
  activeCourse,
  activeSchema,
  entityDefinitions,
  relationOptions,
  onBack,
  onCreated,
}: {
  activeCourse: Course;
  activeSchema: SchemaName;
  entityDefinitions: EntityDefinition[];
  relationOptions: RelationOptions;
  onBack: () => void;
  onCreated: () => Promise<void>;
}) {
  const [studentId, setStudentId] = useState("");
  const [transactionDate, setTransactionDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const students = relationOptions[`${activeSchema}.students` as EntityId] ?? [];
  const manualEntity = getEntityByKey(
    entityDefinitions,
    activeSchema,
    "manualPointTransactions",
  );

  useEffect(() => {
    if (!studentId && students[0]?.id !== undefined) {
      setStudentId(String(students[0].id));
    }
  }, [studentId, students]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);

    if (!manualEntity || !studentId || !Number.isInteger(parsedAmount) || !reason.trim()) {
      setError("اختر الطالب وأدخل مقدار النقاط والسبب.");
      return;
    }

    setIsSaving(true);

    try {
      await createRow(manualEntity, {
        studentId: Number(studentId),
        transactionDate,
        amount: parsedAmount,
        reason: reason.trim(),
      }, activeCourse);
      setAmount("");
      setReason("");
      await onCreated();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ui.createError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-xl shadow-cedar/5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 p-4">
        <div>
          <p className="text-sm font-bold text-cedar">لوحة النقاط</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">إضافة نقاط يدوية</h2>
        </div>
        <button
          aria-label={ui.cancel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          onClick={onBack}
          title={ui.cancel}
          type="button"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <form className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1.2fr)_auto] md:items-end" onSubmit={handleSubmit}>
        <select className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setStudentId(event.target.value)} value={studentId}>
          {students.map((student) => (
            <option key={String(student.id)} value={String(student.id)}>
              {getStudentName(student)}
            </option>
          ))}
        </select>
        <input className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setTransactionDate(event.target.value)} type="date" value={transactionDate} />
        <input className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setAmount(event.target.value)} placeholder="نقاط + أو -" type="number" value={amount} />
        <input className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setReason(event.target.value)} placeholder="السبب" value={reason} />
        {error ? <p className="order-last rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 md:col-span-5">{error}</p> : null}
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          <span>{isSaving ? ui.saving : "إضافة حركة"}</span>
        </button>
      </form>
    </div>
  );
}

function MemorizationWorkspace({
  activeCourse,
  activeSchema,
  entityDefinitions,
  onCreated,
  relationOptions,
}: {
  activeCourse: Course;
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
        activeCourse,
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
          activeCourse,
        );
      } catch (awardError) {
        await Promise.all(
          createdPages
            .map((page) => Number(page.id))
            .filter((id) => Number.isFinite(id))
            .map((id) => softDeleteRow(pagesEntity, id, activeCourse)),
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
  isChartsPage,
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
  isChartsPage: boolean;
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
    isTakingPage ? "taking" : isChartsPage ? "group" : "student",
  );
  const [studentSearch, setStudentSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<CrudValue | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<CrudValue | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<CrudValue | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [chartFromDate, setChartFromDate] = useState(getDateDaysAgoString(30));
  const [chartToDate, setChartToDate] = useState(getTodayDateString());
  const [exportGroupId, setExportGroupId] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<AttendanceChartData | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartBusy, setChartBusy] = useState(false);

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
    setViewMode(isTakingPage ? "taking" : isChartsPage ? "group" : "student");
  }, [isChartsPage, isTakingPage]);

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
      student.primaryParentPhone,
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
  const chartSessions = useMemo(
    () => getDateRangeSessions(sessions, chartFromDate, chartToDate),
    [chartFromDate, chartToDate, sessions],
  );
  const groupStats = useMemo(
    () => buildGroupAttendanceStats(groups, students, chartSessions, records),
    [chartSessions, groups, records, students],
  );
  const selectedGroupStat =
    exportGroupId === "all"
      ? null
      : groupStats.find((stat) => stat.groupId === exportGroupId) ?? null;
  const canRunExports = chartSessions.length > 0 && groupStats.length > 0;

  async function handlePreviewChart() {
    if (!selectedGroupStat) {
      setChartError("اختر مجموعة واحدة للمعاينة.");
      return;
    }

    setChartError(null);
    setChartBusy(true);

    try {
      const blob = await renderAttendanceChartPngBlob(
        selectedGroupStat,
        chartFromDate,
        chartToDate,
      );
      const dataUrl = await blobToDataUrl(blob);
      setPreviewMeta(selectedGroupStat);
      setPreviewImageUrl(dataUrl);
      setPreviewOpen(true);
    } catch (error) {
      setChartError(error instanceof Error ? error.message : ui.createError);
    } finally {
      setChartBusy(false);
    }
  }

  async function handleCopyChart() {
    if (!selectedGroupStat) {
      setChartError("اختر مجموعة واحدة للنسخ.");
      return;
    }

    setChartError(null);
    setChartBusy(true);

    try {
      const blob = await renderAttendanceChartPngBlob(
        selectedGroupStat,
        chartFromDate,
        chartToDate,
      );
      await copyBlobToClipboard(blob);
    } catch (error) {
      setChartError(error instanceof Error ? error.message : ui.createError);
    } finally {
      setChartBusy(false);
    }
  }

  async function handleDownloadPng() {
    if (!selectedGroupStat) {
      setChartError("اختر مجموعة واحدة لتنزيل صورة PNG.");
      return;
    }

    setChartError(null);
    setChartBusy(true);

    try {
      const blob = await renderAttendanceChartPngBlob(
        selectedGroupStat,
        chartFromDate,
        chartToDate,
      );
      triggerBlobDownload(
        blob,
        buildGroupFileName(selectedGroupStat.groupName, chartFromDate, chartToDate),
      );
    } catch (error) {
      setChartError(error instanceof Error ? error.message : ui.createError);
    } finally {
      setChartBusy(false);
    }
  }

  async function handleDownloadZip() {
    setChartError(null);
    setChartBusy(true);

    try {
      const files = await Promise.all(
        groupStats.map(async (stat) => ({
          name: buildGroupFileName(stat.groupName, chartFromDate, chartToDate),
          blob: await renderAttendanceChartPngBlob(stat, chartFromDate, chartToDate),
        })),
      );
      const zipBlob = await buildZipBlob(files);
      triggerBlobDownload(zipBlob, buildZipFileName(chartFromDate, chartToDate));
    } catch (error) {
      setChartError(error instanceof Error ? error.message : ui.createError);
    } finally {
      setChartBusy(false);
    }
  }

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
            <SearchInput
              onChange={setStudentSearch}
              onClear={() => setStudentSearch("")}
              placeholder="بحث سريع عن طالب"
              value={studentSearch}
            />
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
            <SearchInput
              onChange={setGroupSearch}
              onClear={() => setGroupSearch("")}
              placeholder="بحث عن مجموعة"
              value={groupSearch}
            />
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
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-bold text-ink">Image Generator</p>
              <p className="mt-1 text-xs text-slate-500">
                Generate attendance chart images by group and date range.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Group
                  <Select
                    className="mt-1"
                    onChange={(event) => setExportGroupId(event.target.value)}
                    value={exportGroupId}
                  >
                    <option value="all">All groups</option>
                    {groups.map((group) => (
                      <option key={String(group.id)} value={String(group.id)}>
                        {formatValue(group.name)}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-bold text-slate-700">
                    From
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-cedar/25"
                      onChange={(event) => setChartFromDate(event.target.value)}
                      type="date"
                      value={chartFromDate}
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    To
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-cedar/25"
                      onChange={(event) => setChartToDate(event.target.value)}
                      type="date"
                      value={chartToDate}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={chartBusy || !canRunExports || exportGroupId === "all"}
                  onClick={() => void handlePreviewChart()}
                  size="sm"
                  variant="outline"
                >
                  Preview
                </Button>
                <Button
                  disabled={chartBusy || !canRunExports || exportGroupId === "all"}
                  onClick={() => void handleCopyChart()}
                  size="sm"
                  variant="outline"
                >
                  Copy
                </Button>
                <Button
                  disabled={chartBusy || !canRunExports || exportGroupId === "all"}
                  onClick={() => void handleDownloadPng()}
                  size="sm"
                >
                  {chartBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Download PNG
                </Button>
                <Button
                  disabled={chartBusy || !canRunExports}
                  onClick={() => void handleDownloadZip()}
                  size="sm"
                  variant="secondary"
                >
                  {chartBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Download ZIP
                </Button>
              </div>
              {!canRunExports ? (
                <p className="mt-2 text-xs text-amber-700">No sessions found in this date range.</p>
              ) : null}
              {chartError ? (
                <p className="mt-2 text-xs text-amber-700">{chartError}</p>
              ) : null}
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
      <Dialog onOpenChange={setPreviewOpen} open={previewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attendance Preview</DialogTitle>
            <DialogDescription>
              {previewMeta
                ? `${previewMeta.groupName} | ${chartFromDate} to ${chartToDate}`
                : "Chart preview"}
            </DialogDescription>
          </DialogHeader>
          {previewImageUrl ? (
            <img
              alt="Attendance chart preview"
              className="w-full rounded-xl border border-slate-200"
              src={previewImageUrl}
            />
          ) : (
            <p className="text-sm text-slate-500">No preview generated yet.</p>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="min-w-0 text-sm font-bold text-slate-700">
              <span>بحث داخل القائمة</span>
              <SearchInput
                className="mt-2 min-w-0 font-normal"
                onChange={setRosterSearch}
                onClear={() => setRosterSearch("")}
                placeholder="اسم الطالب أو رقمه"
                value={rosterSearch}
              />
            </div>
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
  activeCohort,
  activeCourse,
  activeSchema,
  attendanceCharts = false,
  attendanceTaking = false,
  manualPoints = false,
  studentPhones = false,
  mode,
  rowId,
  routeSearch,
  topAccessory,
}: {
  activeEntityKey: EntityKey;
  activeCohort?: Cohort | null;
  activeCourse: Course;
  activeSchema: SchemaName;
  attendanceCharts?: boolean;
  attendanceTaking?: boolean;
  manualPoints?: boolean;
  studentPhones?: boolean;
  mode: ViewMode;
  rowId?: string;
  routeSearch: RouteSearch;
  topAccessory: ReactNode;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const entityDefinitions = useMemo(
    () => getEntityDefinitions(activeSchema),
    [activeSchema],
  );
  const activeEntityId = getEntityId(activeSchema, activeEntityKey);
  const activeEntity =
    findEntityDefinition(activeEntityId, entityDefinitions) ??
    entityDefinitions[0];
  const [selectedRow, setSelectedRow] = useState<CrudRow | null>(null);
  const [mutationError, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const rowsQueryKey = queryKeys.rows(
    activeSchema,
    activeEntityKey,
    activeCourse.id,
    activeCohort?.id,
  );
  const relationOptionsQueryKey = queryKeys.relationOptions(
    activeSchema,
    activeEntityKey,
    activeCourse.id,
    activeCohort?.id,
  );
  const rowsQuery = useQuery({
    queryKey: rowsQueryKey,
    queryFn: () => listRows(activeEntity, activeCourse, activeCohort ?? undefined),
  });
  const relationOptionsQuery = useQuery({
    queryKey: relationOptionsQueryKey,
    queryFn: async () => {
      const entries = await Promise.all(
        relationEntityIds.map(async (entityId) => {
          const entity = findEntityDefinition(entityId, entityDefinitions);
          return entity
            ? ([
                entityId,
                await listRows(entity, activeCourse, activeCohort ?? undefined),
              ] as const)
            : null;
        }),
      );

      return Object.fromEntries(
        entries.filter((entry): entry is [EntityId, CrudRow[]] =>
          Boolean(entry),
        ),
      );
    },
  });
  const rows = rowsQuery.data ?? [];
  const relationOptions = relationOptionsQuery.data ?? {};
  const teacherRows =
    relationOptions[`${activeSchema}.teachers` as EntityId] ?? [];
  const isLoading = rowsQuery.isLoading;
  const error = mutationError ?? (rowsQuery.error ? toReadableLoadError(rowsQuery.error) : null);

  async function refreshRows(entity = activeEntity) {
    await queryClient.invalidateQueries({
      queryKey:
        entity.id === activeEntity.id
          ? rowsQueryKey
          : queryKeys.rows(activeSchema, getEntityKey(entity.id), activeCourse.id, activeCohort?.id),
    });
  }

  useEffect(() => {
    setSelectedRow(null);
  }, [activeCohort, activeCourse, activeEntity]);

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

  async function invalidateDashboardQueries() {
    setError(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: rowsQueryKey }),
      queryClient.invalidateQueries({ queryKey: relationOptionsQueryKey }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceFacts(activeCourse.id, activeCohort?.id),
      }),
    ]);
  }

  const createRowMutation = useMutation({
    mutationFn: (values: Record<string, CrudValue>) =>
      createRow(activeEntity, values, activeCourse, activeCohort ?? undefined),
    onSuccess: invalidateDashboardQueries,
  });
  const updateRowMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: Record<string, CrudValue>;
    }) => updateRow(activeEntity, id, values, activeCourse, activeCohort ?? undefined),
    onSuccess: invalidateDashboardQueries,
  });
  const deleteRowMutation = useMutation({
    mutationFn: (id: number) =>
      softDeleteRow(activeEntity, id, activeCourse, activeCohort ?? undefined),
    onSuccess: invalidateDashboardQueries,
  });

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

    await deleteRowMutation.mutateAsync(id);
    void navigate({
      to: dashboardPath({
        courseSlug: activeCourse.slug,
        cohortTag: activeCohort?.tag,
        entity: getEntityKey(activeEntity.id),
      }),
      search: cleanSearch({ q: searchTerm }),
    });
  }

  const filteredRows = useMemo(() => {
    return searchRows(rows, searchTerm, (row) =>
      activeEntity.fields
        .map((field) =>
          formatFieldValue(field, row[field.key], relationOptions, entityDefinitions),
        )
        .join(" "),
    );
  }, [activeEntity, entityDefinitions, relationOptions, rows, searchTerm]);
  const tableRows = useMemo(
    () =>
      activeEntityKey === "pages"
        ? getGroupedMemorizationPageRows(filteredRows)
        : filteredRows,
    [activeEntityKey, filteredRows],
  );

  async function handleCreate(values: Record<string, CrudValue>) {
    await createRowMutation.mutateAsync(values);
    void navigate({
      to: dashboardPath({
        courseSlug: activeCourse.slug,
        cohortTag: activeCohort?.tag,
        entity: getEntityKey(activeEntity.id),
      }),
      search: cleanSearch({ q: searchTerm }),
    });
  }

  async function handleUpdate(values: Record<string, CrudValue>) {
    if (!selectedRow) {
      return;
    }

    await updateRowMutation.mutateAsync({
      id: Number(selectedRow.id),
      values,
    });
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigateDashboard({
        search: cleanSearch({ q: searchTerm }),
      });
    }
  }

  async function handleMarkAttendance(
    studentId: CrudValue,
    sessionId: CrudValue,
    status: "present" | "late",
    existingRecord?: CrudRow,
  ) {
    if (existingRecord?.id !== undefined && existingRecord.id !== null) {
      await updateRowMutation.mutateAsync({
        id: Number(existingRecord.id),
        values: { status },
      });
    } else {
      await createRowMutation.mutateAsync({
        studentId,
        attendanceSessionId: sessionId,
        status,
      });
    }
  }

  function handleRelationDetail(field: FieldDefinition, row: CrudRow) {
    if (!field.relation) {
      return;
    }

    const relatedRow = getRelatedRow(field, row[field.key], relationOptions);

    if (!relatedRow) {
      return;
    }

    const [, entity] = field.relation.entityId.split(".") as [
      SchemaName,
      EntityKey,
    ];

    void navigate({
      to: dashboardPath({
        courseSlug: activeCourse.slug,
        cohortTag: activeCohort?.tag,
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
        courseSlug: activeCourse.slug,
        cohortTag: activeCohort?.tag,
        entity: next.entity ?? getEntityKey(activeEntity.id),
        mode: next.mode,
        rowId: next.rowId,
      }),
      replace: next.replace,
      search: cleanSearch(next.search ?? { q: searchTerm }),
    });
  }

  const shouldShowRowsTable =
    !attendanceTaking &&
    !attendanceCharts &&
    !studentPhones &&
    activeEntityKey !== "points" &&
    mode !== "create" &&
    mode !== "edit";

  useEffect(() => {
    if (!shouldShowRowsTable) {
      return;
    }

    function handleSearchShortcut(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.code === "KeyF" || event.key.toLowerCase() === "f")
      ) {
        event.preventDefault();
        event.stopPropagation();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }

    window.addEventListener("keydown", handleSearchShortcut, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleSearchShortcut, { capture: true });
  }, [shouldShowRowsTable]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="relative z-50 flex min-w-0 items-start justify-between gap-3 px-1 xl:pr-80">
        <div className="flex min-w-0 items-start gap-2">
          <button
            aria-expanded={isSidebarOpen}
            aria-label={ui.crudPages}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cedar text-white shadow-lg shadow-cedar/20 transition hover:bg-palm xl:hidden"
            onClick={() => setIsSidebarOpen(true)}
            title={ui.crudPages}
            type="button"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 text-right">
            <p className="text-sm font-bold text-cedar">{activeCourse.name}</p>
            <h1 className="mt-0.5 truncate text-2xl font-bold text-ink sm:text-3xl">
              {activeEntity.label}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AttendanceImportDialog
            activeCohort={activeCohort}
            activeCourse={activeCourse}
            activeSchema={activeSchema}
            onImported={invalidateDashboardQueries}
          />
          {topAccessory}
        </div>
      </div>

      <EntityNav
        activeEntityId={activeEntity.id}
        activeSchema={activeSchema}
        entityDefinitions={entityDefinitions}
        getEntityPath={(entityId) =>
          dashboardPath({
            courseSlug: activeCourse.slug,
            cohortTag: activeCohort?.tag,
            entity: getEntityKey(entityId),
          })
        }
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectAttendanceTaking={() => {
          void navigate({
            to: dashboardPath({
              courseSlug: activeCourse.slug,
        cohortTag: activeCohort?.tag,
              entity: "attendanceRecords",
              subpage: "take",
            }),
            search: {},
          });
        }}
        onSelectAttendanceCharts={() => {
          void navigate({
            to: dashboardPath({
              courseSlug: activeCourse.slug,
              cohortTag: activeCohort?.tag,
              entity: "attendanceRecords",
              subpage: "charts",
            }),
            search: {},
          });
        }}
        onSelectStudentPhones={() => {
          void navigate({
            to: dashboardPath({
              courseSlug: activeCourse.slug,
              cohortTag: activeCohort?.tag,
              entity: "students",
              subpage: "phones",
            }),
            search: {},
          });
        }}
        showAttendanceChartsActive={attendanceCharts}
        showStudentPhonesActive={studentPhones}
      />

      <section className="min-w-0 space-y-4 sm:space-y-5 xl:pr-80 xl:pt-0">

        {error ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </p>
        ) : null}

        {activeEntityKey === "points" && manualPoints ? (
          <ManualPointsPage
            activeCourse={activeCourse}
            activeSchema={activeSchema}
            entityDefinitions={entityDefinitions}
            onBack={() =>
              void navigate({
                to: dashboardPath({
                  courseSlug: activeCourse.slug,
        cohortTag: activeCohort?.tag,
                  entity: "points",
                }),
                search: {},
              })
            }
            onCreated={invalidateDashboardQueries}
            relationOptions={relationOptions}
          />
        ) : null}

        {activeEntityKey === "points" && !manualPoints ? (
          <PointsWorkspace
            activeSchema={activeSchema}
            onOpenManualPoints={() =>
              void navigate({
                to: dashboardPath({
                  courseSlug: activeCourse.slug,
        cohortTag: activeCohort?.tag,
                  entity: "points",
                  subpage: "manual",
                }),
                search: {},
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
            relationOptions={relationOptions}
          />
        ) : null}

        {activeEntityKey === "pages" ? (
          <MemorizationWorkspace
            activeCourse={activeCourse}
            activeSchema={activeSchema}
            entityDefinitions={entityDefinitions}
            onCreated={invalidateDashboardQueries}
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
              key={`${activeEntity.id}:create`}
              mode="create"
              onCancel={() => navigateDashboard({ search: cleanSearch({ q: searchTerm }) })}
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
              key={`${activeEntity.id}:edit:${String(selectedRow.id)}`}
              mode="edit"
              onCancel={() =>
                navigateDashboard({
                  mode: "detail",
                  rowId,
                  search: cleanSearch({ q: searchTerm }),
                })
              }
              onSubmit={handleUpdate}
              relationOptions={relationOptions}
              row={selectedRow}
            />
          </div>
        ) : null}

        {mode === "detail" && selectedRow && activeEntityKey !== "points" ? (
          <Dialog
            onOpenChange={(open) => {
              if (!open) {
                navigateDashboard({ search: cleanSearch({ q: searchTerm }) });
              }
            }}
            open
          >
            <RoutedViewDialogContent dir="rtl">
              <DialogTitle className="sr-only">
                {ui.view} {getRowLabel(activeEntity, selectedRow)}
              </DialogTitle>
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
            </RoutedViewDialogContent>
          </Dialog>
        ) : null}

        {activeEntityKey === "students" && studentPhones ? (
          <StudentPhoneManagement
            groups={
              relationOptions[`${activeSchema}.groups` as EntityId] ?? []
            }
            onOpenStudentList={() =>
              void navigate({
                to: dashboardPath({
                  courseSlug: activeCourse.slug,
                  cohortTag: activeCohort?.tag,
                  entity: "students",
                }),
                search: {},
              })
            }
            onEdit={(student) =>
              navigateDashboard({
                entity: "students",
                mode: "edit",
                rowId: student.id,
                search: {},
              })
            }
            students={rows}
          />
        ) : null}

        {activeEntityKey === "attendanceRecords" ? (
          <AttendanceWorkspace
            activeSchema={activeSchema}
            attendanceEntity={activeEntity}
            isChartsPage={attendanceCharts}
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
                  courseSlug: activeCourse.slug,
        cohortTag: activeCohort?.tag,
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

        {shouldShowRowsTable ? (
        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-xl shadow-cedar/5">
          <div
            className="space-y-2 border-b border-slate-200/80 px-2 py-2.5 sm:px-3"
            data-onboarding="dashboard-table-tools"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 text-right">
                <h2 className="text-base font-bold text-ink sm:text-lg">{activeEntity.label}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {ui.showing} {tableRows.length} {ui.from} {rows.length}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {activeEntityKey === "students" && rows.length > 0 ? (
                  <>
                    <button
                      aria-label="إدارة أرقام الهواتف"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 sm:h-10 sm:w-10"
                      onClick={() =>
                        void navigate({
                          to: dashboardPath({
                            courseSlug: activeCourse.slug,
                            cohortTag: activeCohort?.tag,
                            entity: "students",
                            subpage: "phones",
                          }),
                          search: {},
                        })
                      }
                      title="إدارة أرقام الهواتف"
                      type="button"
                    >
                      <Phone className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      aria-label="تصدير جهات اتصال Google"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 sm:h-10 sm:w-10"
                      onClick={() =>
                        downloadGoogleContactsCsv(
                          rows,
                          teacherRows,
                          `google-contacts-${activeCourse.slug}-${activeCohort?.tag ?? "all"}.csv`,
                        )
                      }
                      title="تصدير جهات اتصال Google"
                      type="button"
                    >
                      <Download className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </>
                ) : null}
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
            <SearchInput
              className="py-2"
              inputRef={searchInputRef}
              onChange={(value) =>
                navigateDashboard({
                  replace: true,
                  search: cleanSearch({
                    ...routeSearch,
                    q: value,
                  }),
                })
              }
              onClear={() =>
                  navigateDashboard({
                    replace: true,
                    search: cleanSearch({
                      ...routeSearch,
                      q: "",
                    }),
                  })
              }
              placeholder={`${ui.search} ${activeEntity.label}`}
              value={searchTerm}
            />
          </div>

          {isLoading ? (
            <p className="flex items-center gap-2 p-4 text-sm text-slate-600 sm:p-5">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {ui.loading}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-600 sm:p-5">{ui.noRecords}</p>
          ) : tableRows.length === 0 ? (
            <p className="p-4 text-sm text-slate-600 sm:p-5">{ui.noMatches}</p>
          ) : (
            <>
            <CrudRowsTable
              activeEntity={activeEntity}
              activeEntityKey={activeEntityKey}
              activeSchema={activeSchema}
              entityDefinitions={entityDefinitions}
              onDelete={(row) => void handleSoftDelete(row)}
              onEdit={(row) =>
                navigateDashboard({
                  mode: "edit",
                  rowId: row.id,
                })
              }
              onRelationDetail={handleRelationDetail}
              onView={(row) =>
                navigateDashboard({
                  mode: "detail",
                  rowId: row.id,
                })
              }
              relationOptions={relationOptions}
              rows={tableRows}
            />
            </>
          )}
        </div>
        ) : null}
      </section>
    </div>
  );
}

function CrudRowsTable({
  activeEntity,
  activeEntityKey,
  activeSchema,
  entityDefinitions,
  onDelete,
  onEdit,
  onRelationDetail,
  onView,
  relationOptions,
  rows,
}: {
  activeEntity: EntityDefinition;
  activeEntityKey: EntityKey;
  activeSchema: SchemaName;
  entityDefinitions: EntityDefinition[];
  onDelete: (row: CrudRow) => void;
  onEdit: (row: CrudRow) => void;
  onRelationDetail: (field: FieldDefinition, row: CrudRow) => void;
  onView: (row: CrudRow) => void;
  relationOptions: RelationOptions;
  rows: CrudRow[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const showsGroupColorColumn = ["groups", "students", "teachers"].includes(activeEntityKey);
  const columns = useMemo<ColumnDef<CrudRow>[]>(
    () => [
      ...(showsGroupColorColumn
        ? [
            {
              id: "groupColor",
              enableSorting: false,
              header: () => <span className="sr-only">لون المجموعة</span>,
              cell: ({ row }) => {
                const groupRow = getGroupRowForRecord(
                  activeEntityKey,
                  row.original,
                  activeSchema,
                  relationOptions,
                );
                const groupColor = getGroupColorByCode(groupRow?.colorCode);

                return groupColor ? (
                  <span
                    className={`mx-auto block h-6 w-1.5 rounded-full ${groupColor.marker}`}
                    style={groupColor.style}
                  />
                ) : null;
              },
            } satisfies ColumnDef<CrudRow>,
          ]
        : []),
      ...activeEntity.listFields.map(
        (key): ColumnDef<CrudRow> => ({
          accessorFn: (row) => {
            const field = getField(activeEntity, key);
            const value = row[key];

            if (value === null || value === undefined || value === "") {
              return undefined;
            }
            if (field?.type === "number") {
              const numberValue = Number(value);
              return Number.isNaN(numberValue) ? String(value) : numberValue;
            }
            if (field?.type === "boolean") {
              return value ? 1 : 0;
            }
            if (field?.relation) {
              return getRelationLabel(field, value, relationOptions, entityDefinitions);
            }
            return value;
          },
          id: key,
          sortUndefined: "last",
          sortingFn: (left, right, columnId) =>
            compareTableValues(left.getValue(columnId), right.getValue(columnId)),
          header: () => getField(activeEntity, key)?.label ?? key,
          cell: ({ row }) => {
            const field = getField(activeEntity, key);
            const groupRow = getGroupRowForRecord(
              activeEntityKey,
              row.original,
              activeSchema,
              relationOptions,
            );
            const groupColor = getGroupColorByCode(groupRow?.colorCode);
            const isStudentGroup = activeEntityKey === "students" && key === "groupId";
            const isGroupName = activeEntityKey === "groups" && key === "name";
            const isGroupColor = activeEntityKey === "groups" && key === "colorCode";
            const isPageRange = activeEntityKey === "pages" && key === "page";
            const value = formatFieldValue(
              field,
              row.original[key],
              relationOptions,
              entityDefinitions,
            );

            if (isGroupColor || isGroupName) {
              const displayValue = isGroupColor ? "اللون المختار" : value;

              return (
                <span
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold sm:text-sm ${groupColor?.chip ?? "border-slate-200 bg-slate-100 text-slate-700"}`}
                  style={groupColor?.style}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${groupColor?.marker ?? "bg-slate-400"}`}
                    style={groupColor?.style}
                  />
                  <span className="min-w-0 truncate">{displayValue}</span>
                </span>
              );
            }

            if (isStudentGroup && field?.relation) {
              return (
                <button
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold transition hover:shadow-sm sm:text-sm ${groupColor?.chip ?? "border-slate-200 bg-slate-100 text-slate-700"}`}
                  onClick={() => onRelationDetail(field, row.original)}
                  style={groupColor?.style}
                  type="button"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${groupColor?.marker ?? "bg-slate-400"}`}
                    style={groupColor?.style}
                  />
                  <span className="min-w-0 truncate">{value}</span>
                </button>
              );
            }

            if (isPageRange) {
              return <span className="whitespace-nowrap font-semibold text-ink">{value}</span>;
            }

            return value;
          },
        }),
      ),
      {
        enableSorting: false,
        id: "actions",
        header: () => ui.actions,
        cell: ({ row }) => {
          if (row.original.isGroupedPageRow) {
            return (
              <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                ملخص
              </span>
            );
          }

          return (
            <div className="flex gap-1">
              <ActionButton compact icon={Eye} label={ui.view} onClick={() => onView(row.original)} />
              {activeEntityKey !== "attendanceRecords" ? (
                <>
                  <ActionButton compact icon={Pencil} label={ui.edit} onClick={() => onEdit(row.original)} />
                  <ActionButton compact danger icon={Trash2} label={ui.delete} onClick={() => onDelete(row.original)} />
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [
      activeEntity,
      activeEntityKey,
      activeSchema,
      entityDefinitions,
      onDelete,
      onEdit,
      onRelationDetail,
      onView,
      relationOptions,
      showsGroupColorColumn,
    ],
  );
  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed divide-y divide-slate-200 text-right text-xs sm:text-sm">
        <thead className="bg-mist/70">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  className={`break-words px-0.5 py-1 font-bold leading-5 text-slate-600 sm:px-1 ${
                    header.column.id === "groupColor"
                      ? "w-8"
                      : header.column.id === "actions"
                        ? "w-24 sm:w-28"
                        : ""
                  }`}
                  key={header.id}
                >
                  {header.isPlaceholder
                    ? null
                    : (
                        <SortableHeader
                          canSort={header.column.getCanSort()}
                          label={flexRender(header.column.columnDef.header, header.getContext())}
                          onToggle={() => header.column.toggleSorting()}
                          sorted={header.column.getIsSorted()}
                        />
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => {
            const groupRow = getGroupRowForRecord(
              activeEntityKey,
              row.original,
              activeSchema,
              relationOptions,
            );
            const groupColor = getGroupColorByCode(groupRow?.colorCode);

            return (
              <tr
                className={`transition ${groupColor?.row ?? "hover:bg-cedar/5"}`}
                key={row.id}
                style={groupColor?.style}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    className="break-words px-0.5 py-1 leading-5 text-slate-700 sm:px-1"
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceImportDialog({
  activeCohort,
  activeCourse,
  activeSchema,
  onImported,
}: {
  activeCohort?: Cohort | null;
  activeCourse: Course;
  activeSchema: SchemaName;
  onImported: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedAttendanceImport | null>(null);
  const [result, setResult] = useState<AttendanceImportResult | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setParsed(null);
    setResult(null);

    if (!file) {
      return;
    }

    setIsParsing(true);
    try {
      setParsed(await parseAttendanceImportFile(file));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر قراءة ملف الاستيراد.",
      );
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  }

  async function handleImport() {
    if (!parsed) {
      return;
    }

    setError(null);
    setResult(null);
    setIsImporting(true);
    try {
      const importResult = await importAttendanceData({
        activeCohort,
        activeCourse,
        activeSchema,
        parsed,
      });
      setResult(importResult);
      await onImported();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر استيراد البيانات.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <Button
        aria-label="استيراد بيانات"
        className="h-11 w-11 px-0 sm:w-auto sm:px-4"
        onClick={() => setOpen(true)}
        title="استيراد بيانات"
      >
        <FileUp className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">استيراد</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استيراد بيانات الحضور</DialogTitle>
            <DialogDescription>
              ارفع ملف CSV أو XLSX من ملفات الحضور. سيتم ربط البيانات بالدورة الحالية.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-right">
            <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
              <span className="mb-2 block font-bold text-ink">ملف البيانات</span>
              <input
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="block w-full text-sm"
                disabled={isParsing || isImporting}
                onChange={(event) => void handleFileChange(event)}
                type="file"
              />
            </label>

            {isParsing ? (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                جاري قراءة الملف...
              </p>
            ) : null}

            {parsed ? (
              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  <span className="font-bold text-ink">الملف: </span>
                  {parsed.fileName}
                </p>
                <p>
                  <span className="font-bold text-ink">الطلاب: </span>
                  {parsed.students.length}
                </p>
                <p>
                  <span className="font-bold text-ink">المجموعات: </span>
                  {parsed.groups.length}
                </p>
                <p>
                  <span className="font-bold text-ink">جلسات الحضور: </span>
                  {parsed.sessions.length}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-bold text-ink">سجلات الحضور: </span>
                  {parsed.attendanceRecords.length}
                </p>
              </div>
            ) : null}

            {result ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                تم الاستيراد: {result.studentsCreated} طالب، {result.groupsCreated} مجموعة،{" "}
                {result.sessionsCreated} جلسة، {result.attendanceRecordsCreated} سجل حضور جديد،{" "}
                {result.attendanceRecordsUpdated} سجل محدث.
              </div>
            ) : null}

            {error ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                disabled={isImporting}
                onClick={() => setOpen(false)}
                variant="outline"
              >
                {ui.cancel}
              </Button>
              <Button disabled={!parsed || isImporting || isParsing} onClick={handleImport}>
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileUp className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isImporting ? "جاري الاستيراد..." : "استيراد البيانات"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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




