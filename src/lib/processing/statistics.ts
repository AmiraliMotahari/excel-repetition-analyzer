import type { ProcessedRow, ProcessingStatistics } from "@/types/spreadsheet"

export function computeStatistics(
  rows: readonly ProcessedRow[],
  uniqueKeys: number
): ProcessingStatistics {
  let green = 0
  let yellow = 0
  let red = 0
  let empty = 0

  for (const row of rows) {
    switch (row.severity) {
      case "green":
        green++
        if (row.repetitionCount === 0) empty++
        break
      case "yellow":
        yellow++
        break
      case "red":
        red++
        break
    }
  }

  return {
    totalRows: rows.length,
    uniqueKeys,
    emptyKeys: empty,
    greenRows: green,
    yellowRows: yellow,
    redRows: red,
  }
}
