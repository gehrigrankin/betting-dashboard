import { BankrollCalculator } from "@/components/dashboard/bankroll-calculator"
import { PageTopbar } from "@/components/layout/page-topbar"

export default function BankrollCalculatorPage() {
  return (
    <>
      <PageTopbar backHref="/dashboard" backLabel="Back to dashboards" />
      <main className="bg-background px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:gap-10">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight">
              Bankroll calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Size your stake with a fractional Kelly criterion based on your
              bankroll, the price, and your win probability.
            </p>
          </header>

          <BankrollCalculator />
        </div>
      </main>
    </>
  )
}
