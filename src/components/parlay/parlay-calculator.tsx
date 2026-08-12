"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateParlay, MAX_PARLAY_LEGS, MIN_PARLAY_LEGS } from "@/lib/parlay-calc"
import { formatSigned } from "@/lib/sports-provider/normalize"

const DEFAULT_LEGS = Array.from({ length: MIN_PARLAY_LEGS }, () => "")

export function ParlayCalculator() {
  const [legs, setLegs] = useState<string[]>(DEFAULT_LEGS)
  const [stake, setStake] = useState("100")

  const result = useMemo(() => calculateParlay(legs, stake), [legs, stake])

  const updateLeg = (index: number, value: string) => {
    setLegs((current) => current.map((leg, i) => (i === index ? value : leg)))
  }

  const addLeg = () => {
    setLegs((current) =>
      current.length < MAX_PARLAY_LEGS ? [...current, ""] : current
    )
  }

  const removeLeg = (index: number) => {
    setLegs((current) =>
      current.length > MIN_PARLAY_LEGS
        ? current.filter((_, i) => i !== index)
        : current
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <section className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Legs</h2>
          <Button
            disabled={legs.length >= MAX_PARLAY_LEGS}
            onClick={addLeg}
            type="button"
            variant="outline"
          >
            <Plus className="size-4" />
            Add leg
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {legs.map((leg, index) => (
            <div className="flex items-center gap-2" key={index}>
              <span className="w-12 shrink-0 text-sm font-medium text-muted-foreground">
                Leg {index + 1}
              </span>
              <input
                aria-label={`Leg ${index + 1} American odds`}
                className="field-surface h-11 w-full rounded-xl px-3 py-1.5 text-sm"
                onChange={(event) => updateLeg(index, event.target.value)}
                placeholder="e.g. -110 or +150"
                value={leg}
              />
              <button
                aria-label={`Remove leg ${index + 1}`}
                className="glass-chip shrink-0 rounded-lg p-2 text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                disabled={legs.length <= MIN_PARLAY_LEGS}
                onClick={() => removeLeg(index)}
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <label className="max-w-xs space-y-2 text-sm">
          <span className="font-medium">Stake ($)</span>
          <input
            className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
            min="0"
            onChange={(event) => setStake(event.target.value)}
            step="any"
            type="number"
            value={stake}
          />
        </label>
      </section>

      <section className="glass-panel-strong flex flex-col gap-4 rounded-2xl p-5">
        <h2 className="text-base font-semibold tracking-tight">Parlay result</h2>
        {result ? (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">American odds</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {formatSigned(result.americanOdds, 0)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Decimal odds</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {result.decimalOdds.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Implied probability</dt>
              <dd className="mt-1 text-lg font-semibold">
                {(result.impliedProbability * 100).toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payout</dt>
              <dd className="mt-1 text-lg font-semibold">
                ${result.payout.toFixed(2)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Profit</dt>
              <dd className="mt-1 text-lg font-semibold text-primary">
                ${result.profit.toFixed(2)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter {MIN_PARLAY_LEGS}-{MAX_PARLAY_LEGS} valid American odds legs
            and a stake above zero to see the combined parlay odds and payout.
          </p>
        )}
      </section>
    </div>
  )
}
