import type { CellValue, MatchingMode } from "@/types/spreadsheet"

/**
 * Deterministic comparison key for a cell value.
 * Normalization is for comparison only — the original cell value is never modified.
 *
 * - numbers: compared via their exact numeric value (string form is canonical)
 * - strings: trimmed; optionally lowercased in case-insensitive mode
 * - booleans / dates: canonical string forms
 * - null/undefined/NaN: callers treat as empty before reaching here
 */
export function normalizeKeyValue(value: CellValue, mode: MatchingMode): string {
  if (typeof value === "number") {
    return `n:${value}`
  }
  if (typeof value === "boolean") {
    return `b:${value}`
  }
  if (value instanceof Date) {
    return `d:${value.getTime()}`
  }
  let s = (value ?? "").trim()
  if (mode === "case-insensitive") {
    s = s.toLowerCase()
  }
  return `s:${s}`
}
