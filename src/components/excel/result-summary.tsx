"use client"

import { FileSpreadsheetIcon, ListChecksIcon, CircleCheckIcon, CircleAlertIcon, OctagonAlertIcon, BanIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ProcessingStatistics } from "@/types/spreadsheet"
import { formatBytes } from "@/lib/excel/parser"

const number = new Intl.NumberFormat()

export function ResultSummary({
  statistics,
  fileName,
  fileSize,
  sheetName,
}: {
  statistics: ProcessingStatistics
  fileName: string
  fileSize: number
  sheetName: string
}) {
  const items = [
    {
      label: "Total Rows",
      value: number.format(statistics.totalRows),
      icon: FileSpreadsheetIcon,
      hint: `${fileName} · ${sheetName} · ${formatBytes(fileSize)}`,
    },
    {
      label: "Unique Keys",
      value: number.format(statistics.uniqueKeys),
      icon: ListChecksIcon,
      hint: `Distinct non-empty key values${statistics.emptyKeys > 0 ? ` · ${number.format(statistics.emptyKeys)} empty` : ""}`,
    },
    {
      label: "Green — Normal",
      value: number.format(statistics.greenRows),
      icon: CircleCheckIcon,
      hint: "Below the yellow threshold",
    },
    {
      label: "Yellow — Review",
      value: number.format(statistics.yellowRows),
      icon: CircleAlertIcon,
      hint: "At or above the yellow threshold",
    },
    {
      label: "Red — High repetition",
      value: number.format(statistics.redRows),
      icon: OctagonAlertIcon,
      hint: "At or above the red threshold",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" role="list" aria-label="Result statistics">
      {items.map((item) => {
        const Icon = item.icon
        const tone =
          item.label.startsWith("Green") || item.label.startsWith("Yellow") || item.label.startsWith("Red")
            ? item.label.split(" — ")[0].toLowerCase()
            : null
        return (
          <Card key={item.label} size="sm" role="listitem" className={cardToneClass(tone)}>
            <CardContent className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" aria-hidden />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <p className={`text-2xl font-semibold tabular-nums ${toneClass(tone)}`}>
                {item.value}
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function toneClass(tone: string | null) {
  switch (tone) {
    case "green":
      return "text-emerald-700 dark:text-emerald-400"
    case "yellow":
      return "text-amber-700 dark:text-amber-400"
    case "red":
      return "text-red-700 dark:text-red-400"
    default:
      return ""
  }
}

function cardToneClass(tone: string | null) {
  switch (tone) {
    case "green":
      return "bg-emerald-500/15 ring-emerald-600/40"
    case "yellow":
      return "bg-amber-400/20 ring-amber-500/40"
    case "red":
      return "bg-red-500/15 ring-red-600/40"
    default:
      return ""
  }
}

void BanIcon
