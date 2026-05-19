export type SchemaName = string;
export type FieldType =
  | "boolean"
  | "date"
  | "datetime"
  | "number"
  | "text"
  | "textarea";

export type EntityKey =
  | "students"
  | "teachers"
  | "groups"
  | "assignments"
  | "pages"
  | "pagePointAwards"
  | "manualPointTransactions"
  | "pagePointTiers"
  | "points"
  | "attendanceSessions"
  | "attendanceRecords";
export type EntityId = `${SchemaName}.${EntityKey}`;

export interface FieldDefinition {
  key: string;
  column: string;
  label: string;
  type: FieldType;
  helpText?: string;
  max?: number;
  min?: number;
  required?: boolean;
  readOnly?: boolean;
  relation?: {
    entityId: EntityId;
    labelFields: readonly string[];
  };
}

export interface EntityDefinition {
  id: EntityId;
  schema: SchemaName;
  table: string;
  label: string;
  singularLabel: string;
  description: string;
  courseScoped?: boolean;
  showInNav?: boolean;
  fields: FieldDefinition[];
  listFields: string[];
  displayFields: string[];
}

const idField: FieldDefinition = {
  key: "id",
  column: "id",
  label: "ID",
  type: "number",
  readOnly: true,
};

const timestamps: FieldDefinition[] = [
  {
    key: "createdAt",
    column: "created_at",
    label: "Created at",
    type: "datetime",
    readOnly: true,
  },
  {
    key: "updatedAt",
    column: "updated_at",
    label: "Updated at",
    type: "datetime",
  },
  {
    key: "deletedAt",
    column: "deleted_at",
    label: "Deleted at",
    type: "datetime",
    readOnly: true,
  },
];

const studentRelation = {
  entityId: "mqs.students",
  labelFields: ["firstName", "lastName"],
} satisfies FieldDefinition["relation"];

const teacherRelation = {
  entityId: "mqs.teachers",
  labelFields: ["firstName", "lastName"],
} satisfies FieldDefinition["relation"];

const groupRelation = {
  entityId: "mqs.groups",
  labelFields: ["name"],
} satisfies FieldDefinition["relation"];

const attendanceSessionRelation = {
  entityId: "mqs.attendanceSessions",
  labelFields: ["sessionDate", "label"],
} satisfies FieldDefinition["relation"];

const memorizationPageRelation = {
  entityId: "mqs.pages",
  labelFields: ["page"],
} satisfies FieldDefinition["relation"];

const baseEntityDefinitions: Omit<EntityDefinition, "id" | "schema">[] = [
  {
    table: "students",
    label: "Students",
    singularLabel: "Student",
    description:
      "Manage student profiles and assign each student to one group.",
    fields: [
      idField,
      {
        key: "firstName",
        column: "first_name",
        label: "First name",
        type: "text",
        required: true,
      },
      {
        key: "lastName",
        column: "last_name",
        label: "Last name",
        type: "text",
        required: true,
      },
      {
        key: "birthYear",
        column: "birth_year",
        label: "Birth year",
        type: "number",
        min: 1900,
      },
      { key: "phone", column: "phone", label: "Phone", type: "text" },
      {
        key: "fatherPhone",
        column: "father_phone",
        label: "Father phone",
        type: "text",
      },
      {
        key: "motherPhone",
        column: "mother_phone",
        label: "Mother phone",
        type: "text",
      },
      {
        key: "group",
        column: "group",
        label: "Group name",
        type: "text",
      },
      {
        key: "groupId",
        column: "group_id",
        label: "Group",
        type: "number",
        required: true,
        relation: groupRelation,
      },
      {
        key: "teacherId",
        column: "teacher_id",
        label: "Teacher",
        type: "number",
        relation: teacherRelation,
      },
      ...timestamps,
    ],
    listFields: ["firstName", "lastName", "groupId"],
    displayFields: ["firstName", "lastName"],
  },
  {
    table: "teacher",
    label: "Teachers",
    singularLabel: "Teacher",
    description: "Manage teachers and the group each teacher teaches.",
    fields: [
      idField,
      {
        key: "firstName",
        column: "first_name",
        label: "First name",
        type: "text",
        required: true,
      },
      {
        key: "lastName",
        column: "last_name",
        label: "Last name",
        type: "text",
        required: true,
      },
      {
        key: "phoneNumber",
        column: "phone_number",
        label: "Phone number",
        type: "text",
      },
      {
        key: "group",
        column: "group",
        label: "Group taught",
        type: "text",
        required: true,
        helpText: "One teacher teaches one group.",
      },
      ...timestamps,
    ],
    listFields: ["id", "firstName", "lastName", "group", "phoneNumber"],
    displayFields: ["firstName", "lastName"],
  },
  {
    table: "groups",
    label: "Groups",
    singularLabel: "Group",
    description: "Create groups and connect each group to its teacher.",
    fields: [
      idField,
      {
        key: "name",
        column: "name",
        label: "Name",
        type: "text",
        required: true,
      },
      {
        key: "teacherId",
        column: "teacher_id",
        label: "Teacher",
        type: "number",
        required: true,
        relation: teacherRelation,
      },
      {
        key: "colorCode",
        column: "color_code",
        label: "Color",
        type: "text",
        required: true,
        helpText: "Use #light,#dark, for example #fecdd3,#be123c.",
      },
      ...timestamps,
    ],
    listFields: ["id", "name", "teacherId", "colorCode"],
    displayFields: ["name"],
  },
  {
    table: "homework_assignments",
    label: "Assignments",
    singularLabel: "Assignment",
    description: "Create, update, and track assignments for students.",
    fields: [
      idField,
      {
        key: "studentId",
        column: "student_id",
        label: "Student",
        type: "number",
        required: true,
        relation: studentRelation,
      },
      {
        key: "assignedByUserId",
        column: "assigned_by_user_id",
        label: "Assigned by",
        type: "number",
        required: true,
        helpText: "Existing schema stores assignment owners as user IDs.",
      },
      {
        key: "name",
        column: "name",
        label: "Title",
        type: "text",
        required: true,
      },
      {
        key: "description",
        column: "description",
        label: "Description",
        type: "textarea",
        required: true,
      },
      {
        key: "dueDate",
        column: "due_date",
        label: "Due date",
        type: "datetime",
        required: true,
      },
      {
        key: "reminderSent",
        column: "reminder_sent",
        label: "Reminder sent",
        type: "boolean",
        required: true,
      },
      ...timestamps,
    ],
    listFields: ["id", "name", "studentId", "dueDate", "reminderSent"],
    displayFields: ["name"],
  },
  {
    table: "memorization_pages",
    label: "Memorized Pages",
    singularLabel: "Memorized Page",
    description: "Record the pages each student has memorized.",
    fields: [
      idField,
      {
        key: "studentId",
        column: "student_id",
        label: "Student",
        type: "number",
        required: true,
        relation: studentRelation,
      },
      {
        key: "page",
        column: "page",
        label: "Page",
        type: "number",
        min: 1,
        max: 604,
        required: true,
        helpText: "Quran page number from 1 to 604.",
      },
      {
        key: "memorizedOn",
        column: "memorized_on",
        label: "Memorized on",
        type: "date",
        required: true,
      },
      ...timestamps,
    ],
    listFields: ["id", "studentId", "page", "memorizedOn"],
    displayFields: ["studentId", "page"],
  },
  {
    table: "page_point_awards",
    label: "Page Point Awards",
    singularLabel: "Page Point Award",
    description: "Stored point awards generated from memorized page entries.",
    showInNav: false,
    fields: [
      idField,
      {
        key: "memorizationPageId",
        column: "memorization_page_id",
        label: "Memorized page",
        type: "number",
        required: true,
        relation: memorizationPageRelation,
      },
      {
        key: "studentId",
        column: "student_id",
        label: "Student",
        type: "number",
        required: true,
        relation: studentRelation,
      },
      {
        key: "ruleName",
        column: "rule_name",
        label: "Rule name",
        type: "text",
        required: true,
      },
      {
        key: "snapshot",
        column: "snapshot",
        label: "Snapshot",
        type: "text",
        required: true,
      },
      {
        key: "points",
        column: "points",
        label: "Points",
        type: "number",
        required: true,
      },
      ...timestamps,
    ],
    listFields: ["id", "studentId", "memorizationPageId", "points"],
    displayFields: ["ruleName", "points"],
  },
  {
    table: "manual_point_transactions",
    label: "Manual Point Transactions",
    singularLabel: "Manual Point Transaction",
    description: "Manual rewards and penalties with required reasons.",
    showInNav: false,
    fields: [
      idField,
      {
        key: "studentId",
        column: "student_id",
        label: "Student",
        type: "number",
        required: true,
        relation: studentRelation,
      },
      {
        key: "transactionDate",
        column: "transaction_date",
        label: "Date",
        type: "date",
        required: true,
      },
      {
        key: "amount",
        column: "amount",
        label: "Amount",
        type: "number",
        required: true,
      },
      {
        key: "reason",
        column: "reason",
        label: "Reason",
        type: "textarea",
        required: true,
      },
      ...timestamps,
    ],
    listFields: ["id", "studentId", "transactionDate", "amount", "reason"],
    displayFields: ["studentId", "amount"],
  },
  {
    table: "page_point_tiers",
    label: "Page Point Tiers",
    singularLabel: "Page Point Tier",
    description: "Configure daily memorized-page point totals.",
    showInNav: false,
    fields: [
      idField,
      {
        key: "minPages",
        column: "min_pages",
        label: "Minimum pages",
        type: "number",
        min: 1,
        required: true,
      },
      {
        key: "maxPages",
        column: "max_pages",
        label: "Maximum pages",
        type: "number",
      },
      {
        key: "points",
        column: "points",
        label: "Points",
        type: "number",
        required: true,
      },
      {
        key: "name",
        column: "name",
        label: "Name",
        type: "text",
        required: true,
      },
      ...timestamps,
    ],
    listFields: ["id", "minPages", "maxPages", "points", "name"],
    displayFields: ["name", "points"],
  },
  {
    table: "students",
    label: "Points",
    singularLabel: "Points",
    description: "Compare student memorization progress and total points.",
    fields: [idField],
    listFields: ["id"],
    displayFields: ["id"],
  },
  {
    table: "attendance_sessions",
    label: "Attendance Sessions",
    singularLabel: "Attendance Session",
    description: "Manage attendance dates imported from CSV sheets.",
    fields: [
      idField,
      {
        key: "sessionDate",
        column: "session_date",
        label: "Session date",
        type: "date",
        required: true,
      },
      {
        key: "label",
        column: "label",
        label: "CSV label",
        type: "text",
        required: true,
      },
      {
        key: "sequenceOnDate",
        column: "sequence_on_date",
        label: "Sequence on date",
        type: "number",
        min: 1,
        required: true,
        helpText:
          "Used when the CSV has more than one attendance column for the same date.",
      },
      ...timestamps,
    ],
    listFields: ["id", "sessionDate", "label", "sequenceOnDate"],
    displayFields: ["sessionDate", "label"],
  },
  {
    table: "attendance_records",
    label: "Attendance Records",
    singularLabel: "Attendance Record",
    description:
      "View and update each student's attendance status for a session.",
    fields: [
      idField,
      {
        key: "studentId",
        column: "student_id",
        label: "Student",
        type: "number",
        required: true,
        relation: studentRelation,
      },
      {
        key: "attendanceSessionId",
        column: "attendance_session_id",
        label: "Attendance session",
        type: "number",
        required: true,
        relation: attendanceSessionRelation,
      },
      {
        key: "status",
        column: "status",
        label: "Status",
        type: "text",
        required: true,
        helpText: "Use present or late.",
      },
      ...timestamps,
    ],
    listFields: ["id", "studentId", "attendanceSessionId", "status"],
    displayFields: ["studentId", "attendanceSessionId", "status"],
  },
] satisfies Omit<EntityDefinition, "id" | "schema">[];

const entityKeys: EntityKey[] = [
  "students",
  "teachers",
  "groups",
  "assignments",
  "pages",
  "pagePointAwards",
  "manualPointTransactions",
  "pagePointTiers",
  "points",
  "attendanceSessions",
  "attendanceRecords",
];

const courseIdField: FieldDefinition = {
  key: "courseId",
  column: "course_id",
  label: "Course",
  type: "number",
  readOnly: true,
  required: true,
};

const arabicEntities: Record<
  EntityKey,
  Pick<EntityDefinition, "description" | "label" | "singularLabel">
> = {
  students: {
    label: "\u0627\u0644\u0637\u0644\u0627\u0628",
    singularLabel: "\u0637\u0627\u0644\u0628",
    description:
      "\u0625\u062F\u0627\u0631\u0629 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0631\u0628\u0637\u0647\u0645 \u0628\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A.",
  },
  teachers: {
    label: "\u0627\u0644\u0645\u0639\u0644\u0645\u0648\u0646",
    singularLabel: "\u0645\u0639\u0644\u0645",
    description:
      "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646 \u0648\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u062A\u064A \u064A\u0634\u0631\u0641\u0648\u0646 \u0639\u0644\u064A\u0647\u0627.",
  },
  groups: {
    label: "\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A",
    singularLabel: "\u0645\u062C\u0645\u0648\u0639\u0629",
    description:
      "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0648\u0631\u0628\u0637 \u0643\u0644 \u0645\u062C\u0645\u0648\u0639\u0629 \u0628\u0645\u0639\u0644\u0645\u0647\u0627.",
  },
  assignments: {
    label: "\u0627\u0644\u0648\u0627\u062C\u0628\u0627\u062A",
    singularLabel: "\u0648\u0627\u062C\u0628",
    description:
      "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0648\u0627\u062C\u0628\u0627\u062A \u0648\u0645\u062A\u0627\u0628\u0639\u062A\u0647\u0627 \u0644\u0644\u0637\u0644\u0627\u0628.",
  },
  pages: {
    label: "\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062D\u0641\u0638",
    singularLabel: "\u0635\u0641\u062D\u0629 \u062D\u0641\u0638",
    description:
      "\u062A\u0633\u062C\u064A\u0644 \u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u062A\u064A \u0623\u062A\u0645 \u0627\u0644\u0637\u0627\u0644\u0628 \u062D\u0641\u0638\u0647\u0627.",
  },
  pagePointAwards: {
    label: "\u0646\u0642\u0627\u0637 \u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062D\u0641\u0638",
    singularLabel: "\u0646\u0642\u0627\u0637 \u0635\u0641\u062D\u0629",
    description:
      "\u0633\u062C\u0644 \u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0645\u0648\u0644\u062F\u0629 \u0645\u0646 \u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062D\u0641\u0638.",
  },
  manualPointTransactions: {
    label: "\u0645\u0643\u0627\u0641\u0622\u062A \u0648\u062E\u0635\u0648\u0645\u0627\u062A",
    singularLabel: "\u062D\u0631\u0643\u0629 \u0646\u0642\u0627\u0637",
    description:
      "\u0625\u0636\u0627\u0641\u0629 \u0645\u0643\u0627\u0641\u0622\u062A \u0623\u0648 \u062E\u0635\u0648\u0645\u0627\u062A \u064A\u062F\u0648\u064A\u0629 \u0645\u0639 \u0633\u0628\u0628.",
  },
  pagePointTiers: {
    label: "\u0634\u0631\u0627\u0626\u062D \u0646\u0642\u0627\u0637 \u0627\u0644\u0635\u0641\u062D\u0627\u062A",
    singularLabel: "\u0634\u0631\u064A\u062D\u0629 \u0646\u0642\u0627\u0637",
    description:
      "\u062A\u062D\u062F\u064A\u062F \u0646\u0642\u0627\u0637 \u0627\u0644\u062D\u0641\u0638 \u062D\u0633\u0628 \u0639\u062F\u062F \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0641\u064A \u0627\u0644\u064A\u0648\u0645.",
  },
  points: {
    label: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0646\u0642\u0627\u0637",
    singularLabel: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0646\u0642\u0627\u0637",
    description:
      "\u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0637\u0644\u0627\u0628 \u062D\u0633\u0628 \u0627\u0644\u0646\u0642\u0627\u0637 \u0648\u0635\u0641\u062D\u0627\u062A \u0627\u0644\u062D\u0641\u0638.",
  },
  attendanceSessions: {
    label: "\u062C\u0644\u0633\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631",
    singularLabel: "\u062C\u0644\u0633\u0629 \u062D\u0636\u0648\u0631",
    description:
      "\u0625\u062F\u0627\u0631\u0629 \u062A\u0648\u0627\u0631\u064A\u062E \u0627\u0644\u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0633\u062A\u0648\u0631\u062F\u0629 \u0645\u0646 \u0627\u0644\u062C\u062F\u0627\u0648\u0644.",
  },
  attendanceRecords: {
    label: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631",
    singularLabel: "\u0633\u062C\u0644 \u062D\u0636\u0648\u0631",
    description:
      "\u0639\u0631\u0636 \u0648\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u062D\u0636\u0648\u0631 \u0627\u0644\u0637\u0644\u0627\u0628 \u0641\u064A \u0643\u0644 \u062C\u0644\u0633\u0629.",
  },
};

const arabicFieldLabels: Record<string, string> = {
  assignedByUserId:
    "\u062A\u0645 \u0627\u0644\u0625\u0633\u0646\u0627\u062F \u0628\u0648\u0627\u0633\u0637\u0629",
  attendanceSessionId:
    "\u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0636\u0648\u0631",
  birthYear: "\u0633\u0646\u0629 \u0627\u0644\u0645\u064A\u0644\u0627\u062F",
  createdAt: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
  deletedAt: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062D\u0630\u0641",
  description: "\u0627\u0644\u0648\u0635\u0641",
  dueDate: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u0644\u064A\u0645",
  fatherPhone: "\u0647\u0627\u062A\u0641 \u0627\u0644\u0623\u0628",
  firstName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644",
  group: "\u0627\u0633\u0645 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629",
  groupId: "\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629",
  colorCode: "\u0644\u0648\u0646 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629",
  id: "\u0627\u0644\u0645\u0639\u0631\u0641",
  label: "\u0639\u0646\u0648\u0627\u0646 CSV",
  lastName: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629",
  motherPhone: "\u0647\u0627\u062A\u0641 \u0627\u0644\u0623\u0645",
  name: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
  page: "\u0627\u0644\u0635\u0641\u062D\u0629",
  memorizedOn: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062D\u0641\u0638",
  memorizationPageId: "\u0635\u0641\u062D\u0629 \u0627\u0644\u062D\u0641\u0638",
  ruleName: "\u0627\u0633\u0645 \u0627\u0644\u0642\u0627\u0639\u062F\u0629",
  snapshot: "\u0644\u0642\u0637\u0629 \u0627\u0644\u0642\u0627\u0639\u062F\u0629",
  points: "\u0627\u0644\u0646\u0642\u0627\u0637",
  transactionDate: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062D\u0631\u0643\u0629",
  amount: "\u0627\u0644\u0645\u0642\u062F\u0627\u0631",
  reason: "\u0627\u0644\u0633\u0628\u0628",
  minPages: "\u0623\u0642\u0644 \u0639\u062F\u062F \u0635\u0641\u062D\u0627\u062A",
  maxPages: "\u0623\u0643\u0628\u0631 \u0639\u062F\u062F \u0635\u0641\u062D\u0627\u062A",
  phone: "\u0627\u0644\u0647\u0627\u062A\u0641",
  phoneNumber: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
  reminderSent:
    "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0630\u0643\u064A\u0631",
  sequenceOnDate:
    "\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0641\u064A \u0627\u0644\u064A\u0648\u0645",
  sessionDate: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062C\u0644\u0633\u0629",
  status: "\u0627\u0644\u062D\u0627\u0644\u0629",
  studentId: "\u0627\u0644\u0637\u0627\u0644\u0628",
  teacherId: "\u0627\u0644\u0645\u0639\u0644\u0645",
  updatedAt: "\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B",
};

const arabicHelpText: Record<string, string> = {
  assignedByUserId:
    "\u0627\u0644\u0645\u062E\u0637\u0637 \u0627\u0644\u062D\u0627\u0644\u064A \u064A\u062E\u0632\u0646 \u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0648\u0627\u062C\u0628\u0627\u062A \u0643\u0645\u0639\u0631\u0641\u0627\u062A \u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646.",
  group:
    "\u0643\u0644 \u0645\u0639\u0644\u0645 \u064A\u0634\u0631\u0641 \u0639\u0644\u0649 \u0645\u062C\u0645\u0648\u0639\u0629 \u0648\u0627\u062D\u062F\u0629.",
  page: "\u0631\u0642\u0645 \u0635\u0641\u062D\u0629 \u0627\u0644\u0642\u0631\u0622\u0646 \u0645\u0646 1 \u0625\u0644\u0649 604.",
  sequenceOnDate:
    "\u064A\u0633\u062A\u062E\u062F\u0645 \u0639\u0646\u062F \u0648\u062C\u0648\u062F \u0623\u0643\u062B\u0631 \u0645\u0646 \u0639\u0645\u0648\u062F \u062D\u0636\u0648\u0631 \u0641\u064A \u0627\u0644\u064A\u0648\u0645 \u0646\u0641\u0633\u0647.",
  status: "\u0627\u0633\u062A\u062E\u062F\u0645 \u062D\u0627\u0636\u0631 \u0623\u0648 \u0645\u062A\u0623\u062E\u0631.",
};

function withSchemaRelationIds(field: FieldDefinition, schema: SchemaName) {
  if (!field.relation) {
    return field;
  }

  const [, entityKey] = field.relation.entityId.split(".");

  return {
    ...field,
    relation: {
      ...field.relation,
      entityId: `${schema}.${entityKey}` as EntityId,
    },
  };
}

export function getEntityDefinitions(schema: SchemaName): EntityDefinition[] {
  return baseEntityDefinitions.map((entity, index) => ({
    ...entity,
    ...arabicEntities[entityKeys[index]],
    id: `${schema}.${entityKeys[index]}`,
    schema,
    courseScoped: true,
    fields: entity.fields.map((field) =>
      withSchemaRelationIds(
        {
          ...field,
          label: arabicFieldLabels[field.key] ?? field.label,
          helpText: field.helpText
            ? (arabicHelpText[field.key] ?? field.helpText)
            : undefined,
        },
        schema,
      ),
    ).some((field) => field.key === "courseId")
      ? entity.fields.map((field) =>
          withSchemaRelationIds(
            {
              ...field,
              label: arabicFieldLabels[field.key] ?? field.label,
              helpText: field.helpText
                ? (arabicHelpText[field.key] ?? field.helpText)
                : undefined,
            },
            schema,
          ),
        )
      : [
          courseIdField,
          ...entity.fields.map((field) =>
            withSchemaRelationIds(
              {
                ...field,
                label: arabicFieldLabels[field.key] ?? field.label,
                helpText: field.helpText
                  ? (arabicHelpText[field.key] ?? field.helpText)
                  : undefined,
              },
              schema,
            ),
          ),
        ],
  }));
}

export const entityDefinitions = getEntityDefinitions("mqs");

export function findEntityDefinition(
  entityId: EntityId,
  definitions = entityDefinitions,
) {
  return definitions.find((entity) => entity.id === entityId);
}
