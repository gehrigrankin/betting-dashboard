import { expect, test, type Page, type Route } from "@playwright/test"

type FixtureAlert = {
  id: string
  dashboardId: string | null
  type: string
  config: Record<string, unknown>
  createdAt: string
}

const POPULATED_ALERTS: FixtureAlert[] = [
  {
    id: "alert-line-move",
    dashboardId: "dash-fixture-1",
    type: "line_move",
    config: {},
    createdAt: "2025-06-15T12:00:00.000Z",
  },
  {
    id: "alert-price-threshold",
    dashboardId: null,
    type: "price_threshold",
    config: {},
    createdAt: "2025-06-10T12:00:00.000Z",
  },
]

/** Locates the "Your alerts" section rendered on the dashboard list page. */
function alertsSection(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Your alerts" }) })
}

async function mockAlertsResponse(page: Page, alerts: FixtureAlert[]) {
  await page.route("**/api/alerts", async (route) => {
    await route.fulfill({ json: { alerts } })
  })
}

test.describe("alert widget visual regression", () => {
  test("populated state matches design intent", async ({ page }) => {
    await mockAlertsResponse(page, POPULATED_ALERTS)
    await page.goto("/dashboard")
    await expect(page.getByText("Notify when line moves")).toBeVisible()

    await expect(alertsSection(page)).toHaveScreenshot(
      "alerts-populated.png"
    )
  })

  test("empty state matches design intent", async ({ page }) => {
    await mockAlertsResponse(page, [])
    await page.goto("/dashboard")
    await expect(page.getByText("No alerts yet")).toBeVisible()

    await expect(alertsSection(page)).toHaveScreenshot("alerts-empty.png")
  })

  test("loading state matches design intent", async ({ page }) => {
    let releaseResponse!: () => void
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve
    })
    await page.route("**/api/alerts", async (route: Route) => {
      await responseGate
      await route.fulfill({ json: { alerts: [] } })
    })

    await page.goto("/dashboard")
    await expect(
      page.locator('[aria-label="Loading alerts"]')
    ).toBeVisible()

    await expect(alertsSection(page)).toHaveScreenshot("alerts-loading.png")

    releaseResponse()
  })
})
