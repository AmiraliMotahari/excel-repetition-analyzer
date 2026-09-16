import * as XLSX from "xlsx"
import {
  MAX_FILE_SIZE_BYTES,
  ACCEPTED_EXTENSIONS,
} from "@/lib/validation/mapping"
import type {
  CellValue,
  SpreadsheetColumn,
  SpreadsheetRow,
} from "@/types/spreadsheet"

/** Result of parsing a workbook into the application-level representation. */
export type ParsedSheet = {
  sheetName: string
  columns: SpreadsheetColumn[]
  rows: SpreadsheetRow[]
}

export type WorkbookSummary = {
  fileName: string
  fileSize: number
  sheetNames: string[]
}

export type ParseResult =
  | { ok: true; summary: WorkbookSummary; sheets: Record<string, ParsedSheet> }
  | { ok: false; error: ParseError }

export type ParseErrorCode =
  | "unsupported-type"
  | "empty-file"
  | "too-large"
  | "corrupt-workbook"
  | "no-worksheets"
  | "empty-worksheet"
  | "no-header-row"
  | "no-data-rows"

export type ParseError = {
  code: ParseErrorCode
  message: string
}

export class SpreadsheetParseError extends Error {
  readonly code: ParseErrorCode
  constructor(code: ParseErrorCode, message: string) {
    super(message)
    this.name = "SpreadsheetParseError"
    this.code = code
  }
}

export function validateFileMeta(name: string, size: number): ParseError | null {
  if (size === 0) {
    return { code: "empty-file", message: "This file is empty." }
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      code: "too-large",
      message: `This file is larger than the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit.`,
    }
  }
  // Trust the extension, never the MIME type (plan §39).
  const lower = name.toLowerCase()
  if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return {
      code: "unsupported-type",
      message: "Unsupported file type. Only .xlsx and .xls files are accepted.",
    }
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Parse an Excel file buffer into the application-level representation.
 *
 * Boundary rules (plan §41): all SheetJS specifics stay inside this module.
 * The repetition analyzer only ever sees ParsedSheet data.
 *
 * Header handling (plan §8): MVP assumes the first non-empty row is the
 * header row. `HEADER_ROW_POLICY` centralizes this for future configurability.
 */
export function parseWorkbook(fileName: string, fileSize: number, data: ArrayBuffer): ParseResult {
  const metaError = validateFileMeta(fileName, fileSize)
  if (metaError) return { ok: false, error: metaError }

  let wb: XLSX.WorkBook
  try {
    // A real .xlsx is a ZIP archive (starts with the PK signature). SheetJS
    // degrades non-zip bytes to a CSV-ish single-cell sheet instead of
    // failing, so sniff the signature to catch mislabeled/corrupt files.
    // (.xls is a binary OLE format, not zip, so skip the sniff there.)
    const first = new Uint8Array(data, 0, Math.min(2, data.byteLength))
    const isZip = first.length === 2 && first[0] === 0x50 && first[1] === 0x4b
    const isXls = fileName.toLowerCase().endsWith(".xls")
    if (!isZip && !isXls) {
      return {
        ok: false,
        error: {
          code: "corrupt-workbook",
          message:
            "We couldn't read this spreadsheet. The file isn't a valid Excel workbook.",
        },
      }
    }
    wb = XLSX.read(data, { type: "array", cellDates: true })
  } catch {
    return {
      ok: false,
      error: {
        code: "corrupt-workbook",
        message: "We couldn't read this spreadsheet. The workbook appears to be corrupted.",
      },
    }
  }

  const sheetNames = wb.SheetNames.filter((name) => {
    const ws = wb.Sheets[name]
    return ws != null && ws["!ref"] != null && ws["!ref"] !== "A1:A1"
  })

  if (sheetNames.length === 0) {
    return {
      ok: false,
      error: { code: "no-worksheets", message: "No usable worksheets were found in this workbook." },
    }
  }

  const sheets: Record<string, ParsedSheet> = {}
  for (const name of sheetNames) {
    const parsed = parseSheet(wb, name)
    if (parsed) sheets[name] = parsed
  }

  if (Object.keys(sheets).length === 0) {
    return {
      ok: false,
      error: {
        code: "empty-worksheet",
        message: "The worksheets in this workbook contain no readable data.",
      },
    }
  }

  return {
    ok: true,
    summary: { fileName, fileSize, sheetNames },
    sheets,
  }
}

/**
 * Parse one sheet into columns + rows.
 * Returns null when the sheet has no header row or no data rows
 * (it is then excluded from the selectable sheets list).
 */
function parseSheet(wb: XLSX.WorkBook, sheetName: string): ParsedSheet | null {
  const ws = wb.Sheets[sheetName]
  if (!ws) return null

  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  })

  if (raw.length === 0) return null

  // First non-empty row is the header row (MVP policy, plan §8).
  const headerRowIdx = raw.findIndex((r) => Array.isArray(r) && r.some((c) => !isEmptyCell(c)))
  if (headerRowIdx === -1) return null

  const headerRow = raw[headerRowIdx] as unknown[]
  const width = Math.max(...raw.slice(headerRowIdx).map((r) => (Array.isArray(r) ? r.length : 0)))

  const columns: SpreadsheetColumn[] = []
  for (let c = 0; c < width; c++) {
    const header = headerRow[c]
    const name =
      header === null || header === undefined || (typeof header === "string" && header.trim() === "")
        ? columnLetter(c)
        : String(header).trim()
    columns.push({ index: c, originalName: name })
  }

  const rows: SpreadsheetRow[] = []
  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const rawRow = raw[r] as unknown[]
    if (!Array.isArray(rawRow)) continue
    if (rawRow.every((c) => isEmptyCell(c))) continue
    const values: CellValue[] = new Array(width).fill(null)
    for (let c = 0; c < Math.min(rawRow.length, width); c++) {
      values[c] = toCellValue(rawRow[c])
    }
    rows.push({ index: rows.length, values })
  }

  if (rows.length === 0) return null

  return { sheetName, columns, rows }
}

function toCellValue(v: unknown): CellValue {
  if (v === null || v === undefined) return null
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v
  if (v instanceof Date) return v
  // Errors, formula objects, and other exotic shapes degrade to string form.
  return String(v)
}

function isEmptyCell(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === "string") return v.trim() === ""
  return false
}

/** 0 -> A, 1 -> B, ... 25 -> Z, 26 -> AA (for duplicate/empty headers, plan §7). */
export function columnLetter(index: number): string {
  let n = index
  let s = ""
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** Build a display label that disambiguates duplicate headers: "Phone — Column C". */
export function columnLabel(col: SpreadsheetColumn): string {
  return `${col.originalName} — Column ${columnLetter(col.index)}`
}
