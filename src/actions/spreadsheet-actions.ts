"use server"

import { z } from "zod"
import { actionClient } from "@/lib/safe-action"
import { matchingModeSchema, thresholdSchema } from "@/lib/validation/thresholds"

const inputSchema = z.object({
  matchingMode: matchingModeSchema,
  thresholds: thresholdSchema,
  keyColumnIndex: z.number().int().min(0),
})

/**
 * Server-side validation of an analysis configuration before the client
 * runs the (client-side) processing pipeline. Keeps the server boundary
 * validated without shipping spreadsheet data over the wire.
 */
export const validateAnalysisConfig = actionClient
  .schema(inputSchema)
  .action(async ({ parsedInput }) => {
    return {
      valid: true as const,
      keyColumnIndex: parsedInput.keyColumnIndex,
      matchingMode: parsedInput.matchingMode,
      yellowFrom: parsedInput.thresholds.yellowFrom,
      redFrom: parsedInput.thresholds.redFrom,
    }
  })
