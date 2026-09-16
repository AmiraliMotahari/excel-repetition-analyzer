import { describe, expect, it, beforeEach } from "vitest"
import { useSpreadsheetStore, getSheet } from "@/stores/spreadsheet-store"
import type { ParsedSheet } from "@/lib/excel/parser"
import type { ProcessingResult } from "@/types/spreadsheet"

const sheet: ParsedSheet = {
  sheetName: "Data",
  columns: [
    { index: 0, originalName: "Name" },
    { index: 1, originalName: "Phone" },
  ],
  rows: [
    { index: 0, values: ["Ali", "09120000000"] },
    { index: 1, values: ["Sara", "09123333333"] },
  ],
}

function setFile() {
  useSpreadsheetStore.getState().actions.setFile({
    name: "test.xlsx",
    size: 100,
    sheetNames: ["Data"],
    sheets: { Data: sheet },
  })
}

describe("workflow step machine", () => {
  beforeEach(() => {
    useSpreadsheetStore.getState().actions.resetWorkflow()
  })

  it("starts at upload", () => {
    expect(useSpreadsheetStore.getState().step).toBe("upload")
    expect(useSpreadsheetStore.getState().maxStepReached).toBe("upload")
  })

  it("advances to map after upload", () => {
    setFile()
    const s = useSpreadsheetStore.getState()
    expect(s.step).toBe("map")
    expect(s.maxStepReached).toBe("map")
  })

  it("advances to configure when the key column is chosen", () => {
    setFile()
    useSpreadsheetStore.getState().actions.setKeyColumn(1)
    const s = useSpreadsheetStore.getState()
    expect(s.step).toBe("configure")
    expect(s.maxStepReached).toBe("configure")
  })

  it("highlights analyze while processing and lands on results when done", () => {
    setFile()
    useSpreadsheetStore.getState().actions.setKeyColumn(1)
    useSpreadsheetStore.getState().actions.setStatus({ status: "reading", progress: 10 })
    expect(useSpreadsheetStore.getState().step).toBe("analyze")
    useSpreadsheetStore.getState().actions.setStatus({ status: "counting", progress: 55 })
    expect(useSpreadsheetStore.getState().step).toBe("analyze")

    const result: ProcessingResult = {
      columns: sheet.columns,
      rows: [
        { index: 0, values: ["Ali", "09120000000"], repetitionCount: 1, severity: "green" },
      ],
      statistics: {
        totalRows: 1,
        uniqueKeys: 1,
        emptyKeys: 0,
        greenRows: 1,
        yellowRows: 0,
        redRows: 0,
      },
      config: {
        keyColumnIndex: 1,
        matchingMode: "exact",
        thresholds: { yellowFrom: 3, redFrom: 5 },
      },
    }
    useSpreadsheetStore.getState().actions.setResult(result)
    const s = useSpreadsheetStore.getState()
    expect(s.step).toBe("results")
    expect(s.maxStepReached).toBe("results")
    expect(getSheet("Data")).toBeDefined()
  })

  it("keeps goToStep gated on prerequisites", () => {
    // configure is not reachable without a key column
    useSpreadsheetStore.getState().actions.goToStep("configure")
    expect(useSpreadsheetStore.getState().step).toBe("upload")

    // results is not reachable without a result
    setFile()
    useSpreadsheetStore.getState().actions.goToStep("results")
    expect(useSpreadsheetStore.getState().step).toBe("map")

    // map is reachable back from configure
    useSpreadsheetStore.getState().actions.setKeyColumn(1)
    useSpreadsheetStore.getState().actions.goToStep("map")
    expect(useSpreadsheetStore.getState().step).toBe("map")
  })
})
