import type { AnalysisConfig, CellValue, ProcessedRow, ProcessingResult, SpreadsheetRow } from "@/types/spreadsheet"
import { classifySeverity } from "./classify"
import { computeStatistics } from "./statistics"
import { normalizeKeyValue } from "./normalizer"

export type { AnalysisConfig } from "@/types/spreadsheet"

/**
 * Core repetition analyzer. Pure, deterministic, framework-independent.
 *
 * Time:  O(n) over rows
 * Space: O(k) unique keys
 *
 * Empty key values are never counted as duplicates: every empty-key row
 * receives a repetition count of 0 (see plan §11). This rule is centralized
 * here so it can later become configurable.
 */
export function analyzeRows(
  rows: readonly SpreadsheetRow[],
  config: AnalysisConfig
): Omit<ProcessingResult, "columns"> {
  const counts = new Map<string, number>()

  // Pass 1: count occurrences of non-empty keys. O(n).
  for (const row of rows) {
    const key = row.values[config.keyColumnIndex]
    if (isEmptyValue(key)) continue
    const normalized = normalizeKeyValue(key, config.matchingMode)
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  // Pass 2: assign counts and severity. O(n).
  const processed: ProcessedRow[] = new Array(rows.length)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const key = row.values[config.keyColumnIndex]
    const repetitionCount = isEmptyValue(key)
      ? 0
      : (counts.get(normalizeKeyValue(key, config.matchingMode)) ?? 0)
    processed[i] = {
      index: row.index,
      values: row.values,
      repetitionCount,
      severity: classifySeverity(repetitionCount, config.thresholds),
    }
  }

  return {
    rows: processed,
    statistics: computeStatistics(processed, counts.size),
    config,
  }
}

function isEmptyValue(value: CellValue): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim() === ""
  if (value instanceof Date) return Number.isNaN(value.getTime())
  return false
}
