"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkflowStepper } from "@/components/layout/workflow-stepper"
import { ExcelUploader } from "@/components/excel/excel-uploader"
import { ColumnMapper } from "@/components/excel/column-mapper"
import { ThresholdForm } from "@/components/excel/threshold-form"
import { ProcessingProgress } from "@/components/excel/processing-progress"
import { ResultSummary } from "@/components/excel/result-summary"
import { ResultTable } from "@/components/excel/result-table"
import { useSpreadsheetStore, getSheet } from "@/stores/spreadsheet-store"

/**
 * Client-side workflow shell. Renders the step panels gated by the store's
 * state machine; server components own the static page chrome (plan §44).
 */
export function AnalyzerWorkflow() {
  const step = useSpreadsheetStore((s) => s.step)
  const status = useSpreadsheetStore((s) => s.status)
  const fileName = useSpreadsheetStore((s) => s.fileName)
  const fileSize = useSpreadsheetStore((s) => s.fileSize)
  const selectedSheet = useSpreadsheetStore((s) => s.selectedSheet)
  const keyColumnIndex = useSpreadsheetStore((s) => s.keyColumnIndex)
  const matchingMode = useSpreadsheetStore((s) => s.matchingMode)
  const thresholds = useSpreadsheetStore((s) => s.thresholds)
  const result = useSpreadsheetStore((s) => s.result)

  const showUpload = step === "upload"
  const showMap = step === "map"
  const showConfigure = step === "configure" || step === "analyze"
  const showResults = step === "results"
  const busy = status.status !== "idle" && status.status !== "completed" && status.status !== "error"
  const sheet = getSheet(selectedSheet)

  return (
    <div className="flex flex-col gap-6">
      <WorkflowStepper />

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Spreadsheet</CardTitle>
            <CardDescription>
              Upload an Excel file, pick a key column, and count how often each value repeats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExcelUploader />
          </CardContent>
        </Card>
      )}

      {showMap && (
        <Card>
          <CardHeader>
            <CardTitle>Map Key Column</CardTitle>
            <CardDescription>
              {fileName ? `Inspecting “${fileName}”` : "Inspect your workbook"} — choose the
              worksheet and the column whose repeated values you want to count.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ExcelUploader />
            <ColumnMapper />
          </CardContent>
        </Card>
      )}

      {showConfigure && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Thresholds</CardTitle>
            <CardDescription>
              {sheet && keyColumnIndex != null
                ? `Counting repetitions of “${sheet.columns[keyColumnIndex]?.originalName ?? "the selected column"}”`
                : "Choose how repetitions are classified"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThresholdForm />
          </CardContent>
        </Card>
      )}

      {busy && <ProcessingProgress />}

      {status.status === "error" && (
        <Card>
          <CardContent>
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          </CardContent>
        </Card>
      )}

      {showResults && result && selectedSheet && (
        <div className="flex flex-col gap-6">
          <ResultSummary
            statistics={result.statistics}
            fileName={fileName ?? ""}
            fileSize={fileSize ?? 0}
            sheetName={selectedSheet}
          />
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Repetition count appended to every row · matching:{" "}
                {matchingMode === "exact" ? "exact" : "case-insensitive"} · thresholds: yellow from{" "}
                {thresholds.yellowFrom}, red from {thresholds.redFrom}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResultTable />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
