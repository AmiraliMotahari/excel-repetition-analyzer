import ExcelJS from "exceljs"
import {
  REPETITION_COUNT_COLUMN_NAME,
  type ProcessingResult,
  type Severity,
} from "@/types/spreadsheet"

/**
 * Styled XLSX exporter built on ExcelJS.
 *
 * Rationale (plan §20/§54): SheetJS CE parses XLS/XLSX well but does not
 * support writing styled cells; ExcelJS does (pattern fills). Parsing stays
 * in parser.ts (SheetJS), export lives here (ExcelJS) — deliberately separate.
 *
 * Preservation scope (plan §21): the export preserves worksheet name, row
 * order, column order, and values. It does NOT preserve macros, charts,
 * pivot tables, formulas, or conditional formatting from the source file.
 */
const SEVERITY_FILL: Record<Severity, string> = {
  // ARGB — saturated, unmistakable in any viewer.
  green: "FFA9D6B8",
  yellow: "FFFFE08A",
  red: "FFF5A9A9",
}

export function buildAnalyzedFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "").trim()
  const safe = base.replace(/[^\w\-. ]+/g, "-").replace(/\s+/g, "-") || "spreadsheet"
  return `${safe}-analyzed.xlsx`
}

export async function exportAnalyzedWorkbook(
  result: ProcessingResult,
  sheetName: string,
  originalFileName: string
): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Excel Repetition Analyzer"
  const safeSheetName = sanitizeSheetName(sheetName)
  const ws = wb.addWorksheet(safeSheetName)

  // Header row: original headers in original order + appended count column.
  const header = ws.addRow([
    ...result.columns.map((c) => c.originalName),
    REPETITION_COUNT_COLUMN_NAME,
  ])
  header.font = { bold: true }
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } }
  })

  // Data rows: original values + count, colored by severity.
  for (const row of result.rows) {
    const added = ws.addRow([...row.values, row.repetitionCount])
    const fill = SEVERITY_FILL[row.severity]
    added.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
    })
  }

  // ExcelJS has no auto-size; approximate width from content lengths.
  const widths = result.columns.map((c) => Math.max(12, c.originalName.length + 4))
  for (const row of result.rows) {
    for (let c = 0; c < row.values.length; c++) {
      widths[c] = Math.min(60, Math.max(widths[c], displayLength(row.values[c])))
    }
  }
  widths.push(Math.max(REPETITION_COUNT_COLUMN_NAME.length + 4, 10))
  for (let c = 0; c < widths.length; c++) {
    ws.getColumn(c + 1).width = widths[c]
  }

  const buffer = await wb.xlsx.writeBuffer()
  const name = buildAnalyzedFileName(originalFileName)
  // Keep a deterministic hook for tests; the Blob carries the bytes.
  void name
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

function displayLength(v: unknown): number {
  if (v === null || v === undefined) return 0
  if (v instanceof Date) return 10
  return String(v).length
}

function sanitizeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no : \ / ? * [ ]
  const cleaned = name.replace(/[:\\/?*[\]]/g, " ").trim()
  return (cleaned || "Sheet1").slice(0, 31)
}
