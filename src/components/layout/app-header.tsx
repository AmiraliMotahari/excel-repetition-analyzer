import { FileSpreadsheetIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheetIcon className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-sm font-semibold tracking-tight">Excel Repetition Analyzer</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
