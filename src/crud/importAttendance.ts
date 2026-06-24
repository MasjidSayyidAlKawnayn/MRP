import {
  createRow,
  createRows,
  listRows,
  updateRow,
  type Cohort,
  type Course,
  type CrudRow,
  type CrudValue,
} from "./data";
import {
  findEntityDefinition,
  getEntityDefinitions,
  type EntityDefinition,
  type EntityKey,
  type SchemaName,
} from "./entities";

type ParsedStudent = {
  familyPhone: string;
  firstName: string;
  groupName: string;
  lastName: string;
  phone: string;
  rowKey: string;
};

type ParsedSession = {
  date: string;
  label: string;
  sequence: number;
};

type ParsedAttendanceRecord = {
  rowKey: string;
  sessionKey: string;
  status: "late" | "present";
};

export type ParsedAttendanceImport = {
  attendanceRecords: ParsedAttendanceRecord[];
  fileName: string;
  groups: string[];
  sessions: ParsedSession[];
  students: ParsedStudent[];
};

export type AttendanceImportResult = {
  attendanceRecordsCreated: number;
  attendanceRecordsUpdated: number;
  groupsCreated: number;
  sessionsCreated: number;
  studentsCreated: number;
  teachersCreated: number;
};

const attendanceStartIndex = 11;
const unassignedGroup = "Unassigned";
const emptyAttendanceValues = new Set(["", "FALSE", "False", "false"]);
const groupColors = [
  "rose",
  "sky",
  "lime",
  "indigo",
  "violet",
  "teal",
  "orange",
  "cyan",
];

const statusByCell = new Map<string, "late" | "present">([
  ["حاضر", "present"],
  ["تأخير", "late"],
  ["TRUE", "present"],
  ["True", "present"],
  ["true", "present"],
]);

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function getXmlText(element: Element) {
  return Array.from(element.getElementsByTagName("t"))
    .map((node) => node.textContent ?? "")
    .join("");
}

function getColumnIndex(cellRef: string) {
  const letters = /^[A-Z]+/i.exec(cellRef)?.[0].toUpperCase() ?? "A";
  return [...letters].reduce(
    (value, letter) => value * 26 + letter.charCodeAt(0) - 64,
    0,
  ) - 1;
}

async function parseXlsx(file: File) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const workbookXml = await zip.file("xl/workbook.xml")?.async("text");
  const workbookRelsXml = await zip
    .file("xl/_rels/workbook.xml.rels")
    ?.async("text");
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("text");

  if (!workbookXml || !workbookRelsXml) {
    throw new Error("Could not read the workbook from this XLSX file.");
  }

  const parser = new DOMParser();
  const workbook = parser.parseFromString(workbookXml, "application/xml");
  const rels = parser.parseFromString(workbookRelsXml, "application/xml");
  const firstSheet = workbook.getElementsByTagName("sheet")[0];
  const relationshipId =
    firstSheet?.getAttribute("r:id") ?? firstSheet?.getAttribute("id");
  const relationship = Array.from(rels.getElementsByTagName("Relationship")).find(
    (rel) => rel.getAttribute("Id") === relationshipId,
  );
  const target = relationship?.getAttribute("Target") ?? "worksheets/sheet1.xml";
  const sheetPath = `xl/${target.replace(/^\/?xl\//, "")}`;
  const sheetXml = await zip.file(sheetPath)?.async("text");

  if (!sheetXml) {
    throw new Error("Could not read the first sheet from this XLSX file.");
  }

  const sharedStrings = sharedStringsXml
    ? Array.from(
        parser
          .parseFromString(sharedStringsXml, "application/xml")
          .getElementsByTagName("si"),
      ).map(getXmlText)
    : [];
  const sheet = parser.parseFromString(sheetXml, "application/xml");

  return Array.from(sheet.getElementsByTagName("row")).map((rowNode) => {
    const row: string[] = [];
    Array.from(rowNode.getElementsByTagName("c")).forEach((cell) => {
      const index = getColumnIndex(cell.getAttribute("r") ?? "");
      const type = cell.getAttribute("t");
      const rawValue = cell.getElementsByTagName("v")[0]?.textContent ?? "";
      const value =
        type === "s"
          ? sharedStrings[Number(rawValue)] ?? ""
          : type === "inlineStr"
            ? getXmlText(cell)
            : rawValue;
      row[index] = value;
    });
    return row.map((value) => value ?? "");
  });
}

function excelSerialToDate(value: number) {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + value * 24 * 60 * 60 * 1000);
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

function parseSession(header: string, occurrences: Map<string, number>) {
  const normalized = String(header).trim();
  const serial = Number(normalized);

  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    const date = excelSerialToDate(serial);
    const dateString = formatDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
    const sequence = (occurrences.get(dateString) ?? 0) + 1;
    occurrences.set(dateString, sequence);
    return { date: dateString, label: dateString, sequence };
  }

  const isoLikeMatch = /^(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})(?:\s|T|$)/.exec(
    normalized,
  );
  if (isoLikeMatch?.groups) {
    const date = formatDate(
      Number(isoLikeMatch.groups.year),
      Number(isoLikeMatch.groups.month),
      Number(isoLikeMatch.groups.day),
    );
    const sequence = (occurrences.get(date) ?? 0) + 1;
    occurrences.set(date, sequence);
    return { date, label: normalized, sequence };
  }

  const shortDateMatch =
    /^(?<day>[A-Za-z]{3}) (?<dayOfMonth>\d{1,2})\/(?<month>\d{1,2})$/.exec(
      normalized,
    );

  if (!shortDateMatch?.groups) {
    throw new Error(`Could not parse attendance header: ${header}`);
  }

  const month = Number(shortDateMatch.groups.month);
  const year = month >= 6 ? 2025 : 2026;
  const date = formatDate(year, month, Number(shortDateMatch.groups.dayOfMonth));
  const sequence = (occurrences.get(date) ?? 0) + 1;
  occurrences.set(date, sequence);
  return { date, label: normalized, sequence };
}

function normalizePhone(value: string) {
  return value.trim().replace(/\s*\n\s*/g, " / ");
}

function fitPhone(value: string) {
  const normalized = normalizePhone(value);

  if (normalized.length <= 20) {
    return normalized;
  }

  return (
    normalized
      .split(/\s*(?:\/|،|,)\s*/)
      .map((part) => part.trim())
      .find((part) => part.length > 0 && part.length <= 20) ?? ""
  );
}

function normalizeNamePart(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized || fallback;
}

function sessionKey(session: ParsedSession) {
  return `${session.date}|${session.label}|${session.sequence}`;
}

function hasHeader(headers: string[], value: string) {
  return headers.some((header) => header.trim() === value);
}

function getColumnIndexes(headers: string[]) {
  if (hasHeader(headers, "رقم موبايل")) {
    return {
      firstName: 8,
      fullName: 0,
      group: 6,
      lastName: 9,
      phone: 4,
    };
  }

  return {
    firstName: 4,
    fullName: 0,
    group: 6,
    lastName: 5,
    phone: -1,
  };
}

export async function parseAttendanceImportFile(
  file: File,
): Promise<ParsedAttendanceImport> {
  const rows = file.name.toLowerCase().endsWith(".xlsx")
    ? await parseXlsx(file)
    : parseCsv(await file.text());
  const [headers, ...rawRows] = rows;

  if (!headers || headers.length <= attendanceStartIndex) {
    throw new Error("The file does not contain the expected attendance columns.");
  }

  const columns = getColumnIndexes(headers);
  const occurrences = new Map<string, number>();
  const sessions = headers
    .slice(attendanceStartIndex)
    .map((header) => parseSession(header, occurrences));
  const students: ParsedStudent[] = [];
  const attendanceRecords: ParsedAttendanceRecord[] = [];

  rawRows.forEach((row, index) => {
    const fullName = row[columns.fullName]?.trim() ?? "";
    const firstNameField = row[columns.firstName]?.trim() ?? "";
    const lastNameField = row[columns.lastName]?.trim() ?? "";
    const groupField = row[columns.group]?.trim() ?? "";

    if (!fullName && !firstNameField && !lastNameField) {
      return;
    }

    const rowKey = String(index + 2);
    students.push({
      familyPhone: "",
      firstName: normalizeNamePart(firstNameField, fullName || "Unknown"),
      groupName: groupField || unassignedGroup,
      lastName: normalizeNamePart(lastNameField, "-"),
      phone: columns.phone >= 0 ? fitPhone(row[columns.phone] ?? "") : "",
      rowKey,
    });

    sessions.forEach((session, sessionIndex) => {
      const cellValue = row[attendanceStartIndex + sessionIndex]?.trim() ?? "";
      const status = statusByCell.get(cellValue);

      if (status) {
        attendanceRecords.push({
          rowKey,
          sessionKey: sessionKey(session),
          status,
        });
        return;
      }

      if (!emptyAttendanceValues.has(cellValue)) {
        throw new Error(
          `Unknown attendance value "${cellValue}" at row ${index + 2}, column "${session.label}".`,
        );
      }
    });
  });

  const groups = Array.from(
    new Set([...students.map((student) => student.groupName), unassignedGroup]),
  ).sort((left, right) => left.localeCompare(right, "ar"));

  return {
    attendanceRecords,
    fileName: file.name,
    groups,
    sessions,
    students,
  };
}

function requireEntity(
  entityDefinitions: EntityDefinition[],
  schema: SchemaName,
  key: EntityKey,
) {
  const entity = findEntityDefinition(`${schema}.${key}`, entityDefinitions);

  if (!entity) {
    throw new Error(`Missing entity definition for ${key}.`);
  }

  return entity;
}

function rowString(row: CrudRow, key: string) {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}

function studentIdentity(student: ParsedStudent, groupId: CrudValue) {
  return [
    student.firstName,
    student.lastName,
    String(groupId ?? ""),
    student.phone,
    student.familyPhone,
  ].join("|");
}

function existingStudentIdentity(student: CrudRow) {
  return [
    rowString(student, "firstName"),
    rowString(student, "lastName"),
    rowString(student, "groupId"),
    rowString(student, "phone"),
    rowString(student, "primaryParentPhone"),
  ].join("|");
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function importAttendanceData({
  activeCohort,
  activeCourse,
  activeSchema,
  parsed,
}: {
  activeCohort?: Cohort | null;
  activeCourse: Course;
  activeSchema: SchemaName;
  parsed: ParsedAttendanceImport;
}): Promise<AttendanceImportResult> {
  const entityDefinitions = getEntityDefinitions(activeSchema);
  const teachersEntity = requireEntity(entityDefinitions, activeSchema, "teachers");
  const groupsEntity = requireEntity(entityDefinitions, activeSchema, "groups");
  const studentsEntity = requireEntity(entityDefinitions, activeSchema, "students");
  const sessionsEntity = requireEntity(
    entityDefinitions,
    activeSchema,
    "attendanceSessions",
  );
  const recordsEntity = requireEntity(
    entityDefinitions,
    activeSchema,
    "attendanceRecords",
  );
  const cohort = activeCohort ?? undefined;

  let teachers = await listRows(teachersEntity, activeCourse, cohort);
  let groups = await listRows(groupsEntity, activeCourse, cohort);
  let students = await listRows(studentsEntity, activeCourse, cohort);
  let sessions = await listRows(sessionsEntity, activeCourse, cohort);
  let records = await listRows(recordsEntity, activeCourse, cohort);
  const result: AttendanceImportResult = {
    attendanceRecordsCreated: 0,
    attendanceRecordsUpdated: 0,
    groupsCreated: 0,
    sessionsCreated: 0,
    studentsCreated: 0,
    teachersCreated: 0,
  };
  const teacherByGroup = new Map(teachers.map((row) => [rowString(row, "group"), row]));
  const groupByName = new Map(groups.map((row) => [rowString(row, "name"), row]));

  for (const [index, groupName] of parsed.groups.entries()) {
    let teacher = teacherByGroup.get(groupName);

    if (!teacher) {
      teacher =
        (await createRow(
          teachersEntity,
          {
            firstName: "Teacher",
            group: groupName,
            lastName: `- ${groupName}`,
            phoneNumber: "",
          },
          activeCourse,
          cohort,
        )) ?? undefined;
      if (teacher) {
        teachers = [...teachers, teacher];
        teacherByGroup.set(groupName, teacher);
        result.teachersCreated += 1;
      }
    }

    if (!groupByName.has(groupName)) {
      const group =
        (await createRow(
          groupsEntity,
          {
            colorCode: groupColors[index % groupColors.length],
            name: groupName,
            teacherId: teacher?.id ?? null,
          },
          activeCourse,
          cohort,
        )) ?? undefined;
      if (group) {
        groups = [...groups, group];
        groupByName.set(groupName, group);
        result.groupsCreated += 1;
      }
    }
  }

  const studentsByIdentity = new Map<string, CrudRow[]>();
  students.forEach((student) => {
    const key = existingStudentIdentity(student);
    studentsByIdentity.set(key, [...(studentsByIdentity.get(key) ?? []), student]);
  });
  const usedStudentIds = new Set<CrudValue>();
  const importedStudentByRowKey = new Map<string, CrudRow>();

  for (const student of parsed.students) {
    const group = groupByName.get(student.groupName);
    const teacher = teacherByGroup.get(student.groupName);

    if (!group) {
      throw new Error(`Could not create group "${student.groupName}".`);
    }

    const identity = studentIdentity(student, group.id);
    let row = (studentsByIdentity.get(identity) ?? []).find(
      (candidate) => !usedStudentIds.has(candidate.id),
    );

    if (!row) {
      row =
        (await createRow(
          studentsEntity,
          {
            fatherPhone: student.familyPhone,
            firstName: student.firstName,
            group: student.groupName,
            groupId: group.id,
            lastName: student.lastName,
            phone: student.phone,
            primaryParentPhone: student.familyPhone,
            teacherId: teacher?.id ?? null,
          },
          activeCourse,
          cohort,
        )) ?? undefined;
      if (row) {
        students = [...students, row];
        studentsByIdentity.set(identity, [
          ...(studentsByIdentity.get(identity) ?? []),
          row,
        ]);
        result.studentsCreated += 1;
      }
    }

    if (!row) {
      throw new Error(`Could not import student ${student.firstName} ${student.lastName}.`);
    }

    usedStudentIds.add(row.id);
    importedStudentByRowKey.set(student.rowKey, row);
  }

  const sessionByKey = new Map(
    sessions.map((row) => [
      sessionKey({
        date: rowString(row, "sessionDate").slice(0, 10),
        label: rowString(row, "label"),
        sequence: Number(row.sequenceOnDate),
      }),
      row,
    ]),
  );

  for (const session of parsed.sessions) {
    if (!sessionByKey.has(sessionKey(session))) {
      const row =
        (await createRow(
          sessionsEntity,
          {
            label: session.label,
            sequenceOnDate: session.sequence,
            sessionDate: session.date,
          },
          activeCourse,
          cohort,
        )) ?? undefined;
      if (row) {
        sessions = [...sessions, row];
        sessionByKey.set(sessionKey(session), row);
        result.sessionsCreated += 1;
      }
    }
  }

  const recordByStudentSession = new Map(
    records.map((row) => [
      `${rowString(row, "studentId")}|${rowString(row, "attendanceSessionId")}`,
      row,
    ]),
  );
  const pendingRecords: Record<string, CrudValue>[] = [];

  for (const record of parsed.attendanceRecords) {
    const student = importedStudentByRowKey.get(record.rowKey);
    const session = sessionByKey.get(record.sessionKey);

    if (!student || !session) {
      continue;
    }

    const key = `${student.id}|${session.id}`;
    const existingRecord = recordByStudentSession.get(key);

    if (existingRecord) {
      if (existingRecord.status !== record.status) {
        await updateRow(
          recordsEntity,
          Number(existingRecord.id),
          { status: record.status },
          activeCourse,
          cohort,
        );
        result.attendanceRecordsUpdated += 1;
      }
      continue;
    }

    pendingRecords.push({
      attendanceSessionId: session.id,
      status: record.status,
      studentId: student.id,
    });
  }

  for (const batch of chunk(pendingRecords, 500)) {
    const created = await createRows(recordsEntity, batch, activeCourse, cohort);
    result.attendanceRecordsCreated += created.length;
    records = [...records, ...created];
  }

  return result;
}
