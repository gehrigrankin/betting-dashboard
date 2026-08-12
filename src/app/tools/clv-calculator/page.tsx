import { ClvCalculator } from "@/components/tools/clv-calculator"
import { PageTopbar } from "@/components/layout/page-topbar"

export default function ClvCalculatorPage() {
  return (
    <>
      <PageTopbar backHref="/dashboard" backLabel="Back to dashboards" />
      <main className="bg-background px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 sm:gap-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Closing line value calculator
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Compare the odds you bet against the closing line to see if you
              beat the market.
            </p>
          </div>

          <ClvCalculator />
        </div>
      </main>
    </>
  )
}
