"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  calculateBankrollRecommendation,
  kellyFractionOptions,
  type KellyFractionPreference,
} from "@/lib/bankroll-calc"

export function BankrollCalculator() {
  const [bankroll, setBankroll] = useState("1000")
  const [odds, setOdds] = useState("-110")
  const [winProbability, setWinProbability] = useState("55")
  const [kellyPreference, setKellyPreference] =
    useState<KellyFractionPreference>("half")

  const result = useMemo(() => {
    const bankrollValue = Number(bankroll)
    const probabilityValue = Number(winProbability) / 100

    return calculateBankrollRecommendation({
      bankroll: bankrollValue,
      odds,
      trueProbability: probabilityValue,
      kellyPreference,
    })
  }, [bankroll, odds, winProbability, kellyPreference])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="glass-panel space-y-5 rounded-2xl p-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">
            Your bet
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter the bankroll, price, and the win probability you believe
            in to get a Kelly-sized stake.
          </p>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Bankroll ($)</span>
          <input
            className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
            inputMode="decimal"
            min={0}
            onChange={(event) => setBankroll(event.target.value)}
            placeholder="1000"
            type="number"
            value={bankroll}
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">American odds</span>
          <input
            className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
            inputMode="numeric"
            onChange={(event) => setOdds(event.target.value)}
            placeholder="-110"
            type="text"
            value={odds}
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Your win probability (%)</span>
          <input
            className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
            inputMode="decimal"
            max={100}
            min={0}
            onChange={(event) => setWinProbability(event.target.value)}
            placeholder="55"
            type="number"
            value={winProbability}
          />
        </label>

        <div className="space-y-2 text-sm">
          <span className="font-medium">Kelly fraction</span>
          <div className="flex flex-wrap gap-2">
            {kellyFractionOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "field-surface rounded-xl px-3 py-2 text-sm transition",
                  kellyPreference === option.value
                    ? "border-primary/40 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_0_1px_rgba(130,164,255,0.24)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setKellyPreference(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel space-y-5 rounded-2xl p-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">
            Recommended stake
          </h2>
          <p className="text-sm text-muted-foreground">
            Based on the {kellyFractionOptions.find((option) => option.value === kellyPreference)?.label.toLowerCase()} sizing rule.
          </p>
        </div>

        {result ? (
          <>
            <div className="glass-chip rounded-2xl p-5 text-center">
              <p className="text-sm text-muted-foreground">Recommended stake</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                ${result.recommendedStake.toLocaleString()}
              </p>
              <p
                className={cn(
                  "mt-2 text-sm",
                  result.hasEdge ? "text-emerald-400" : "text-rose-300"
                )}
              >
                {result.hasEdge
                  ? "You have an edge on this price."
                  : "No edge at this price — stake is $0."}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <ResultStat label="Decimal odds" value={result.decimalOdds.toFixed(2)} />
              <ResultStat
                label="Implied probability"
                value={`${(result.impliedProbability * 100).toFixed(2)}%`}
              />
              <ResultStat
                label="Your edge"
                value={`${(result.edge * 100).toFixed(2)}%`}
              />
              <ResultStat
                label="EV per $1"
                value={`$${result.expectedValuePerDollar.toFixed(4)}`}
              />
              <ResultStat
                label="Full Kelly fraction"
                value={`${(result.fullKellyFraction * 100).toFixed(2)}%`}
              />
              <ResultStat
                label="Applied fraction"
                value={`${(result.appliedFraction * 100).toFixed(2)}%`}
              />
            </dl>
          </>
        ) : (
          <div className="glass-chip rounded-2xl p-5 text-sm text-muted-foreground">
            Enter a positive bankroll, valid American odds, and a win
            probability between 0 and 100 to see a recommendation.
          </div>
        )}
      </section>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-surface rounded-xl px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  )
}
