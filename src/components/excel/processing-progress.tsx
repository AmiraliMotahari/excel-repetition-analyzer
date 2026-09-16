"use client"

import { useSpreadsheetStore } from "@/stores/spreadsheet-store"
import { Progress } from "@/components/ui/progress"

const PHASE_LABELS = {
  reading: "Reading rows",
  counting: "Counting repetitions",
  preparing: "Preparing results",
} as const

export function ProcessingProgress() {
  const status = useSpreadsheetStore((s) => s.status)

  if (status.status === "idle" || status.status === "completed" || status.status === "error") {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4" aria-live="polite">
      <p className="text-sm font-medium">Analyzing…</p>
      {(Object.keys(PHASE_LABELS) as (keyof typeof PHASE_LABELS)[]).map((phase) => {
        const active = status.status === phase
        const done =
          status.status !== phase &&
          (phase === "reading" || (phase === "counting" && status.status === "preparing"))
        const pct = active ? status.progress : done ? 100 : 0
        return (
          <div key={phase} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${active ? "font-medium text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                {PHASE_LABELS[phase]}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(pct)}%
              </span>
            </div>
            <Progress value={pct} aria-label={`${PHASE_LABELS[phase]}: ${Math.round(pct)}%`} />
          </div>
        )
      })}
    </div>
  )
}
