# PLAYER_RECENT_TREND widget — file-by-file flow

This doc traces one widget type (`PLAYER_RECENT_TREND`) from creation → storage → resolution → API → rendering.

---

## 1. Creation: saving a dashboard with a “trend” widget

**Where:** User finishes the builder and submits (e.g. “Save dashboard”).

### `src/lib/dashboard-store.ts`

- **`createStoredDashboardForUser(userId, input)`** (or the public `createStoredDashboard`) is called with a `DashboardWriteInput` that includes:
  - `widgetSpecs: DashboardWidgetSpec[]` — each spec has `id`, `title`, `prompt`, `viewType`, `metric`, `filters`, `presentation`, etc. (see `widget-spec.ts`).
  - `layout`, `scope`, `name`, `description`, etc.
- **`buildWidgetCreateData(input, layoutById, entityType)`** (lines 389–431):
  - If `input.widgetSpecs.length > 0`, it maps each `widgetSpec` to a Prisma widget create payload:
    - **`type`**: for a player-scoped dashboard it sets **`"PLAYER_RECENT_TREND"`** (line 401); for team, `"TEAM_RECENT_FORM"`.
    - **`title`**: from `widgetSpec.title`.
    - **`positionX/Y`**, **`width`**, **`height`**: from `layoutById.get(widgetSpec.id)`.
    - **`config`**: the **entire `DashboardWidgetSpec`** object (so the resolver can read metric, viewType, filters, etc. later).
- **`prisma.dashboard.create(...)`** (lines 446–479):
  - Creates one `Dashboard` row and, in the same transaction, **`widgets: { create: buildWidgetCreateData(...) }`**.
  - So each “trend” widget is stored as a `DashboardWidget` with `type: PLAYER_RECENT_TREND` and `config = <full widget spec JSON>`.

**Takeaway:** The DB doesn’t store “PLAYER_RECENT_TREND” as a black box; it stores that type plus a **spec** in `config` that fully describes the widget (metric, filters, viewType “trend”, etc.).

---

## 2. Reading back: from DB to in-memory dashboard

**Where:** Any code that loads a dashboard by ID (e.g. dashboard view page, share page, copy).

### `src/lib/dashboard-store.ts`

- **`getStoredDashboardByIdForUser(id, userId)`** (or share variant) fetches from Prisma:
  - `dashboard` with `include: { widgets: { orderBy: [...] } }`.
- **`toStoredDashboard(dashboard)`** (lines 188–265):
  - For each **`dashboard.widgets`** entry:
    - **`parseWidgetSpec(widget.config)`** (`widget-spec.ts`): if `config` is a valid spec (e.g. from a dynamic widget), it returns a `DashboardWidgetSpec` and that spec is pushed to **`widgetSpecs`** (with `id`/`title` from the DB row).
    - If parsing fails, the widget is treated as a legacy panel: a `DashboardPanel` is pushed and a **legacy static** spec is created and pushed to `widgetSpecs` so the UI still has something to show.
  - **Layout** is rebuilt from `widget.positionX/Y`, `width`, `height`.
  - Return value is a **`StoredDashboard`**: `{ id, name, description, scope, widgetSpecs, panels, layout, ... }`.

**Takeaway:** When you open a dashboard, the app works with **`StoredDashboard.widgetSpecs`** (array of `DashboardWidgetSpec`). The Prisma `type` (e.g. `PLAYER_RECENT_TREND`) is only used when writing; when reading, the **spec inside `config`** is what drives resolution and UI.

---

## 3. Server-side first paint: resolving widgets on load

**Where:** Dashboard view page (and share page) need resolved data for the initial render.

### `src/app/dashboard/[id]/page.tsx`

- **`getStoredDashboardByIdForUser(id, userId)`** returns the `StoredDashboard` (with `widgetSpecs` and `scope`).
- If **`storedDashboard.scope`** and **`storedDashboard.widgetSpecs.length > 0`**:
  - **`resolveDashboardWidgets(storedDashboard.widgetSpecs, storedDashboard.scope)`** is called (from `widget-resolver.ts`).
- The returned **`ResolvedDashboardWidget[]`** is passed to **`<DashboardBoardView dashboard={storedDashboard} initialWidgets={initialWidgets} />`**.

So the first paint already has resolved widgets (stat value, trend points, etc.) for the current scope.

---

## 4. Resolving a “player trend” spec into chart data

**Where:** Core logic that turns a `DashboardWidgetSpec` + `DashboardScope` into a single `ResolvedDashboardWidget`.

### `src/lib/widget-resolver.ts`

- **`resolveDashboardWidgets(widgetSpecs, scope)`** (lines 1086–1090):
  - Builds a **`ResolverContext`** via **`createResolverContext(scope)`** (lines 52–127):
    - Holds `scope`, strategy definition, and lazy getters: **`getPlayerOverview()`**, **`getTeamGames()`**, **`getCurrentSpot()`**, etc.
    - For a **player** scope, `getPlayerOverview()` will call **`getNbaPlayerOverview(scope.entityId, { name, position, teamId, teamName })`** (sports provider).
  - For each spec, **`resolveWidgetSpec(spec, scope)`** is called (lines 1078–1083), which calls **`resolveSampleWidget(spec, context)`**.

- **`resolveSampleWidget`** (lines 551–683):
  - For our case: **player** scope, **not** scoreboard/standings/injuries/recommendation/road_streak/rest_edge/odds/static_text.
  - So it falls into the **“player” branch** (lines 569–602):
    - **`overview = await context.getPlayerOverview()`** → eventually **`getNbaPlayerOverview(...)`** (see section 5).
    - **`allGames = overview?.gameLogs ?? []`**.
    - **`sample = applyFilters(allGames, spec.filters)`** — filters by completed-only, home/away, last N, etc. (lines 202–231).
    - **`values = sample.map((game) => getPlayerMetricValue(spec.metric, game))`** — e.g. `points` per game (lines 232–250).
    - **`averageValue = average(values)`**.
    - **`recentSample = getRecentGames(sample, 5)`** — last 5 games, most recent first (lines 134–138).
    - Because **`spec.viewType === "trend"`**, the return object (lines 579–602) is:
      - **`viewType: "trend"`**.
      - **`statLabel`** from presentation or **`formatMetricLabel(spec.metric, "player")`** (e.g. “Points”).
      - **`statValue`**: **`formatMetricValue(averageValue, spec.metric, precision)`** (e.g. “24.2”).
      - **`delta`**: e.g. “5 games”.
      - **`trend`**: **`buildTrendFromValues(...)`** (lines 314–319) — an array `{ label, value }[]` from the last 5 games’ metric values, in chronological order (e.g. `G1 … G5`), used by the chart.

**Takeaway:** For a player trend widget, the resolver (1) fetches player overview (game logs) from the sports layer, (2) applies the spec’s filters, (3) computes the main stat and builds a short trend array from recent games. No Prisma widget `type` is used here — only the **spec** (metric, viewType, filters, presentation).

---

## 5. Where game log data comes from: sports provider + cache

**Where:** The resolver’s `getPlayerOverview()` ends up here.

### `src/lib/sports-provider/client.ts`

- **`getNbaPlayerOverview(playerId, fallbackPlayer)`** (lines 411–479):
  - Calls **`fetchJson<EspnPlayerOverviewResponse>(url)`** with:
    - **`url = \`${NBA_WEB_API}/athletes/${playerId}/overview\`**  
      (e.g. `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/<id>/overview`).
  - **`fetchJson`** (lines 220–224) uses **`cachedFetch(url, async () => { ... fetch(url, { next: { revalidate: ... } }) ... })`** — so the HTTP call is wrapped by the in-memory cache.

### `src/lib/sports-cache.ts`

- **`cachedFetch(url, fetcher)`**:
  - If the URL is already in the cache and not expired (TTL 5 minutes), it returns the cached data.
  - Otherwise it runs `fetcher()`, stores the result with `expiresAt = now + TTL_MS`, and returns it.

Back in **`getNbaPlayerOverview`**:
- Parses **`data.gameLog?.events`** and **`data.gameLog?.statistics`** to build **`gameLogs`**: array of **`PlayerGameLog`** with `date`, `isHome`, `opponentId`, `opponentName`, `didWin`, `points`, `rebounds`, `assists`, `minutes`.
- Also returns **`seasonAverages`** (points, rebounds, assists, minutes) from ESPN’s “regular season” split.
- Returns **`{ player, gameLogs, seasonAverages }`** as **`PlayerOverview`**.

**Takeaway:** Player trend data is **live from ESPN’s athlete overview API**, with a short in-memory cache to avoid hammering the API on every resolve.

---

## 6. Client-side: re-resolving when scope changes (e.g. switch player)

**Where:** User changes the entity selector or season on the dashboard view.

### `src/components/dashboard/dashboard-board-view.tsx`

- **`activeScope`** is derived from `scope` + entity search selection + season (lines 79–82).
- **`useEffect`** (lines 89–136):
  - When **`activeScope`** or **`dashboard.widgetSpecs`** or **`retryTrigger`** changes, it **POSTs to `/api/widgets/resolve`** with:
    - **`scope: activeScope`**
    - **`widgetSpecs: dashboard.widgetSpecs`**
  - On success, it sets **`setWidgets(data.widgets)`** (and updates scope/refreshing state).
- So the same **widgetSpecs** (including the one that was stored as `PLAYER_RECENT_TREND`) are re-resolved with the **new** scope (e.g. different player); the resolver again calls `getNbaPlayerOverview` for the new player and rebuilds trend data.

---

## 7. API route: POST /api/widgets/resolve

**Where:** Both server-side first load (share page) and client-side refresh hit this (or call `resolveDashboardWidgets` directly; the board view uses the API).

### `src/app/api/widgets/resolve/route.ts`

- **POST handler** (lines 45–86):
  - **Rate limit**: `checkRateLimit(getRateLimitId(request))` to avoid abuse.
  - **Body**: `{ scope, widgetSpecs }`.
  - **`parseScope(payload.scope)`** validates and returns a **`DashboardScope`** (sport, entityType, entityId, entityName, season, etc.); 400 if invalid.
  - **`widgetSpecs`**: from payload, each element is **`parseWidgetSpec(...)`**-ed; invalid entries are filtered out. If none left, returns **`{ widgets: [] }`**.
  - **`resolveDashboardWidgets(widgetSpecs, scope)`** is called (same resolver as in step 4).
  - Response: **`{ widgets: ResolvedDashboardWidget[] }**.**

**Takeaway:** The API is a thin wrapper: validate scope + specs, call the same resolver used on the server for the initial dashboard load, return resolved widgets (each with `statValue`, `trend`, etc.).

---

## 8. Rendering: from resolved widget to chart

**Where:** The dashboard view renders the list of resolved widgets.

### `src/components/dashboard/dashboard-board-view.tsx`

- Renders **`DynamicWidgetGrid`** (or similar) with **`widgets`** (state that was set from `initialWidgets` or from the resolve API response).
- **`DynamicWidgetGrid`** maps over `widgets` and renders **`DynamicWidgetCard`** for each.

### `src/components/dashboard/dynamic-widget-card.tsx`

- **`DynamicWidgetCard({ widget })`** receives a **`ResolvedDashboardWidget`**.
  - Renders **title**, **subtitle**, and a chip with **`statLabel`**, **`statValue`**, **`delta`** (with `deltaTone` for styling).
  - If **`widget.viewType`** is **`"trend"`** (or `"stat"` / `"comparison"`) and **`widget.trend.length > 0`** (lines 32–38):
    - It renders a wrapper div and **`<TrendChart data={widget.trend} />`**.

### `src/components/dashboard/trend-chart.tsx`

- **`TrendChart({ data })`**:
  - **`data`** is **`TrendPoint[]`**: `{ label: string, value: number }[]` (e.g. `[{ label: "G1", value: 22 }, ...]`).
  - Uses **Recharts**: **`LineChart`** with **`Line dataKey="value"`**, **`XAxis dataKey="label"`**, **`YAxis`**, **`Tooltip`**, **`CartesianGrid`**.
  - So the “last 5 games” trend from the resolver is drawn as a line chart.

**Takeaway:** The **`trend`** array produced by **`buildTrendFromValues`** in the resolver is exactly what **TrendChart** expects; the chart shows the last few games’ metric values (e.g. points) in order.

---

## End-to-end summary (PLAYER_RECENT_TREND)

| Step | File(s) | What happens |
|------|--------|----------------|
| 1. Save | `dashboard-store.ts` | Builder sends `widgetSpecs`; store maps each to DB row with `type: PLAYER_RECENT_TREND` and `config = full spec`. |
| 2. Load | `dashboard-store.ts` | `toStoredDashboard` reads widgets and parses `config` → `widgetSpecs` (specs drive everything from here). |
| 3. First paint | `app/dashboard/[id]/page.tsx` | Calls `resolveDashboardWidgets(storedDashboard.widgetSpecs, scope)` → `initialWidgets` → `DashboardBoardView`. |
| 4. Resolve | `widget-resolver.ts` | For player + trend: `getPlayerOverview()` → game logs; filters + last 5 games → `statValue` + `trend[]`. |
| 5. Data source | `sports-provider/client.ts` + `sports-cache.ts` | `getNbaPlayerOverview(playerId)` fetches ESPN athlete overview (cached 5 min), returns `gameLogs` + season averages. |
| 6. Client refresh | `dashboard-board-view.tsx` | On scope change, POST `/api/widgets/resolve` with same `widgetSpecs` + new scope → `setWidgets(data.widgets)`. |
| 7. API | `app/api/widgets/resolve/route.ts` | Parses scope + specs, calls `resolveDashboardWidgets`, returns `{ widgets }`. |
| 8. UI | `dynamic-widget-card.tsx` + `trend-chart.tsx` | Card shows stat + delta; if `viewType === "trend"` and `trend.length > 0`, **TrendChart** draws Recharts line from `widget.trend`. |

The **Prisma enum value `PLAYER_RECENT_TREND`** is only used when **writing** widgets in `dashboard-store.ts`. Everywhere else (resolver, API, UI) uses the **`DashboardWidgetSpec`** (and its `viewType`, `metric`, `filters`) stored in **`config`**.
