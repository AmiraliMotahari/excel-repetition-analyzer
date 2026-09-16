import { Badge } from "@/components/ui/badge"
import { CircleCheckIcon, CircleAlertIcon, OctagonAlertIcon } from "lucide-react"
import type { Severity } from "@/types/spreadsheet"
import { cn } from "cn"

const CONFIG = {
  green: {
    label: "Normal",
    icon: CircleCheckIcon,
    className:
      "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:border-emerald-400",
  },
  yellow: {
    label: "Review",
    icon: CircleAlertIcon,
    className:
      "bg-amber-500 text-amber-950 border-amber-600 dark:bg-amber-400 dark:text-amber-950 dark:border-amber-300",
  },
  red: {
    label: "High repetition",
    icon: OctagonAlertIcon,
    className:
      "bg-red-600 text-white border-red-700 dark:bg-red-500 dark:text-red-950 dark:border-red-400",
  },
} as const satisfies Record<Severity, unknown>

/** Non-color severity indicator: badge + icon + text (plan §17). */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = CONFIG[severity]
  const Icon = cfg.icon
  return (
    <Badge
      variant="outline"
      className={cn("gap-1", cfg.className)}
      aria-label={`Severity: ${cfg.label}`}
    >
      <Icon aria-hidden className="size-3!" />
      {cfg.label}
    </Badge>
  )
}
