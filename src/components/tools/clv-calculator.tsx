"use client"

import { useMemo, useState } from "react"
import { CircleCheck, CircleMinus, CircleX } from "lucide-react"
import { calculateClv, type ClvGrade } from "@/lib/clv-calc"
import { cn } from "@/lib/utils"

const GRADE_COPY: Record<
  ClvGrade,
  { label: string; description: string; icon: typeof CircleCheck; className: string }
> = {
  "beat-closing": {
    label: "Beat the closing line",
    description: "You got a better price than the market settled on. Positive CLV.",
    icon: CircleCheck,
    className: "text-emerald-400",
  },
  matched: {
    label: "Matched the closing line",
    description: "Your price was essentially the same as the closing line.",
    icon: CircleMinus,
    className: "text-amber-300",
  },
  "lost-value": {
    label: "Lost value to the closing line",
    description: "The market moved past you. Negative CLV.",
    icon: CircleX,
    className: "text-rose-400",
  },
}

function OddsField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className="field-surface h-11 w-full rounded-xl px-3 py-1.5 tabular-nums"
        inputMode="text"
        pattern="[+-]?[0-9]*"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

export function ClvCalculator() {
  const [betOdds, setBetOdds] = useState("-110")
  const [closingOdds, setClosingOdds] = useState("-125")
  const [stake, setStake] = useState("100")

  const result = useMemo(
    () => calculateClv(betOdds, closingOdds, stake),
    [betOdds, closingOdds, stake]
  )

  const gradeInfo = result ? GRADE_COPY[result.grade] : null
  const GradeIcon = gradeInfo?.icon
  const hasInput = betOdds.trim() !== "" || closingOdds.trim() !== "" || stake.trim() !== ""

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass-panel space-y-4 rounded-2xl p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Bet details</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            American odds, e.g. -110 or +150.
          </p>
        </div>

        <OddsField
          label="Your odds"
          value={betOdds}
          onChange={setBetOdds}
          placeholder="-110"
        />
        <OddsField
          label="Closing odds"
          value={closingOdds}
          onChange={setClosingOdds}
          placeholder="-125"
        />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Stake ($)</span>
          <input
            className="field-surface h-11 w-full rounded-xl px-3 py-1.5 tabular-nums"
            inputMode="decimal"
            onChange={(event) => setStake(event.target.value)}
            placeholder="100"
            value={stake}
          />
        </label>
      </section>

      <section className="glass-panel flex flex-col justify-center rounded-2xl p-5">
        {result && gradeInfo && GradeIcon ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <GradeIcon className={cn("size-8 shrink-0", gradeInfo.className)} />
              <div>
                <p className={cn("text-3xl font-semibold tabular-nums", gradeInfo.className)}>
                  {result.clvPercent > 0 ? "+" : ""}
                  {result.clvPercent.toFixed(2)}% CLV
                </p>
                <p className="text-sm font-medium text-foreground">{gradeInfo.label}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{gradeInfo.description}</p>

            <div className="glass-chip grid grid-cols-2 gap-3 rounded-xl p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Your decimal odds
                </p>
                <p className="mt-1 tabular-nums text-foreground">
                  {result.betDecimalOdds.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Closing decimal odds
                </p>
                <p className="mt-1 tabular-nums text-foreground">
                  {result.closingDecimalOdds.toFixed(3)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  CLV in dollars (stake × CLV%)
                </p>
                <p className={cn("mt-1 tabular-nums font-medium", gradeInfo.className)}>
                  {result.clvAmount > 0 ? "+" : result.clvAmount < 0 ? "-" : ""}$
                  {Math.abs(result.clvAmount).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {hasInput ? <CircleX className="mt-0.5 size-5 shrink-0 text-rose-400" /> : null}
            <p className="text-sm text-muted-foreground">
              {hasInput
                ? "Check your inputs: American odds must be -100/+100 or beyond (e.g. -110 or +150), and stake must be a positive number."
                : "Enter your odds, the closing odds, and a stake to see your CLV."}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
