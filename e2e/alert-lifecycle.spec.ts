import "dotenv/config"
import { expect, test } from "@playwright/test"
import { prisma } from "@/lib/db"
import { PREVIEW_USER_ID } from "@/lib/auth"
import { decideLineMoveAlert } from "@/lib/alert-rules"

/**
 * Covers the alert lifecycle end to end: a line-move alert that the threshold
 * logic (see src/lib/alert-rules.test.ts) decides should fire, persisted the
 * same way /api/alerts/check persists it, then shown and dismissed through
 * the real dashboard UI. This is what connects the threshold-trigger unit
 * tests (00d4a8a) to the alerts UI polish (f5071d0) - neither change alone
 * proves an alert actually reaches the user.
 */

test.describe("alert lifecycle", () => {
  let dashboardId: string

  test.beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: PREVIEW_USER_ID },
      update: {},
      create: { id: PREVIEW_USER_ID },
    })

    const dashboard = await prisma.dashboard.create({
      data: {
        userId: PREVIEW_USER_ID,
        name: "E2E Alert Lifecycle Dashboard",
      },
    })
    dashboardId = dashboard.id

    const baselineLine = 23.5
    const currentLine = 24.5
    const decision = decideLineMoveAlert({
      currentLine,
      baselineLine,
      lastAlertedLine: null,
    })
    expect(decision.triggered).toBe(true)

    await prisma.alert.create({
      data: {
        userId: PREVIEW_USER_ID,
        dashboardId,
        type: "line_move",
        config: {
          dashboardName: dashboard.name,
          baselineLine,
          // Mirrors what /api/alerts/check writes back once a move triggers.
          lastAlertedLine: currentLine,
        },
      },
    })
  })

  test.afterEach(async () => {
    await prisma.alert.deleteMany({ where: { dashboardId } })
    await prisma.dashboard.delete({ where: { id: dashboardId } }).catch(() => {})
  })

  test("a triggered alert shows in the dashboard alerts list and can be dismissed", async ({
    page,
  }) => {
    await page.goto("/dashboard")

    // Scope to the alerts section specifically - the same dashboard also renders
    // a card in "Your dashboards" with a link to the same href, which would
    // otherwise be an ambiguous match.
    const alertsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Your alerts" }) })
    const alertRow = alertsSection
      .locator(".glass-panel")
      .filter({ has: page.locator(`a[href="/dashboard/${dashboardId}"]`) })

    await expect(alertRow).toBeVisible()
    await expect(alertRow.getByText("Notify when line moves")).toBeVisible()

    await alertRow.getByRole("button", { name: "Remove alert" }).click()
    await expect(alertRow).toHaveCount(0)

    // Reload to confirm the dismissal persisted server-side, not just in local state.
    await page.reload()
    await expect(
      alertsSection.locator(`a[href="/dashboard/${dashboardId}"]`)
    ).toHaveCount(0)

    const remaining = await prisma.alert.findMany({ where: { dashboardId } })
    expect(remaining).toHaveLength(0)
  })
})
