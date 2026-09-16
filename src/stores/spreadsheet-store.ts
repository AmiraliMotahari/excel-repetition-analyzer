"use client"

import { create } from "zustand"
import type {
  ProcessingResult,
  Severity,
} from "@/types/spreadsheet"
import type { ParsedSheet, ParseError } from "@/lib/excel/parser"
import type { ThresholdValues, MatchingModeValues } from "@/lib/validation/thresholds"
import { DEFAULT_THRESHOLDS } from "@/lib/validation/thresholds"

/**
 * Workflow state machine (plan §47):
 * idle → file-selected → workbook-inspected → column-mapped → configuration-valid → processing → completed
 *
 * Zustand holds workflow state ONLY (plan §22). The raw parsed dataset lives
 * in a non-persisted module-level ref so large spreadsheets never enter
 * React state or localStorage; only metadata + results summary are stored.
 */
export type WorkflowStep = "upload" | "map" | "configure" | "analyze" | "results"

export type ProcessingStatus =
  | { status: "idle" }
  | { status: "reading"; progress: number }
  | { status: "counting"; progress: number }
  | { status: "preparing"; progress: number }
  | { status: "completed" }
  | { status: "error"; message: string }

export type WorkflowSnapshot = {
  step: WorkflowStep
  fileName: string | null
  fileSize: number | null
  sheetNames: string[]
  selectedSheet: string | null
  keyColumnIndex: number | null
  matchingMode: MatchingModeValues
  thresholds: ThresholdValues
  status: ProcessingStatus
  parseError: ParseError | null
  maxStepReached: WorkflowStep
}

export type SpreadsheetStore = WorkflowSnapshot & {
  actions: {
    setFile: (meta: { name: string; size: number; sheetNames: string[]; sheets: Record<string, ParsedSheet> }) => void
    setParseError: (error: ParseError) => void
    resetFile: () => void
    selectSheet: (name: string) => void
    setKeyColumn: (index: number) => void
    setMatchingMode: (mode: MatchingModeValues) => void
    setThresholds: (t: Partial<ThresholdValues>) => void
    setStatus: (status: ProcessingStatus) => void
    setResult: (result: ProcessingResult) => void
    goToStep: (step: WorkflowStep) => void
    resetWorkflow: () => void
  }
  // Result payload kept out of the persisted-shaped snapshot; not part of devtools-heavy state.
  result: ProcessingResult | null
}

/**
 * Module-level dataset storage. Parsed sheets are kept here (not in the store)
 * to avoid re-render churn and accidental persistence of large data (plan §40).
 */
const dataset: {
  sheets: Record<string, ParsedSheet>
  result: ProcessingResult | null
} = { sheets: {}, result: null }

export function getSheet(name: string | null): ParsedSheet | null {
  if (!name) return null
  return dataset.sheets[name] ?? null
}

export function getResult(): ProcessingResult | null {
  return dataset.result
}

export function getSeverityCounts(): Record<Severity, number> | null {
  const r = dataset.result
  if (!r) return null
  const counts: Record<Severity, number> = { green: 0, yellow: 0, red: 0 }
  for (const row of r.rows) counts[row.severity]++
  return counts
}

const STEP_ORDER: WorkflowStep[] = ["upload", "map", "configure", "analyze", "results"]

const initial: WorkflowSnapshot = {
  step: "upload",
  fileName: null,
  fileSize: null,
  sheetNames: [],
  selectedSheet: null,
  keyColumnIndex: null,
  matchingMode: "exact",
  thresholds: DEFAULT_THRESHOLDS,
  status: { status: "idle" },
  parseError: null,
  maxStepReached: "upload",
}

export const useSpreadsheetStore = create<SpreadsheetStore>((set, get) => ({
  ...initial,
  result: null,
  actions: {
    setFile: ({ name, size, sheetNames, sheets }) => {
      dataset.sheets = sheets
      dataset.result = null
      set({
        step: "map",
        maxStepReached: "map",
        fileName: name,
        fileSize: size,
        sheetNames,
        selectedSheet: sheetNames[0] ?? null,
        keyColumnIndex: null,
        status: { status: "idle" },
        parseError: null,
        result: null,
      })
    },
    setParseError: (error) =>
      set({ ...initial, result: null, parseError: error }),
    resetFile: () => {
      dataset.sheets = {}
      dataset.result = null
      set({ ...initial, result: null })
    },
    selectSheet: (name) =>
      set((s) => ({
        selectedSheet: name,
        keyColumnIndex: null,
        // Changing sheets invalidates any previous result.
        result: null,
        step: s.maxStepReached === "upload" ? "upload" : "map",
      })),
    setKeyColumn: (index) =>
      set((s) => ({
        keyColumnIndex: index,
        // Picking the key column completes the Map step: advance to Configure.
        step: s.step === "upload" || s.step === "map" ? "configure" : s.step,
        maxStepReached: stepAtLeast(s.maxStepReached, "configure"),
        result: null,
      })),
    setMatchingMode: (mode) => set({ matchingMode: mode, result: null }),
    setThresholds: (t) => set((s) => ({ thresholds: { ...s.thresholds, ...t }, result: null })),
    setStatus: (status) =>
      set((s) => ({
        status,
        // Entering a busy phase moves the workflow onto the Analyze step.
        step:
          status.status === "reading" || status.status === "counting" || status.status === "preparing"
            ? "analyze"
            : s.step,
        maxStepReached:
          status.status === "reading" || status.status === "counting" || status.status === "preparing"
            ? stepAtLeast(s.maxStepReached, "analyze")
            : s.maxStepReached,
      })),
    setResult: (result) => {
      dataset.result = result
      set({ status: { status: "completed" }, step: "results", maxStepReached: "results", result })
    },
    goToStep: (step) => {
      const s = get()
      if (!isReachable(s, step)) return
      set({ step })
    },
    resetWorkflow: () => {
      dataset.sheets = {}
      dataset.result = null
      set({ ...initial, result: null })
    },
  },
}))

/** Prerequisite gating (plan §29): a step is reachable only if its prerequisites hold. */
function isReachable(s: WorkflowSnapshot & { result: ProcessingResult | null }, step: WorkflowStep): boolean {
  const hasWorkbook = s.fileName != null && s.selectedSheet != null && getSheet(s.selectedSheet) != null
  const hasMapping = hasWorkbook && s.keyColumnIndex != null
  const hasResult = s.result != null || getResult() != null
  switch (step) {
    case "upload":
      return true
    case "map":
      return hasWorkbook
    case "configure":
    case "analyze":
      return hasMapping
    case "results":
      return hasResult
  }
}

function stepAtLeast(current: WorkflowStep, target: WorkflowStep): WorkflowStep {
  return STEP_ORDER.indexOf(current) >= STEP_ORDER.indexOf(target) ? current : target
}
