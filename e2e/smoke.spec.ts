import { expect, test } from "@playwright/test"

test("home page loads and shows headline", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: /stop doing 50 google searches/i })
  ).toBeVisible()
})

test("dashboard list loads", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(
    page.getByRole("heading", { name: /your dashboards/i })
  ).toBeVisible()
})

test("new dashboard page loads", async ({ page }) => {
  await page.goto("/dashboard/new")
  await expect(
    page.getByRole("heading", { level: 2 })
  ).toBeVisible()
})
