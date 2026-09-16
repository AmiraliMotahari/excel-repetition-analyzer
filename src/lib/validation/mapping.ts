import { z } from "zod"
import { matchingModeSchema, thresholdSchema } from "./thresholds"

export const mappingSchema = z.object({
  keyColumnIndex: z
    .number({ error: "Select a key column" })
    .int()
    .min(0, "Select a key column"),
  matchingMode: matchingModeSchema,
})

export type MappingInput = z.input<typeof mappingSchema>

export const analysisRequestSchema = z.object({
  keyColumnIndex: z.number().int().min(0),
  matchingMode: matchingModeSchema,
  thresholds: thresholdSchema,
})

export type AnalysisRequest = z.output<typeof analysisRequestSchema>

export const fileValidationSchema = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
})
export type FileValidation = z.output<typeof fileValidationSchema>

/** Upload constraints — enforced client-side; server actions validate independently. */
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB
export const ACCEPTED_EXTENSIONS = [".xlsx", ".xls"] as const
