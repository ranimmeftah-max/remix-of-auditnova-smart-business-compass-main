import * as XLSX from "xlsx";

export type AttachedFile = {
  id: string;
  file: File;
  kind: "image" | "pdf" | "spreadsheet";
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const PDF_TYPES = ["application/pdf"];
const SPREADSHEET_EXTS = [".xlsx", ".xls", ".csv", ".ods"];
const SPREADSHEET_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.oasis.opendocument.spreadsheet",
];

export const ACCEPT_ATTR =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,.xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export function classifyFile(file: File): AttachedFile["kind"] | null {
  const name = file.name.toLowerCase();
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (PDF_TYPES.includes(file.type) || name.endsWith(".pdf")) return "pdf";
  if (
    SPREADSHEET_MIMES.includes(file.type) ||
    SPREADSHEET_EXTS.some((ext) => name.endsWith(ext))
  ) {
    return "spreadsheet";
  }
  return null;
}

export async function parseSpreadsheetToText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim();
    if (!csv) continue;
    parts.push(`### ورقة: ${sheetName}\n\`\`\`csv\n${csv.slice(0, 8000)}\n\`\`\``);
  }
  return parts.join("\n\n") || "(الملف فارغ)";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
