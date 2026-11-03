/**
 * Export utilities: CSV, Excel (SpreadsheetML 2003 XML — opens natively in Excel,
 * multiple sheets, no dependency) and JSON. PDF export uses the browser's print
 * engine with a dedicated print stylesheet (see globals.css).
 * Every export carries the SYNTHETIC DEMO DATA label.
 */
export type Row = Record<string, string | number | null | undefined>;

const DISCLAIMER = "SYNTHETIC DEMO DATA — fictional records generated for the Telecontact Intelligence prototype. Not real procurement information.";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Row[], opts: { disclaimer?: boolean } = {}): string {
  const { disclaimer = true } = opts;
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [cols.map(csvCell).join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))];
  return (disclaimer ? `# ${DISCLAIMER}\n` : "") + lines.join("\n");
}

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function toExcelXML(sheets: { name: string; rows: Row[] }[]): string {
  const sheetXml = sheets.map(({ name, rows }) => {
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const cell = (v: unknown, style?: string) => {
      if (v === null || v === undefined || v === "") return `<Cell${style ? ` ss:StyleID="${style}"` : ""}/>`;
      const isNum = typeof v === "number" && Number.isFinite(v);
      return `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${isNum ? "Number" : "String"}">${xmlEsc(String(v))}</Data></Cell>`;
    };
    return `<Worksheet ss:Name="${xmlEsc(name.slice(0, 31))}"><Table>
<Row>${cell(DISCLAIMER, "warn")}</Row>
<Row>${cols.map((c) => cell(c, "head")).join("")}</Row>
${rows.map((r) => `<Row>${cols.map((c) => cell(r[c])).join("")}</Row>`).join("\n")}
</Table></Worksheet>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="head"><Font ss:Bold="1"/><Interior ss:Color="#EEF4FB" ss:Pattern="Solid"/></Style><Style ss:ID="warn"><Font ss:Bold="1" ss:Color="#A86A06"/></Style></Styles>
${sheetXml.join("\n")}
</Workbook>`;
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { DISCLAIMER };
