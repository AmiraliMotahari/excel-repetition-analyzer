"use client"

import { CheckIcon } from "lucide-react"
import { cn } from "cn"
import { useSpreadsheetStore, type WorkflowStep } from "@/stores/spreadsheet-store"
import { getSheet } from "@/stores/spreadsheet-store"

const STEPS: { id: WorkflowStep; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map" },
  { id: "configure", label: "Configure" },
  { id: "analyze", label: "Analyze" },
  { id: "results", label: "Results" },
]

export function WorkflowStepper() {
  const step = useSpreadsheetStore((s) => s.step)
  const maxStepReached = useSpreadsheetStore((s) => s.maxStepReached)
  const hasResult = useSpreadsheetStore((s) => s.result != null)
  const goToStep = useSpreadsheetStore((s) => s.actions.goToStep)
  const fileName = useSpreadsheetStore((s) => s.fileName)
  const selectedSheet = useSpreadsheetStore((s) => s.selectedSheet)
  const keyColumnIndex = useSpreadsheetStore((s) => s.keyColumnIndex)

  const currentIndex = STEPS.findIndex((s) => s.id === step)

  const stepState = (id: WorkflowStep, i: number) => {
    if (i < currentIndex) return "done"
    if (i === currentIndex) return "current"
    return "upcoming"
  }

  const isClickable = (id: WorkflowStep) => {
    switch (id) {
      case "upload":
        return true
      case "map":
        return fileName != null && selectedSheet != null && getSheet(selectedSheet) != null
      case "configure":
      case "analyze":
        return keyColumnIndex != null && fileName != null && getSheet(selectedSheet ?? "") != null
      case "results":
        return hasResult
    }
  }

  const reached = (id: WorkflowStep) =>
    STEPS.findIndex((s) => s.id === id) <= STEPS.findIndex((s) => s.id === maxStepReached)

  return (
    <nav aria-label="Workflow progress" className="w-full">
      <ol className="flex flex-wrap justify-center items-center gap-x-2 gap-y-2 sm:gap-x-4">
        {STEPS.map((s, i) => {
          const state = stepState(s.id, i)
          const clickable = isClickable(s.id) && reached(s.id)
          return (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => goToStep(s.id)}
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium transition-colors",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  state === "current" && "text-foreground",
                  state === "done" && "text-muted-foreground",
                  state === "upcoming" && "text-muted-foreground/70",
                  clickable && "cursor-pointer hover:bg-muted",
                  !clickable && "cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    state === "current" && "border-primary bg-primary text-primary-foreground",
                    state === "done" && "border-border bg-muted text-foreground",
                    state === "upcoming" && "border-border text-muted-foreground"
                  )}
                >
                  {state === "done" ? (
                    <CheckIcon className="size-3.5" aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "hidden h-px w-6 bg-border sm:block sm:w-10",
                    state === "done" && "bg-foreground/20"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
