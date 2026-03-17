export default function DashboardLoading() {
  return (
    <main className="bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
            <div className="h-4 w-64 animate-pulse rounded bg-white/6" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-lg bg-white/10" />
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-white/6" />
              <div className="mt-2 h-9 w-16 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-72 animate-pulse rounded bg-white/6" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-panel rounded-2xl p-5">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-white/6" />
                    <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
                  </div>
                  <div className="h-4 w-20 animate-pulse rounded bg-white/6" />
                </div>
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/6" />
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/6" />
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-white/6" />
                  <div className="h-6 w-16 animate-pulse rounded-full bg-white/6" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
