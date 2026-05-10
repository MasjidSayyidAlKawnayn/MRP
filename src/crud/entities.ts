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
    listFields: ["id", "firstName", "lastName", "groupId", "teacherId"],
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
      ...timestamps,
    ],
    listFields: ["id", "name", "teacherId"],
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
    table: "memorization",
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
      ...timestamps,
    ],
    listFields: ["id", "studentId", "page"],
    displayFields: ["studentId", "page"],
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
  "attendanceSessions",
  "attendanceRecords",
];

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
    id: `${schema}.${entityKeys[index]}`,
    schema,
    fields: entity.fields.map((field) => withSchemaRelationIds(field, schema)),
  }));
}

export const entityDefinitions = getEntityDefinitions("mqs");

export function findEntityDefinition(
  entityId: EntityId,
  definitions = entityDefinitions,
) {
  return definitions.find((entity) => entity.id === entityId);
}
