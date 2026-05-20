import JSZip from "jszip";
import {
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import type { CrudRow } from "./data";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface AttendanceChartData {
  groupId: string;
  groupName: string;
  present: number;
  late: number;
  missing: number;
}

function toDateValue(value: string) {
  return Date.parse(value);
}

function normalizeDateOnly(value: string) {
  return value.slice(0, 10);
}

export function getDateRangeSessions(
  sessions: CrudRow[],
  fromDate: string,
  toDate: string,
) {
  const start = toDateValue(fromDate);
  const end = toDateValue(toDate);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  return sessions.filter((session) => {
    const raw = String(session.sessionDate ?? session.label ?? "");
    const dateValue = toDateValue(normalizeDateOnly(raw));
    return Number.isFinite(dateValue) && dateValue >= start && dateValue <= end;
  });
}

export function buildGroupAttendanceStats(
  groups: CrudRow[],
  students: CrudRow[],
  sessions: CrudRow[],
  records: CrudRow[],
): AttendanceChartData[] {
  const selectedSessionIds = new Set(sessions.map((session) => String(session.id)));
  const recordsInRange = records.filter((record) =>
    selectedSessionIds.has(String(record.attendanceSessionId)),
  );

  return groups.map((group) => {
    const groupId = String(group.id);
    const groupStudents = students.filter(
      (student) => String(student.groupId) === groupId,
    );
    const studentIds = new Set(groupStudents.map((student) => String(student.id)));
    const groupRecords = recordsInRange.filter((record) =>
      studentIds.has(String(record.studentId)),
    );

    const present = groupRecords.filter((record) => record.status === "present").length;
    const late = groupRecords.filter((record) => record.status === "late").length;
    const expected = groupStudents.length * sessions.length;
    const missing = Math.max(0, expected - (present + late));

    return {
      groupId,
      groupName: String(group.name ?? `Group-${groupId}`),
      present,
      late,
      missing,
    };
  });
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
}

export function buildGroupFileName(
  groupName: string,
  fromDate: string,
  toDate: string,
) {
  return `attendance-${sanitizeFileName(groupName)}-${fromDate}-to-${toDate}.png`;
}

export function buildZipFileName(fromDate: string, toDate: string) {
  return `attendance-groups-${fromDate}-to-${toDate}.zip`;
}

export async function renderAttendanceChartPngBlob(
  stats: AttendanceChartData,
  fromDate: string,
  toDate: string,
) {
  const width = 1200;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create chart canvas context.");
  }

  const config: ChartConfiguration<"bar", number[], string> = {
    type: "bar",
    data: {
      labels: ["Present", "Late", "Missing"],
      datasets: [
        {
          data: [stats.present, stats.late, stats.missing],
          backgroundColor: ["#10b981", "#f59e0b", "#94a3b8"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${stats.groupName} | ${fromDate} to ${toDate}`,
          color: "#0f172a",
          font: { size: 26, weight: "bold" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#334155", font: { size: 20, weight: "bold" } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#475569", precision: 0, font: { size: 16 } },
        },
      },
    },
  };

  const chart = new Chart(context, config);
  chart.update("none");
  chart.destroy();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) {
        reject(new Error("Failed to render chart PNG."));
        return;
      }
      resolve(value);
    }, "image/png");
  });

  return blob;
}

export async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image for preview."));
    reader.readAsDataURL(blob);
  });
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function copyBlobToClipboard(blob: Blob) {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy is not supported in this browser.");
  }

  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export async function buildZipBlob(files: Array<{ name: string; blob: Blob }>) {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.name, file.blob);
  });
  return await zip.generateAsync({ type: "blob" });
}
