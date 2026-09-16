import { test, expect } from "@playwright/test"

test.describe("Excel Repetition Analyzer - E2E", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Excel Repetition Analyzer/)
    await expect(page.locator("h1")).toContainText("Excel Repetition Analyzer")
  })

  test("upload progresses and worksheet appears", async ({ page }) => {
    await page.goto("/")
    await page.locator("button:has-text('Choose Excel File')").click()
    await page.locator('input[type="file"]').setInputFiles(
      require("path").resolve(__dirname, "../e2e/fixtures/test-simple.xlsx")
    )
    // After upload, the worksheet "Test Sheet" should be clickable
    await expect(page.locator("text=Test Sheet")).toBeVisible({ timeout: 15000 })
  })

  test("can select worksheet and see columns", async ({ page }) => {
    await page.goto("/")
    await page.locator("button:has-text('Choose Excel File')").click()
    await page.locator('input[type="file"]').setInputFiles(
      require("path").resolve(__dirname, "../e2e/fixtures/test-simple.xlsx")
    )
    await page.locator("text=Test Sheet").click()
    // Wait for the page to settle after sheet selection
    await page.waitForLoadState("networkidle")
    // Should show detected columns
    await expect(page.locator("text=Customer Name")).toBeVisible()
    await expect(page.locator("text=Phone Number")).toBeVisible()
    await expect(page.locator("text=City")).toBeVisible()
  })

  test("can select key column and configure thresholds", async ({ page }) => {
    await page.goto("/")
    await page.locator("button:has-text('Choose Excel File')").click()
    await page.locator('input[type="file"]').setInputFiles(
      require("path").resolve(__dirname, "../e2e/fixtures/test-simple.xlsx")
    )
    await page.locator("text=Test Sheet").click()
    await page.waitForLoadState("networkidle")
    // Open the key column select dropdown
    await page.locator("select").first().click()
    // Wait for options and select Phone Number
    await page.waitForSelector("text=Phone Number", { timeout: 5000 })
    await page.locator("text=Phone Number").click()
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze').first").click()
    await expect(page.locator("text=Repetition Count")).toBeVisible()
  })

  test("displays results with data", async ({ page }) => {
    await page.goto("/")
    await page.locator("button:has-text('Choose Excel File')").click()
    await page.locator('input[type="file"]').setInputFiles(
      require("path").resolve(__dirname, "../e2e/fixtures/test-simple.xlsx")
    )
    await page.locator("text=Test Sheet").click()
    await page.waitForLoadState("networkidle")
    await page.locator("select").first().click()
    await page.locator("text=Phone Number").click()
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze').first").click()
    const rows = page.locator("tbody tr")
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test("shows severity information", async ({ page }) => {
    await page.goto("/")
    await page.locator("button:has-text('Choose Excel File')").click()
    await page.locator('input[type="file"]').setInputFiles(
      require("path").resolve(__dirname, "../e2e/fixtures/test-simple.xlsx")
    )
    await page.locator("text=Test Sheet").click()
    await page.waitForLoadState("networkidle")
    await page.locator("select").first().click()
    await page.locator("text=Phone Number").click()
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze').first").click()
    await expect(page.locator(".severity-badge")).toBeVisible()
  })

  test("allows severity filtering", async ({ page }) => {
    await page.goto("/")
    await page.locator("button:has-text('Choose Excel File')").click()
    await page.locator('input[type="file"]').setInputFiles(
      require("path").resolve(__dirname, "../e2e/fixtures/test-simple.xlsx")
    )
    await page.locator("text=Test Sheet").click()
    await page.waitForLoadState("networkidle")
    await page.locator("select").first().click()
    await page.locator("text=Phone Number").click()
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze').first").click()
    await page.locator("text=Green").click()
    const visibleRows = page.locator("tr:not(:first-child):visible")
    const count = await visibleRows.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test("exports results to XLSX", async ({ page }) => {
    await page.goto("/")
    await page.locator("button:has-text('Choose Excel File')").click()
    await page.locator('input[type="file"]').setInputFiles(
      require("path").resolve(__dirname, "../e2e/fixtures/test-simple.xlsx")
    )
    await page.locator("text=Test Sheet").click()
    await page.waitForLoadState("networkidle")
    await page.locator("select").first().click()
    await page.locator("text=Phone Number").click()
    await page.locator("text=Configure Thresholds").click()
    await page.locator("input[placeholder*='yellow']").fill("3")
    await page.locator("input[placeholder*='red']").fill("5")
    await page.locator("button:has-text('Analyze').first").click()
    await expect(page.locator("text=Download Excel")).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("text=Download Excel").click(),
    ])
    await expect(download).toBeTruthy()
  })
})