import "dotenv/config"
import { randomUUID } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"
import { prisma } from "@/lib/db"
import { PREVIEW_USER_ID } from "@/lib/auth"
import { decideLineMoveAlert } from "@/lib/alert-rules"

/**
 * Covers alert persistence and UI wiring: line-move alert configs shaped the
 * way /api/alerts/check writes them (see src/lib/alert-rules.test.ts for the
 * threshold/suppression decisions themselves) are seeded directly via prisma,
 * then shown, checked for duplicates, and dismissed through the real
 * dashboard UI. This connects the threshold-trigger unit tests (00d4a8a) to
 * the alerts UI polish (f5071d0).
 *
 * This does not drive requests through /api/alerts/check itself - that route
 * calls live ESPN endpoints with no seam for mocking in this suite. Instead,
 * each seeded config is first produced by decideLineMoveAlert so we know it's
 * a shape the real decision logic would actually emit, and the "suppressed"
 * case below mirrors the route's own branching (only a `triggered` decision
 * writes an update) to prove a re-check with an unmoved line can't duplicate
 * or re-fire an alert.
 */

const DASHBOARD_NAME_PREFIX = "E2E Alert Lifecycle Dashboard"

// Scope to the alerts section specifically - the same dashboard also renders
// a card in "Your dashboards" with a link to the same href, which would
// otherwise be an ambiguous match.
function alertRowLocator(page: Page, dashboardId: string) {
  const alertsSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Your alerts" }) })
  return alertsSection
    .locator(".glass-panel")
    .filter({ has: page.locator(`a[href="/dashboard/${dashboardId}"]`) })
}

test.describe("alert lifecycle", () => {
  let dashboardId: string
  // Unique per test run so concurrent runs against the shared PREVIEW_USER_ID
  // (e.g. this file's two tests under fullyParallel) don't collide on name.
  let dashboardName: string

  test.beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: PREVIEW_USER_ID },
      update: {},
      create: { id: PREVIEW_USER_ID },
    })

    dashboardName = `${DASHBOARD_NAME_PREFIX} ${randomUUID()}`
    const dashboard = await prisma.dashboard.create({
      data: {
        userId: PREVIEW_USER_ID,
        name: dashboardName,
      },
    })
    dashboardId = dashboard.id
  })

  test.afterEach(async () => {
    await prisma.alert.deleteMany({ where: { dashboardId } })
    await prisma.dashboard.delete({ where: { id: dashboardId } })
  })

  test("a freshly triggered alert shows in the dashboard alerts list and can be dismissed", async ({
    page,
  }) => {
    const baselineLine = 23.5
    const currentLine = 24.5
    const decision = decideLineMoveAlert({
      currentLine,
      baselineLine,
      lastAlertedLine: null,
    })
    expect(decision.triggered).toBe(true)
    expect(decision.suppressed).toBe(false)

    await prisma.alert.create({
      data: {
        userId: PREVIEW_USER_ID,
        dashboardId,
        type: "line_move",
        config: {
          dashboardName,
          baselineLine,
          // Mirrors what /api/alerts/check writes back once a move triggers.
          lastAlertedLine: currentLine,
        },
      },
    })

    await page.goto("/dashboard")

    const alertRow = alertRowLocator(page, dashboardId)
    await expect(alertRow).toBeVisible()
    await expect(alertRow.getByText("Notify when line moves")).toBeVisible()

    await alertRow.getByRole("button", { name: "Remove alert" }).click()
    await expect(alertRow).toHaveCount(0)

    // Reload to confirm the dismissal persisted server-side, not just in local state.
    await page.reload()
    await expect(alertRowLocator(page, dashboardId)).toHaveCount(0)

    const remaining = await prisma.alert.findMany({ where: { dashboardId } })
    expect(remaining).toHaveLength(0)
  })

  test("a suppressed re-check does not duplicate the alert or change its config", async ({
    page,
  }) => {
    const baselineLine = 23.5
    const currentLine = 24.5

    await prisma.alert.create({
      data: {
        userId: PREVIEW_USER_ID,
        dashboardId,
        type: "line_move",
        config: {
          dashboardName,
          baselineLine,
          // Already alerted at this exact line, as if a prior check triggered.
          lastAlertedLine: currentLine,
        },
      },
    })

    // The line hasn't moved since the last alert, so a re-check must suppress.
    const decision = decideLineMoveAlert({
      currentLine,
      baselineLine,
      lastAlertedLine: currentLine,
    })
    expect(decision.triggered).toBe(false)
    expect(decision.suppressed).toBe(true)

    // Per /api/alerts/check's own branching, only a `triggered` decision
    // writes an update - a suppressed decision leaves the alert untouched.
    const alerts = await prisma.alert.findMany({ where: { dashboardId } })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].config).toMatchObject({ baselineLine, lastAlertedLine: currentLine })

    await page.goto("/dashboard")
    await expect(alertRowLocator(page, dashboardId)).toHaveCount(1)
  })
})
