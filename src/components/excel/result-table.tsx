"use client"

import { useCallback, useMemo, useState, useDeferredValue } from "react"
import {
  useTable,
  createColumnHelper,
  FlexRender,
  tableFeatures,
  columnFilteringFeature,
  globalFilteringFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  createFilteredRowModel,
  createSortedRowModel,
  createPaginatedRowModel,
} from "@tanstack/react-table"
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  DownloadIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SeverityBadge } from "./severity-badge"
import { useSpreadsheetStore, getSheet, getResult } from "@/stores/spreadsheet-store"
import {
  formatCellValue,
  REPETITION_COUNT_COLUMN_NAME,
  type ProcessedRow,
  type Severity,
} from "@/types/spreadsheet"
import { exportAnalyzedWorkbook, buildAnalyzedFileName } from "@/lib/excel/exporter"

/**
 * TanStack Table v9: features are registered via `tableFeatures()` and row
 * models via factory slots (sortedRowModel etc.), replacing the v8
 * getCoreRowModel()/getSortedRowModel() chain.
 */
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})

const helper = createColumnHelper<typeof features, ProcessedRow>()

const PAGE_SIZES = [25, 50, 100, 250]
const numberFormat = new Intl.NumberFormat()

export function ResultTable() {
  const columnsMeta = useSpreadsheetStore((s) => s.result?.columns)
  const selectedSheet = useSpreadsheetStore((s) => s.selectedSheet)
  const fileName = useSpreadsheetStore((s) => s.fileName)

  const result = getResult()

  const [globalFilter, setGlobalFilter] = useState("")
  const deferredFilter = useDeferredValue(globalFilter)
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all")
  const [sorting, setSorting] = useState<SortingState>([])
  const [exporting, setExporting] = useState(false)

  const columns = useMemo(() => {
    if (!columnsMeta) return helper.columns([])
    // helper.columns() preserves per-accessor TValue inference for mixed
    // string/number accessor arrays (TanStack v9 pattern).
    return helper.columns([
      ...columnsMeta.map((col) =>
        helper.accessor((row) => formatCellValue(row.values[col.index] ?? null), {
          id: `col-${col.index}`,
          header: col.originalName,
          cell: (info) => (
            <span className="block max-w-64 truncate" title={info.getValue()}>
              {info.getValue() || "—"}
            </span>
          ),
        })
      ),
      helper.accessor("repetitionCount", {
        id: "repetitionCount",
        header: REPETITION_COUNT_COLUMN_NAME,
        // Severity filter rides on this column via a custom filterFn.
        filterFn: (row, _columnId, filterValue) =>
          filterValue === "all" || row.original.severity === filterValue,
        cell: (info) => (
          <span className="flex items-center gap-2">
            <span className="font-medium tabular-nums">{info.getValue()}</span>
            <SeverityBadge severity={info.row.original.severity} />
          </span>
        ),
      }),
    ])
  }, [columnsMeta])

  // Controlled table state (plan §47): severity filter is composed into
  // columnFilters on the repetitionCount column.
  const columnFilters = useMemo<ColumnFiltersState>(
    () =>
      severityFilter === "all"
        ? []
        : [{ id: "repetitionCount", value: severityFilter }],
    [severityFilter]
  )

  const table = useTable(
    {
      features,
      data: result?.rows ?? [],
      columns,
      state: { sorting, columnFilters, globalFilter: deferredFilter },
      onSortingChange: setSorting,
      globalFilterFn: (row, _columnId, value) => {
        const q = String(value).trim().toLowerCase()
        if (!q) return true
        return row.original.values.some((v) => formatCellValue(v).toLowerCase().includes(q))
      },
      initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZES[0] } },
    },
    // Re-render on the slices this component reads (v9 selector-based reactivity).
    (state) => ({
      pagination: state.pagination,
    })
  )

  const handleExport = useCallback(async () => {
    const sheet = getSheet(selectedSheet)
    if (!sheet || !fileName || !result) return
    setExporting(true)
    try {
      const blob = await exportAnalyzedWorkbook(result, sheet.sheetName, fileName)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = buildAnalyzedFileName(fileName)
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded ${buildAnalyzedFileName(fileName)}`)
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setExporting(false)
    }
  }, [result, selectedSheet, fileName])

  if (!columnsMeta || !result) return null

  const rows = table.getRowModel().rows
  const pageCount = table.getPageCount()
  const pageIndex = table.state.pagination.pageIndex
  const pageSize = table.state.pagination.pageSize
  const totalFiltered = table.getFilteredRowModel().rows.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value)
                table.setPageIndex(0)
              }}
              placeholder="Search all columns…"
              className="w-full pl-8 sm:w-64"
              aria-label="Search rows across all visible columns"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="severity-filter" className="sr-only">
              Filter severity
            </label>
            <Select
              value={severityFilter}
              onValueChange={(v) => {
                setSeverityFilter(v as "all" | Severity)
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger id="severity-filter" className="w-28" aria-label="Filter severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="red">Red</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleExport} disabled={exporting}>
          <DownloadIcon aria-hidden /> {exporting ? "Preparing…" : "Download Excel"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 text-left font-medium hover:text-foreground focus-visible:outline-none"
                          aria-label={`Sort by ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.id}`}
                        >
                          <FlexRender header={header} />
                          {sorted === "asc" && <ArrowUpIcon className="size-3" aria-hidden />}
                          {sorted === "desc" && <ArrowDownIcon className="size-3" aria-hidden />}
                        </button>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  No rows match your search or filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className={severityRowClass(row.original.severity)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row" aria-label="Table pagination">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {numberFormat.format(pageIndex * pageSize + (rows.length ? 1 : 0))}–
          {numberFormat.format(pageIndex * pageSize + rows.length)} of{" "}
          {numberFormat.format(totalFiltered)} rows
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            <label htmlFor="page-size" className="text-sm text-muted-foreground">
              Rows per page
            </label>
            <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger id="page-size" size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()} aria-label="First page">
              <ChevronsLeftIcon aria-hidden />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
              <ChevronLeftIcon aria-hidden />
            </Button>
            <span className="px-1 text-sm tabular-nums text-muted-foreground">
              Page {pageIndex + 1} of {Math.max(1, pageCount)}
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
              <ChevronRightIcon aria-hidden />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()} aria-label="Last page">
              <ChevronsRightIcon aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Bold severity row backgrounds + non-color left accent border (plan §17). */
function severityRowClass(severity: Severity): string {
  switch (severity) {
    case "green":
      return "bg-emerald-500/20 border-l-4 border-l-emerald-600 hover:bg-emerald-500/30"
    case "yellow":
      return "bg-amber-400/30 border-l-4 border-l-amber-500 hover:bg-amber-400/40"
    case "red":
      return "bg-red-500/25 border-l-4 border-l-red-600 hover:bg-red-500/35"
  }
}
