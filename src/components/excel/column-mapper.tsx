"use client"

import { useMemo } from "react"
import { useSpreadsheetStore, getSheet } from "@/stores/spreadsheet-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { columnLetter, columnLabel } from "@/lib/excel/parser"
import { formatCellValue } from "@/types/spreadsheet"

const PREVIEW_ROWS = 5

export function ColumnMapper() {
  const sheetNames = useSpreadsheetStore((s) => s.sheetNames)
  const selectedSheet = useSpreadsheetStore((s) => s.selectedSheet)
  const keyColumnIndex = useSpreadsheetStore((s) => s.keyColumnIndex)
  const selectSheet = useSpreadsheetStore((s) => s.actions.selectSheet)
  const setKeyColumn = useSpreadsheetStore((s) => s.actions.setKeyColumn)

  const sheet = useMemo(() => getSheet(selectedSheet), [selectedSheet])

  if (!sheet) return null

  const preview = sheet.rows.slice(0, PREVIEW_ROWS)

  return (
    <div className="flex flex-col gap-6">
      {sheetNames.length > 1 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="worksheet-select" className="text-sm font-medium">
            Worksheet
          </label>
          <Select value={selectedSheet ?? undefined} onValueChange={selectSheet}>
            <SelectTrigger id="worksheet-select" className="w-full sm:w-72">
              <SelectValue placeholder="Choose a worksheet" />
            </SelectTrigger>
            <SelectContent>
              {sheetNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Detected columns</h3>
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Column</TableHead>
                <TableHead>Header</TableHead>
                {preview.map((row, i) => (
                  <TableHead key={row.index} className="hidden md:table-cell">
                    {`Row ${i + 1}`}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheet.columns.map((col) => {
                const selected = col.index === keyColumnIndex
                return (
                  <TableRow
                    key={col.index}
                    data-state={selected ? "selected" : undefined}
                    className={selected ? "bg-muted/60" : undefined}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {columnLetter(col.index)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{col.originalName}</span>
                      {selected && (
                        <Badge variant="secondary" className="ml-2">
                          Key
                        </Badge>
                      )}
                    </TableCell>
                    {preview.map((row) => (
                      <TableCell key={row.index} className="hidden max-w-48 truncate text-muted-foreground md:table-cell">
                        {formatCellValue(row.values[col.index] ?? null) || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="key-column-select" className="text-sm font-medium">
          Which column should be used as the repetition key?
        </label>
        <Select
          value={keyColumnIndex != null ? String(keyColumnIndex) : undefined}
          onValueChange={(v) => setKeyColumn(Number(v))}
        >
          <SelectTrigger id="key-column-select" className="w-full sm:w-72" aria-describedby="key-column-hint">
            <SelectValue placeholder="Select a column" />
          </SelectTrigger>
          <SelectContent>
            {sheet.columns.map((col) => (
              <SelectItem key={col.index} value={String(col.index)}>
                {columnLabel(col)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p id="key-column-hint" className="text-xs text-muted-foreground">
          Columns are identified by position, so duplicate or unusual header names are safe.
        </p>
      </div>
    </div>
  )
}
