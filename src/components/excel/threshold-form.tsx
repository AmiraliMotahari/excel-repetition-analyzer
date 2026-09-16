"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlayIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  thresholdSchema,
  type ThresholdValues,
} from "@/lib/validation/thresholds"
import { useSpreadsheetStore, getSheet } from "@/stores/spreadsheet-store"
import { toast } from "sonner"
import { analyzeRows } from "@/lib/processing/repetition-analyzer"
import { validateAnalysisConfig } from "@/actions/spreadsheet-actions"

export function ThresholdForm() {
  const thresholds = useSpreadsheetStore((s) => s.thresholds)
  const setThresholds = useSpreadsheetStore((s) => s.actions.setThresholds)
  const matchingMode = useSpreadsheetStore((s) => s.matchingMode)
  const setMatchingMode = useSpreadsheetStore((s) => s.actions.setMatchingMode)
  const setStatus = useSpreadsheetStore((s) => s.actions.setStatus)
  const setResult = useSpreadsheetStore((s) => s.actions.setResult)
  const keyColumnIndex = useSpreadsheetStore((s) => s.keyColumnIndex)

  const form = useForm<ThresholdValues>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: thresholds,
    mode: "onBlur",
  })

  const yellowFrom = useWatch({ control: form.control, name: "yellowFrom" })
  const redFrom = useWatch({ control: form.control, name: "redFrom" })

  const onSubmit = async (values: ThresholdValues) => {
    if (keyColumnIndex == null) {
      toast.error("Select a key column first.")
      return
    }
    setThresholds(values)

    // Simulated progress: client-side analysis is fast; the phases keep the
    // UI informative and match the architecture ready for a Web Worker move.
    setStatus({ status: "reading", progress: 10 })
    await new Promise((r) => setTimeout(r, 60))

    // Server-side validation of the configuration (next-safe-action, plan §24).
    const serverCheck = await validateAnalysisConfig({
      keyColumnIndex,
      matchingMode,
      thresholds: values,
    })
    if (serverCheck?.serverError) {
      setStatus({ status: "error", message: serverCheck.serverError })
      toast.error(serverCheck.serverError)
      return
    }

    setStatus({ status: "counting", progress: 55 })
    await new Promise((r) => setTimeout(r, 60))

    const sheetData = getSheet(useSpreadsheetStore.getState().selectedSheet)
    if (!sheetData) {
      setStatus({ status: "error", message: "The selected worksheet is no longer available." })
      return
    }

    const result = analyzeRows(sheetData.rows, {
      keyColumnIndex,
      matchingMode,
      thresholds: values,
    })

    setStatus({ status: "preparing", progress: 90 })
    await new Promise((r) => setTimeout(r, 60))

    setResult({ ...result, columns: sheetData.columns })
    toast.success("Analysis complete.")
  }

  const greenLabel = `1–${Math.max(1, (yellowFrom || 1) - 1)}`
  const yellowLabel = `${yellowFrom || "–"}–${redFrom ? redFrom - 1 : "–"}`
  const redLabel = `${redFrom || "–"}+`

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div
        role="radiogroup"
        aria-labelledby="matching-mode-label"
        className="flex flex-col gap-2"
      >
        <span id="matching-mode-label" className="text-sm font-medium">
          Matching mode
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "exact", label: "Exact" },
              { value: "case-insensitive", label: "Case-insensitive" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={matchingMode === opt.value ? "default" : "outline"}
              size="sm"
              aria-pressed={matchingMode === opt.value}
              onClick={() => setMatchingMode(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Values are compared after trimming whitespace. The original cell values are never modified.
        </p>
      </div>

      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.yellowFrom}>
          <FieldLabel htmlFor="yellowFrom">Yellow threshold (from)</FieldLabel>
          <Input
            id="yellowFrom"
            type="number"
            min={1}
            step={1}
            {...form.register("yellowFrom", { valueAsNumber: true })}
            aria-invalid={!!form.formState.errors.yellowFrom}
          />
          <FieldDescription>
            Rows with at least this many occurrences become yellow.
          </FieldDescription>
          <FieldError errors={form.formState.errors.yellowFrom ? [form.formState.errors.yellowFrom] : []} />
        </Field>

        <Field data-invalid={!!form.formState.errors.redFrom}>
          <FieldLabel htmlFor="redFrom">Red threshold (from)</FieldLabel>
          <Input
            id="redFrom"
            type="number"
            min={2}
            step={1}
            {...form.register("redFrom", { valueAsNumber: true })}
            aria-invalid={!!form.formState.errors.redFrom}
          />
          <FieldDescription>
            Rows with at least this many occurrences become red.
          </FieldDescription>
          <FieldError errors={form.formState.errors.redFrom ? [form.formState.errors.redFrom] : []} />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Repetition thresholds preview</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ThresholdPreview label="Green — normal" range={greenLabel} tone="green" />
          <ThresholdPreview label="Yellow — review" range={yellowLabel} tone="yellow" />
          <ThresholdPreview label="Red — high repetition" range={redLabel} tone="red" />
        </div>
        <p className="text-xs text-muted-foreground">
          Empty key cells always receive a count of 0 and are never treated as duplicates of each other.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={form.formState.isSubmitting || keyColumnIndex == null}>
        <PlayIcon aria-hidden /> Analyze Spreadsheet
      </Button>
    </form>
  )
}

function ThresholdPreview({
  label,
  range,
  tone,
}: {
  label: string
  range: string
  tone: "green" | "yellow" | "red"
}) {
  const toneClass = {
    green: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-600/50",
    yellow: "bg-amber-400/30 text-amber-800 dark:text-amber-300 border-amber-500/50",
    red: "bg-red-500/20 text-red-800 dark:text-red-300 border-red-600/50",
  }[tone]
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${toneClass}`}>
      <p className="font-medium">{label}</p>
      <p className="text-xs opacity-80">{range} occurrences</p>
    </div>
  )
}
