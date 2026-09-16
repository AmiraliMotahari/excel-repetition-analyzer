import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import { parseWorkbook, columnLetter, columnLabel, validateFileMeta } from "@/lib/excel/parser"
import type { SpreadsheetColumn } from "@/types/spreadsheet"

function xlsxBufferFrom(sheetData: unknown[][], sheetName = "Sheet1"): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  // XLSX.write({type:"array"}) already returns a standalone ArrayBuffer.
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
}

describe("parseWorkbook", () => {
  it("parses headers, columns, and rows", () => {
    const buf = xlsxBufferFrom([
      ["Customer", "Phone"],
      ["Ali", "0912"],
      ["Sara", "0935"],
    ])
    const result = parseWorkbook("customers.xlsx", buf.byteLength, buf)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const sheet = result.sheets["Sheet1"]
    expect(sheet.columns.map((c) => c.originalName)).toEqual(["Customer", "Phone"])
    expect(sheet.rows).toHaveLength(2)
    expect(sheet.rows[0].values).toEqual(["Ali", "0912"])
  })

  it("skips fully-empty leading rows to find the header", () => {
    const buf = xlsxBufferFrom([[null, null], ["Name"], ["Ali"]])
    const result = parseWorkbook("x.xlsx", buf.byteLength, buf)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const sheet = result.sheets["Sheet1"]
    expect(sheet.columns[0].originalName).toBe("Name")
    expect(sheet.rows).toHaveLength(1)
  })

  it("rejects unsupported file types by extension, not MIME", () => {
    expect(validateFileMeta("data.csv", 100)?.code).toBe("unsupported-type")
    expect(validateFileMeta("data.xlsx", 100)).toBeNull()
    expect(validateFileMeta("data.xls", 100)).toBeNull()
  })

  it("rejects empty and oversized files", () => {
    expect(validateFileMeta("a.xlsx", 0)?.code).toBe("empty-file")
    expect(validateFileMeta("a.xlsx", 20 * 1024 * 1024)?.code).toBe("too-large")
  })

  it("rejects corrupt workbooks without throwing", () => {
    // Valid xlsx is a zip; garbage text is not a zip → rejected by signature sniff.
    const garbage = new TextEncoder().encode("this is not a zip")
    const ab = new ArrayBuffer(garbage.length)
    new Uint8Array(ab).set(garbage)
    const result = parseWorkbook("bad.xlsx", ab.byteLength, ab)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("corrupt-workbook")
  })

  it("reports no-worksheets for an all-zero-byte xlsx", () => {
    const buf = new ArrayBuffer(8)
    const result = parseWorkbook("empty.xlsx", 8, buf)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(["corrupt-workbook", "no-worksheets"]).toContain(result.error.code)
  })

  it("excludes sheets that have no data rows", () => {
    const buf = xlsxBufferFrom([["Only Header"]])
    const result = parseWorkbook("h.xlsx", buf.byteLength, buf)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("empty-worksheet")
  })

  it("keeps duplicate header names distinct by index", () => {
    const buf = xlsxBufferFrom([
      ["Phone", "Name", "Phone"],
      ["1", "Ali", "2"],
    ])
    const result = parseWorkbook("dup.xlsx", buf.byteLength, buf)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const sheet = result.sheets["Sheet1"]
    expect(sheet.columns.map((c) => c.originalName)).toEqual(["Phone", "Name", "Phone"])
    expect(sheet.columns.map((c) => c.index)).toEqual([0, 1, 2])
  })

  it("supports multiple worksheets", () => {
    const ws1 = XLSX.utils.aoa_to_sheet([["A"], ["x"]])
    const ws2 = XLSX.utils.aoa_to_sheet([["B"], ["y"]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, "First")
    XLSX.utils.book_append_sheet(wb, ws2, "Second")
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const result = parseWorkbook("multi.xlsx", buf.byteLength, buf)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.sheetNames).toEqual(["First", "Second"])
    expect(result.sheets["Second"].rows[0].values).toEqual(["y"])
  })

  it("defaults empty headers to column letters", () => {
    const buf = xlsxBufferFrom([["Name", null], ["Ali", 1]])
    const result = parseWorkbook("e.xlsx", buf.byteLength, buf)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const sheet = result.sheets["Sheet1"]
    expect(sheet.columns[1].originalName).toBe("B")
  })
})

describe("columnLetter / columnLabel", () => {
  it("maps indexes to spreadsheet letters", () => {
    expect(columnLetter(0)).toBe("A")
    expect(columnLetter(25)).toBe("Z")
    expect(columnLetter(26)).toBe("AA")
  })
  it("labels duplicate columns unambiguously", () => {
    const col: SpreadsheetColumn = { index: 2, originalName: "Phone" }
    expect(columnLabel(col)).toBe("Phone — Column C")
  })
})
