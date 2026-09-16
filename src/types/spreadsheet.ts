/**
 * Framework-independent domain model for spreadsheet analysis.
 * Nothing in this file may import React, Zustand, shadcn, or browser APIs.
 */

export type CellValue = string | number | boolean | Date | null

export type Severity = "green" | "yellow" | "red"

export type MatchingMode = "exact" | "case-insensitive"

export type SpreadsheetColumn = {
  /** Stable zero-based index within the sheet. The canonical identifier. */
  index: number
  /** Original header text, exactly as read. Used for display and export only. */
  originalName: string
}

export type SpreadsheetRow = {
  /** Zero-based index within the data rows (header excluded). */
  index: number
  values: CellValue[]
}

export type ProcessedRow = {
  index: number
  values: CellValue[]
  repetitionCount: number
  severity: Severity
}

export type ThresholdConfig = {
  yellowFrom: number
  redFrom: number
}

export type AnalysisConfig = {
  keyColumnIndex: number
  matchingMode: MatchingMode
  thresholds: ThresholdConfig
}

export type ProcessingStatistics = {
  totalRows: number
  uniqueKeys: number
  emptyKeys: number
  greenRows: number
  yellowRows: number
  redRows: number
}

export type ProcessingResult = {
  columns: SpreadsheetColumn[]
  rows: ProcessedRow[]
  statistics: ProcessingStatistics
  config: AnalysisConfig
}

export const REPETITION_COUNT_COLUMN_NAME = "Repetition Count"

/** Human-readable string for any cell value (display/search only; never used as identity). */
export function formatCellValue(value: CellValue): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10)
  }
  return String(value)
}
