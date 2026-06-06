import type { CrudRow, CrudValue } from "./dataTypes";

const STUDENT_PHONE_KEYS = [
  "phone",
  "primaryParentPhone",
  "fatherPhone",
  "motherPhone",
] as const;

function text(value: CrudValue | undefined) {
  return String(value ?? "").trim();
}

export function normalizeContactPhone(value: CrudValue | undefined) {
  const digits = text(value).replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("00963")) return `+${digits.slice(2)}`;
  if (digits.startsWith("963")) return `+${digits}`;
  if (digits.startsWith("0")) return `+963${digits.slice(1)}`;
  return `+${digits}`;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function addContact(
  contacts: Map<string, string[]>,
  phoneValue: CrudValue | undefined,
  name: string,
) {
  const phone = normalizeContactPhone(phoneValue);
  if (!phone || !name) return;

  const names = contacts.get(phone) ?? [];
  if (!names.includes(name)) names.push(name);
  contacts.set(phone, names);
}

export function buildGoogleContactsCsv(
  students: CrudRow[],
  teachers: CrudRow[],
) {
  const contacts = new Map<string, string[]>();

  students.forEach((student) => {
    const studentName = [text(student.firstName), text(student.lastName)]
      .filter(Boolean)
      .join(" ");
    const contactName = studentName ? `أهل ${studentName}` : "";

    STUDENT_PHONE_KEYS.forEach((key) => {
      addContact(contacts, student[key], contactName);
    });
  });

  teachers.forEach((teacher) => {
    const teacherName = [text(teacher.firstName), text(teacher.lastName)]
      .filter(Boolean)
      .join(" ");
    addContact(
      contacts,
      teacher.phoneNumber,
      teacherName ? `الأستاذ ${teacherName}` : "",
    );
  });

  const rows = [["Name", "Phone 1 - Type", "Phone 1 - Value"]];
  contacts.forEach((names, phone) => {
    rows.push([names.join(" / "), "Mobile", phone]);
  });

  return `\uFEFF${rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}\r\n`;
}

export function downloadGoogleContactsCsv(
  students: CrudRow[],
  teachers: CrudRow[],
  fileName: string,
) {
  const csv = buildGoogleContactsCsv(students, teachers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
