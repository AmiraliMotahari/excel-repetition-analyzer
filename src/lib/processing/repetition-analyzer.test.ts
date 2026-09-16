import { describe, expect, it } from "vitest"
import { analyzeRows } from "@/lib/processing/repetition-analyzer"
import { classifySeverity } from "@/lib/processing/classify"
import { normalizeKeyValue } from "@/lib/processing/normalizer"
import { thresholdSchema } from "@/lib/validation/thresholds"
import type { CellValue, SpreadsheetRow } from "@/types/spreadsheet"

function rows(...keyValues: CellValue[]): SpreadsheetRow[] {
  return keyValues.map((value, index) => ({ index, values: [value] }))
}

const CONFIG = {
  keyColumnIndex: 0,
  matchingMode: "exact",
  thresholds: { yellowFrom: 3, redFrom: 5 },
} as const

describe("repetition analyzer", () => {
  it("counts basic duplication", () => {
    const result = analyzeRows(rows("A", "B", "A", "A"), CONFIG)
    expect(result.rows.map((r) => r.repetitionCount)).toEqual([3, 1, 3, 3])
  })

  it("returns 1 for every row when there are no duplicates", () => {
    const result = analyzeRows(rows("A", "B", "C"), CONFIG)
    expect(result.rows.map((r) => r.repetitionCount)).toEqual([1, 1, 1])
  })

  it("gives empty keys a count of 0 and never groups them", () => {
    const result = analyzeRows(rows("A", null, "   ", "A"), CONFIG)
    expect(result.rows.map((r) => r.repetitionCount)).toEqual([2, 0, 0, 2])
    // Empty keys excluded from unique count.
    expect(result.statistics.uniqueKeys).toBe(1)
  })

  it("treats whitespace-only and null keys the same: count 0", () => {
    const result = analyzeRows(rows("", "  ", null, "X"), CONFIG)
    expect(result.rows.map((r) => r.repetitionCount)).toEqual([0, 0, 0, 1])
  })

  it("classifies counts by threshold", () => {
    const thresholds = { yellowFrom: 3, redFrom: 5 }
    expect([1, 2, 3, 4, 5, 6].map((c) => classifySeverity(c, thresholds))).toEqual([
      "green",
      "green",
      "yellow",
      "yellow",
      "red",
      "red",
    ])
  })

  it("trims whitespace for comparison but preserves original values", () => {
    const result = analyzeRows(rows("Ali", " Ali "), CONFIG)
    expect(result.rows.map((r) => r.repetitionCount)).toEqual([2, 2])
    // Original cell values are untouched.
    expect(result.rows[1].values[0]).toBe(" Ali ")
  })

  it("groups case variants only in case-insensitive mode", () => {
    const data = rows("ALI", "Ali", "ali")
    const exact = analyzeRows(data, { ...CONFIG, matchingMode: "exact" })
    const ci = analyzeRows(data, { ...CONFIG, matchingMode: "case-insensitive" })
    expect(exact.rows.map((r) => r.repetitionCount)).toEqual([1, 1, 1])
    expect(ci.rows.map((r) => r.repetitionCount)).toEqual([3, 3, 3])
  })

  it("compares numbers by value, not string form", () => {
    const result = analyzeRows(rows(1, 1, 2), CONFIG)
    expect(result.rows.map((r) => r.repetitionCount)).toEqual([2, 2, 1])
  })

  it("handles booleans and dates deterministically", () => {
    const d1 = new Date("2024-01-01T00:00:00Z")
    const d2 = new Date("2024-01-01T00:00:00Z")
    const result = analyzeRows(rows(true, true, false, d1, d2), CONFIG)
    expect(result.rows.map((r) => r.repetitionCount)).toEqual([2, 2, 1, 2, 2])
  })

  it("uses column index, not header name (duplicate headers safe)", () => {
    const data: SpreadsheetRow[] = [
      { index: 0, values: ["X", "Y"] },
      { index: 1, values: ["Y", "Y"] },
      { index: 2, values: ["X", "Z"] },
    ]
    const byCol0 = analyzeRows(data, { ...CONFIG, keyColumnIndex: 0 })
    const byCol1 = analyzeRows(data, { ...CONFIG, keyColumnIndex: 1 })
    // Column 0: X, Y, X → 2, 1, 2. Column 1: Y, Y, Z → 2, 2, 1.
    expect(byCol0.rows.map((r) => r.repetitionCount)).toEqual([2, 1, 2])
    expect(byCol1.rows.map((r) => r.repetitionCount)).toEqual([2, 2, 1])
  })

  it("computes correct statistics", () => {
    // A x4 → count 4 (yellow), B x2 → count 2 (green), empty x2 → count 0 (green)
    const result = analyzeRows(rows("A", "A", "B", null, "A", "B", "A", " "), CONFIG)
    expect(result.statistics).toEqual({
      totalRows: 8,
      uniqueKeys: 2,
      emptyKeys: 2,
      greenRows: 4,
      yellowRows: 4,
      redRows: 0,
    })
  })

  it("is deterministic: same input produces the same result", () => {
    const data = rows("A", "B", "A", null, "B")
    expect(analyzeRows(data, CONFIG)).toEqual(analyzeRows(data, CONFIG))
  })

  it("handles a large dataset efficiently", () => {
    const N = 100_000
    const data: SpreadsheetRow[] = []
    for (let i = 0; i < N; i++) {
      data.push({ index: i, values: [`key-${i % 5000}`] })
    }
    const start = performance.now()
    const result = analyzeRows(data, CONFIG)
    const elapsed = performance.now() - start
    expect(result.rows).toHaveLength(N)
    expect(result.statistics.uniqueKeys).toBe(5000)
    expect(result.rows[N - 1].repetitionCount).toBe(N / 5000)
    // O(n) should stay far below quadratic blowup.
    expect(elapsed).toBeLessThan(2000)
  })
})

describe("threshold schema", () => {
  it("rejects yellowFrom below 1", () => {
    expect(thresholdSchema.safeParse({ yellowFrom: 0, redFrom: 5 }).success).toBe(false)
  })
  it("rejects redFrom <= yellowFrom", () => {
    expect(thresholdSchema.safeParse({ yellowFrom: 3, redFrom: 3 }).success).toBe(false)
    expect(thresholdSchema.safeParse({ yellowFrom: 3, redFrom: 2 }).success).toBe(false)
  })
  it("rejects non-integers", () => {
    expect(thresholdSchema.safeParse({ yellowFrom: 1.5, redFrom: 3 }).success).toBe(false)
  })
  it("accepts valid thresholds", () => {
    expect(thresholdSchema.safeParse({ yellowFrom: 1, redFrom: 2 }).success).toBe(true)
    expect(thresholdSchema.safeParse({ yellowFrom: 3, redFrom: 5 }).success).toBe(true)
  })
})

describe("normalizeKeyValue", () => {
  it("produces distinct keys per primitive type", () => {
    expect(normalizeKeyValue("1", "exact")).not.toBe(normalizeKeyValue(1, "exact"))
    expect(normalizeKeyValue("true", "exact")).not.toBe(normalizeKeyValue(true, "exact"))
  })
  it("does not lowercase in exact mode", () => {
    expect(normalizeKeyValue("Ali", "exact")).not.toBe(normalizeKeyValue("ali", "exact"))
  })
  it("lowercases in case-insensitive mode", () => {
    expect(normalizeKeyValue("Ali", "case-insensitive")).toBe(normalizeKeyValue("aLI", "case-insensitive"))
  })
})
