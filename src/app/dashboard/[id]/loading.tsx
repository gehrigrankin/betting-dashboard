export default function DashboardDetailLoading() {
  return (
    <main className="bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-white/10" />
          <div className="h-4 max-w-2xl animate-pulse rounded bg-white/6" />
          <div className="flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-white/6" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-white/6" />
          </div>
        </header>

        <div className="glass-panel rounded-2xl p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-white/6" />
          <div className="mt-4 flex gap-2">
            <div className="h-11 flex-1 animate-pulse rounded-xl bg-white/6" />
            <div className="h-11 w-24 animate-pulse rounded-xl bg-white/10" />
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass-panel rounded-2xl p-5"
              style={{
                gridColumn: i === 1 ? "span 7" : i === 2 ? "span 7" : i === 3 ? "span 5" : "span 5",
              }}
            >
              <div className="h-4 w-28 animate-pulse rounded bg-white/6" />
              <div className="mt-2 h-6 w-20 animate-pulse rounded bg-white/10" />
              <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/6" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
