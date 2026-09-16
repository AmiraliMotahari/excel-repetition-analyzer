import { AppHeader } from "@/components/layout/app-header"
import { AnalyzerWorkflow } from "@/components/layout/analyzer-workflow"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <AnalyzerWorkflow />
      </main>
      <footer className="border-t py-4">
        <p className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          Files are processed in your browser. Nothing is uploaded to a server.
        </p>
      </footer>
    </div>
  )
}
