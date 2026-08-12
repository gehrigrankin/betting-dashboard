import { PageTopbar } from "@/components/layout/page-topbar"
import { ParlayCalculator } from "@/components/parlay/parlay-calculator"

export default function ParlayCalculatorPage() {
  return (
    <>
      <PageTopbar backHref="/dashboard" backLabel="Back to dashboards" />
      <main className="bg-background px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 sm:gap-10">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Parlay odds calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Combine 2-6 American odds legs to see the parlay&apos;s combined
              odds, implied probability, and payout for a given stake.
            </p>
          </header>
          <ParlayCalculator />
        </div>
      </main>
    </>
  )
}
