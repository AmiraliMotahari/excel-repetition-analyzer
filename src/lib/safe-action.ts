import { createSafeActionClient } from "next-safe-action"

/**
 * Reusable safe-action client (plan §24).
 *
 * All server actions validate input with Zod before any work happens.
 * handleServerError never leaks internals or spreadsheet contents to the
 * client (plan §39) — a generic message is returned instead.
 */
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Server action error:", e instanceof Error ? e.name : "unknown")
    return "An unexpected error occurred while processing. Please try again."
  },
})
