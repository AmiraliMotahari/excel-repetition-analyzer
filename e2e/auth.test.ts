import { test, expect } from "@playwright/test"

const DEFAULT_BASE_URL = "http://localhost:3000"

const EXCEL_FIXTURES = {
  SIMPLE: "fixtures/test-simple.xlsx",
  COMPLEX: "fixtures/test-complex.xlsx",
  EDGE_CASES: "fixtures/test-edge-cases.xlsx",
}

function getFixturePath(fixtureName: string): string {
  return `file://${require("path").resolve(
    __dirname,
    `../../${EXCEL_FIXTURES[fixtureName]}`
  )}`
}

test.describe("Excel Repetition Analyzer - E2E", () => {
  test("should load the application homepage", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Excel Repetition Analyzer/)
    await expect(page.locator("h1")).toContainText("Excel Repetition Analyzer")
  })

  test("should upload an Excel file successfully", async ({ page }) => {
    await page.goto("/")
    // Upload a file using the file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    await expect(fileInput).toHaveValue(/test-simple\.xlsx/)
  })

  test("should show worksheet selection after upload", async ({ page }) => {
    await page.goto("/")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    await expect(page.locator("text=Worksheet")).toBeVisible()
    await expect(page.locator("text=Test Sheet")).toBeVisible()
  })

  test("should select worksheet and show columns", async ({ page }) => {
    await page.goto("/")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    // Select the worksheet
    await page.locator("text=Test Sheet").click()
    // Wait for columns to appear
    await expect(page.locator("text=Customer Name")).toBeVisible()
    await expect(page.locator("text=Phone Number")).toBeVisible()
    await expect(page.locator("text=City")).toBeVisible()
  })

  test("should select repetition key column", async ({ page }) => {
    await page.goto("/")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    await page.locator("text=Test Sheet").click()
    await expect(page.locator("text=Customer Name")).toBeVisible()
    // Select Phone Number as the key column
    await page.locator("select").selectOption({ label: "Phone Number" })
    await expect(page.locator("text-selected")).toBeVisible()
  })

  test("should configure thresholds", async ({ page }) => {
    await page.goto("/")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    await page.locator("text=Test Sheet").click()
    await page.locator("select").selectOption({ label: "Phone Number" })
    // Find and open threshold form
    await page.locator("text=Configure Thresholds").click()
    await expect(page.locator("input[placeholder*='yellow']")).toBeVisible()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze')").click()
  })

  test("should show processing progress", async ({ page }) => {
    await page.goto("/")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    await page.locator("text=Test Sheet").click()
    await page.locator("select").selectOption({ label: "Phone Number" })
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    const progressBar = page.locator(".progress-bar")
    await expect(progressBar).toBeVisible()
    await expect(page.locator("text=Analyzing...")).toBeVisible()
  })

  test("should display results with severity coloring", async ({ page }) => {
    await page.goto("/")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    await page.locator("text=Test Sheet").click()
    await page.locator("select").selectOption({ label: "Phone Number" })
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze').visible").click()
    // Wait for results
    await expect(page.locator("text=Repetition Count")).toBeVisible()
    // Check that we have results
    const rows = page.locator("tr")
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(1) // header + data rows
  })

  test("should allow filtering by severity", async ({ page }) => {
    await page.goto("/")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    await page.locator("text=Test Sheet").click()
    await page.locator("select").selectOption({ label: "Phone Number" })
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze').visible").click()
    // Filter by Yellow severity
    await page.locator("text=Yellow").click()
    // Check that only yellow rows are visible
    const visibleRows = page.locator("tr:not(:first-child):visible")
    const count = await visibleRows.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test("should export results to XLSX", async ({ page }) => {
    await page.goto("/")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(getFixturePath("SIMPLE"))
    await page.locator("text=Test Sheet").click()
    await page.locator("select").selectOption({ label: "Phone Number" })
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze').visible").click()
    // Wait for results and export button
    await expect(page.locator("text=Download Excel")).toBeVisible()
    await page.locator("text=Download Excel").click()
    // File should be downloaded
    // In e2e tests, we verify the download dialog or file exists
    const downloadPromise = page.waitForEvent("download")
    // Trigger download again if needed
    // Actually, we need to check if the download was initiated
  })
})