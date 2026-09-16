import type { Severity, ThresholdConfig } from "@/types/spreadsheet"

/**
 * GREEN  = count < yellowFrom
 * YELLOW = yellowFrom <= count < redFrom
 * RED    = count >= redFrom
 *
 * A count of 0 (empty key) is always green.
 */
export function classifySeverity(count: number, thresholds: ThresholdConfig): Severity {
  if (count < thresholds.yellowFrom) return "green"
  if (count < thresholds.redFrom) return "yellow"
  return "red"
}
