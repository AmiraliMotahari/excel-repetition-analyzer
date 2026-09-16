import { z } from "zod"

export const thresholdSchema = z
  .object({
    yellowFrom: z
      .number({ error: "Yellow threshold is required" })
      .int("Yellow threshold must be an integer")
      .min(1, "Yellow threshold must be at least 1"),
    redFrom: z
      .number({ error: "Red threshold is required" })
      .int("Red threshold must be an integer")
      .min(2, "Red threshold must be at least 2"),
  })
  .refine((data) => data.redFrom > data.yellowFrom, {
    message: "Red threshold must be greater than the yellow threshold",
    path: ["redFrom"],
  })

export type ThresholdInput = z.input<typeof thresholdSchema>
export type ThresholdValues = z.output<typeof thresholdSchema>

export const DEFAULT_THRESHOLDS: ThresholdValues = {
  yellowFrom: 3,
  redFrom: 5,
}

export const matchingModeSchema = z.enum(["exact", "case-insensitive"])
export type MatchingModeValues = z.output<typeof matchingModeSchema>
