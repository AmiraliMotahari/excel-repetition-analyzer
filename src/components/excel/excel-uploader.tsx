"use client"

import { useCallback, useId, useRef, useState, type DragEvent } from "react"
import { FileSpreadsheetIcon, UploadCloudIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useSpreadsheetStore } from "@/stores/spreadsheet-store"
import { parseWorkbook, formatBytes } from "@/lib/excel/parser"
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/lib/validation/mapping"

export function ExcelUploader() {
  const setFile = useSpreadsheetStore((s) => s.actions.setFile)
  const setParseError = useSpreadsheetStore((s) => s.actions.setParseError)
  const resetFile = useSpreadsheetStore((s) => s.actions.resetFile)
  const fileName = useSpreadsheetStore((s) => s.fileName)
  const fileSize = useSpreadsheetStore((s) => s.fileSize)
  const parseError = useSpreadsheetStore((s) => s.parseError)
  const sheetNames = useSpreadsheetStore((s) => s.sheetNames)
  const selectedSheet = useSpreadsheetStore((s) => s.selectedSheet)

  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setParseError({
          code: "too-large",
          message: `This file is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
        })
        return
      }
      setParsing(true)
      setProgress(15)
      try {
        const buffer = await file.arrayBuffer()
        setProgress(45)
        // Yield to the event loop so the progress UI paints before sync parsing.
        await new Promise((r) => setTimeout(r, 30))
        const parsed = parseWorkbook(file.name, file.size, buffer)
        setProgress(90)
        if (!parsed.ok) {
          setParseError(parsed.error)
        } else {
          const firstWithData = parsed.summary.sheetNames.find((n) => parsed.sheets[n])
          if (!firstWithData) {
            setParseError({
              code: "no-data-rows",
              message: "No worksheet in this workbook contains a header row with data.",
            })
          } else {
            const usable = Object.fromEntries(
              Object.entries(parsed.sheets).filter(([name]) => parsed.sheets[name] != null)
            )
            setFile({
              name: parsed.summary.fileName,
              size: parsed.summary.fileSize,
              sheetNames: Object.keys(usable),
              sheets: usable,
            })
            toast.success(`Loaded ${file.name}`)
          }
        }
      } catch {
        setParseError({
          code: "corrupt-workbook",
          message: "We couldn't read this spreadsheet. The workbook appears to be corrupted.",
        })
      } finally {
        setParsing(false)
        setProgress(0)
      }
    },
    [setFile, setParseError]
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      void handleFile(e.dataTransfer.files?.[0])
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setDragOver(false), [])

  if (fileName && selectedSheet && !parseError) {
    const sheet = useSpreadsheetStore.getState().result // placeholder-free zone; summary below uses store meta only
    void sheet
    const sheetCount = sheetNames.length
    const dataSheet = sheetNames.length
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 rounded-xl border bg-card px-4 py-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheetIcon className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <div>
              <p className="font-medium">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(fileSize ?? 0)} · {dataSheet} worksheet{dataSheet === 1 ? "" : "s"} available
                {sheetCount === 1 && selectedSheet ? ` · using “${selectedSheet}”` : ""}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={resetFile} aria-label="Remove file and start over">
            <XIcon aria-hidden /> Remove
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload an Excel file. Drag and drop, or press Enter to browse."
        aria-describedby={`${inputId}-hint`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${
          dragOver
            ? "border-primary bg-muted"
            : "border-border hover:border-foreground/30 hover:bg-muted/50"
        }`}
      >
        <UploadCloudIcon className="size-10 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">Drop your Excel file here</p>
          <p className="text-sm text-muted-foreground">or</p>
        </div>
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={parsing}>
          Choose Excel File
        </Button>
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          Supported: .xlsx, .xls — up to {formatBytes(MAX_FILE_SIZE_BYTES)}
        </p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />

      {parsing && (
        <div className="flex flex-col gap-1" aria-live="polite">
          <p className="text-sm text-muted-foreground">Reading workbook…</p>
          <Progress value={progress} />
        </div>
      )}

      {parseError && (
        <Alert variant="destructive" role="alert">
          <XIcon aria-hidden />
          <AlertTitle>We couldn&apos;t read this spreadsheet.</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{parseError.message}</span>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                resetFile()
                inputRef.current?.click()
              }}
            >
              Choose another file
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
