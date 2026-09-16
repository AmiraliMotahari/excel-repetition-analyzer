import { describe, expect, it } from "vitest"
import ExcelJS from "exceljs"
import { exportAnalyzedWorkbook, buildAnalyzedFileName } from "@/lib/excel/exporter"
import type { ProcessingResult } from "@/types/spreadsheet"

function makeResult(): ProcessingResult {
  return {
    columns: [
      { index: 0, originalName: "Customer" },
      { index: 1, originalName: "Phone" },
    ],
    rows: [
      { index: 0, values: ["Ali", "09120000000"], repetitionCount: 3, severity: "yellow" },
      { index: 1, values: ["Sara", "09123333333"], repetitionCount: 1, severity: "green" },
      { index: 2, values: ["Mina", "09120000000"], repetitionCount: 6, severity: "red" },
    ],
    statistics: {
      totalRows: 3,
      uniqueKeys: 2,
      emptyKeys: 0,
      greenRows: 1,
      yellowRows: 1,
      redRows: 1,
    },
    config: {
      keyColumnIndex: 1,
      matchingMode: "exact",
      thresholds: { yellowFrom: 3, redFrom: 5 },
    },
  }
}

describe("exportAnalyzedWorkbook", () => {
  it("writes original values, order, and the appended count column", async () => {
    const blob = await exportAnalyzedWorkbook(makeResult(), "Customers", "customers.xlsx")
    const wb = new ExcelJS.Workbook()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    await wb.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof wb.xlsx.load>[0])
    const ws = wb.getWorksheet("Customers")
    expect(ws).toBeDefined()
    if (!ws) return

    expect(ws.rowCount).toBe(4) // header + 3 rows
    expect(ws.getRow(1).getCell(1).value).toBe("Customer")
    expect(ws.getRow(1).getCell(2).value).toBe("Phone")
    expect(ws.getRow(1).getCell(3).value).toBe("Repetition Count")
    expect(ws.getRow(2).getCell(1).value).toBe("Ali")
    expect(ws.getRow(2).getCell(3).value).toBe(3)
    expect(ws.getRow(4).getCell(3).value).toBe(6)
  })

  it("colors rows by severity and bolds the header", async () => {
    const blob = await exportAnalyzedWorkbook(makeResult(), "Customers", "customers.xlsx")
    const wb = new ExcelJS.Workbook()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    await wb.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof wb.xlsx.load>[0])
    const ws = wb.getWorksheet("Customers")
    if (!ws) return

    const header = ws.getRow(1)
    expect(header.getCell(1).font?.bold).toBe(true)

    const yellow = ws.getRow(2).getCell(1).fill
    const green = ws.getRow(3).getCell(1).fill
    const red = ws.getRow(4).getCell(1).fill
    expect(yellow).toMatchObject({ type: "pattern", pattern: "solid" })
    expect(green).toMatchObject({ type: "pattern", pattern: "solid" })
    expect(red).toMatchObject({ type: "pattern", pattern: "solid" })
    // Distinct colors per severity.
    const argb = (f: ExcelJS.Fill) => (f as ExcelJS.FillPattern).fgColor?.argb
    expect(argb(yellow)).not.toBe(argb(green))
    expect(argb(red)).not.toBe(argb(green))
    expect(argb(yellow)).not.toBe(argb(red))
  })

  it("preserves the original worksheet name and row order", async () => {
    const blob = await exportAnalyzedWorkbook(makeResult(), "My Sheet", "f.xlsx")
    const wb = new ExcelJS.Workbook()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    await wb.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof wb.xlsx.load>[0])
    const ws = wb.getWorksheet("My Sheet")
    expect(ws).toBeDefined()
    if (!ws) return
    const names = [1, 2, 3, 4].map((r) => ws.getRow(r).getCell(1).value)
    expect(names).toEqual(["Customer", "Ali", "Sara", "Mina"])
  })

  it("sanitizes illegal sheet-name characters", async () => {
    const blob = await exportAnalyzedWorkbook(makeResult(), "Bad:Name*?", "f.xlsx")
    const wb = new ExcelJS.Workbook()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    await wb.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof wb.xlsx.load>[0])
    expect(wb.worksheets).toHaveLength(1)
    expect(wb.worksheets[0].name).not.toMatch(/[:\\/?*[\]]/)
  })
})

describe("buildAnalyzedFileName", () => {
  it("appends -analyzed and keeps the extension", () => {
    expect(buildAnalyzedFileName("customers.xlsx")).toBe("customers-analyzed.xlsx")
    expect(buildAnalyzedFileName("sales report.xls")).toBe("sales-report-analyzed.xlsx")
  })
  it("sanitizes unsafe characters", () => {
    expect(buildAnalyzedFileName("my/report?.xlsx")).toBe("my-report--analyzed.xlsx")
  })
  it("falls back for extensionless names", () => {
    expect(buildAnalyzedFileName("")).toBe("spreadsheet-analyzed.xlsx")
  })
})
