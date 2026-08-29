# Web ↔ iOS Parity — Slice A+B: Mobile Shell, Design System, PWA, and Dashboard

**Date:** 2026-08-06
**Status:** Approved design, ready for implementation planning
**Repo:** `glucose-monitor-fe`

## 1. Why

The iOS app (`glucose-monitor-iphone`) will go to focus-group testing before App Store
release. Distributing it natively requires a paid Apple Developer membership and
TestFlight; the web app is the vehicle that routes around that. Testers install the web
app on their own phones and exercise it as if it were the native app.

That purpose sets the bar: feedback gathered on the web app has to transfer to the iOS
app. A "mobile-friendly version of the website" would not clear that bar. The web app has
to mirror the iOS app's structure, layout, and interaction model closely enough that a
tester's reaction to the web app is a reaction to the iOS design.

## 2. Where the two apps stand today

**iOS** — SwiftUI, four-tab shell (`ContentView.swift:15`): Dashboard, Notes, Experiments,
Settings. Plus onboarding, AR food scanner, bedside mode, extended forecast, AI insights,
ISF suggestions, long-acting and activity entry, and a full Experiments + Verification
suite.

**Web** — React 18 / CRA / TypeScript / Tailwind / Recharts. One screen:
`JwtLoginForm` → `EnhancedDashboard.tsx` (1035 lines). It is a desktop kiosk layout: the
root is `h-[100dvh] overflow-hidden`, so on a phone nothing scrolls — content compresses
until unreadable — and the metrics bar is a 5-column grid at roughly 55 px per column.
Everything beyond the dashboard lives in modals. There is no PWA manifest and roughly
70 responsive utility classes across the whole component tree.

The web app has one of iOS's four tabs, and that one is laid out for a monitor.

## 3. Decomposition

Full parity is too large for one spec. The work is cut into seven independently shippable
slices. **This spec covers A + B only.**

| Slice | Content | Depends on |
|---|---|---|
| **A** | Mobile shell, iOS design system, PWA | — |
| **B** | Dashboard rebuilt mobile-first, including missing extras | A |
| C | Notes tab, full parity | A |
| D | Settings tab rebuilt + onboarding/registration (see §14.1 for the interim host) | A |
| E | Experiments + Verification suite | A |
| F | Photo capture → nutrition analysis | A |
| G | Web Push + experiment alarms | A, E |

Slices C–G each get their own spec → plan → implementation cycle. A+B was chosen as the
first slice because it is the first genuinely demoable one: a tester can install it and use
the screen they will spend most of their time on, and the design system gets validated
against real content rather than stubs.

## 4. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Primary goal | Feature parity with iOS | Web is the focus-group stand-in for the native app |
| Form factor | Mobile-first; desktop renders as a centered phone-width column | One layout to build and maintain; matches the mirroring goal |
| Design system | Hand-rolled iOS tokens + primitives in Tailwind | Stack is already Tailwind; exact fidelity needs pixel control, not a library's approximation; the primitive set is small |
| Build tool | Migrate CRA → Vite | `vite-plugin-pwa` versus hand-wiring Workbox on CRA 5, which dropped built-in SW registration; faster dev loop; CRA is unmaintained |
| Delivery | Installable PWA with Web Push | Home-screen install gives a chrome-free shell; Web Push on iOS 16.4+ requires installation |
| Sheets | Real routes, not component state | The web has a Back button iOS does not; see §5.2 |
| Client error logging | In scope | Turns vague tester reports into stack traces |

Rejected: Konsta UI / Ionic React (permanent large dependency whose iOS theme is a flavor
to fight, not a match); responsive-retrofitting the existing dashboard (does not mirror
iOS, leaves the 1035-line component intact, and findings would not transfer).

## 5. Architecture

### 5.1 Shell

The iOS app does **not** use stock iOS chrome. Its design language is *floating capsules
and cards on a grey field*, and the shell must reproduce that, not UIKit defaults.

```
AppShell
├── CapsuleToolbar   floating, top-right, per-screen actions
├── LargeTitle       per-screen; absent on Dashboard
├── <Outlet/>        active tab screen, scrolls *under* the tab bar
├── CapsuleTabBar    floating, inset from all edges
└── SheetOutlet      sheet routes presented over the active tab
```

- **Capsule toolbar** — white, fully rounded, detached from the screen edge, dropped over
  the content with a soft shadow. Top-right. Holds only icon actions. It is *not* a nav
  bar: no full-width background, no bottom hairline, no title inside it.
- **Large title** — approx. 34 px, weight 800, tight tracking, left-aligned black, in the
  content flow above the first card. Present on Notes, Experiments and Settings; the
  Dashboard has **no title** and starts directly with the glucose card.
- **Capsule tab bar** — white, fully rounded, inset roughly 14 px from left, right and
  bottom, floating with a shadow. Content scrolls underneath and remains partly visible
  behind it, so every scroll container carries bottom padding equal to the tab bar height
  plus its inset. The selected tab sits in a light grey rounded-rect pill with icon and
  label in system blue; unselected labels are **black**, not grey.

`viewport-fit=cover` in the viewport meta tag; `env(safe-area-inset-*)` for the notch and
home indicator, added to the tab bar's own inset. On viewports wider than the phone
breakpoint the shell is centered at phone width on a neutral field — desktop is supported,
not designed for.

### 5.2 Routing

Tabs: `/dashboard`, `/notes`, `/experiments`, `/settings`. Notes and Experiments are stub
screens in this slice, filled in by slices C and E. Settings is a **thin host**, not an
empty stub — see §14.1.

Sheets are routes presented over the tab that opened them:

```
/dashboard/note/new     /dashboard/note/:id     /dashboard/scan
/dashboard/ai           /dashboard/nutrition    /dashboard/activity
/dashboard/long-acting  /dashboard/forecast     /dashboard/version
```

Full-screen cover, no tab bar: `/bedside`.

iOS keeps sheets in component state because it has no Back button. On the web, sheets as
pure state means a tester pressing Back mid-note-entry is thrown out of the tab and loses
their input. Routing them costs a little plumbing and buys correct Back behavior and
shareable deep links. Closing a sheet is a history pop, so the swipe-down gesture and the
Back button stay consistent with each other.

### 5.3 Module structure

`services/` is deliberately untouched — the API layer works and is not what is broken.

```
src/
  app/
    App.tsx                    router + providers only
    routes.tsx                 tab routes + sheet routes
    shell/  AppShell · TabBar · NavBar · SheetOutlet
  ui/                          design system, no app logic
    tokens.css
    Sheet · Card · ListRow · SegmentedControl · Toggle · Button · PullToRefresh
  features/
    dashboard/
      DashboardScreen.tsx      composition only
      cards/   IsfSuggestion · ActiveExperiment · CompactGlucose ·
               GlucoseChart · RecentNotes · SensorAlarms · QuickActions
      sheets/  NoteEditor · Scan · AI · Nutrition · Activity ·
               LongActing · Forecast · Version
    settings/SettingsHost.tsx    interim host, see §14.1
    notes/NotesStub.tsx          filled in slice C
    experiments/ExperimentsStub.tsx  filled in slice E
    bedside/BedsideScreen.tsx
  state/
    GlucoseStore.tsx
  services/                    unchanged
```

Every file stays under the 500-line limit in `CLAUDE.md`. The 1035-line
`EnhancedDashboard` becomes a composition over seven cards that can each be read and
tested alone.

## 6. Design system

**Source of truth: screenshots of the running iOS app**, not the platform's defaults and
not inference from `ContentView.swift`. The first pass at this design assumed stock iOS
chrome and was wrong in several ways — bordered nav bar instead of a floating capsule,
stacked COB/IOB tiles instead of a nested right-hand panel, a 60-minute prediction instead
of the 2-hour one. Where this spec and the platform's conventions disagree, the app wins.

Tokens below are the values read off those screenshots.

**Action for the implementation plan:** the four reference screenshots (Dashboard, Notes,
Experiments, Settings) should be committed to
`docs/superpowers/specs/reference/2026-08-06-ios/` so implementers and reviewers compare
against a fixed artifact rather than a chat attachment. The values in this section are
approximations read by eye; where a measurement disagrees with the image, the image wins.
Only these four screens are covered — sheets, the scan flow, bedside mode and the lower
half of the dashboard have no reference capture yet, and the plan should flag that the
components built for them are unverified against the real app.

- **System colors:** blue `#007AFF`, green `#34C759`, orange `#FF9500`, red `#FF3B30`,
  purple `#AF52DE`, indigo `#5856D6`.
- **Backgrounds:** grouped `#F2F2F7`, elevated `#FFFFFF`; separator `#C6C6C8`.
- **Labels:** primary `#000000`, secondary 60% opacity, tertiary 30%.
- **Type scale:** 34 px/800 large title, 22 px/700 card title, 17 px body, 15 px
  subheadline, 13 px caption, 11 px label; hero glucose numerics ~56 px/700 with tracking
  around −1.5 px.
- **Radii:** 20 px cards, 14 px nested panels, 28 px capsules (toolbar, tab bar), fully
  rounded status and metric pills.
- **Elevation:** cards carry a near-flat shadow; the floating capsules carry a visibly
  deeper one, since they must read as hovering above scrolling content.
- **Font stack:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
  system-ui, sans-serif`. On iOS Safari this resolves to actual SF Pro, so testers read
  the same typeface as the native app at no cost.

The existing `glucose.{low,normal,high,critical}` colors in `tailwind.config.js` are kept
— those are domain semantics, not chrome.

## 7. Dashboard composition

Card order mirrors `DashboardView.swift`, top to bottom:

1. **ISF suggestion banner** — conditional. Server `show` flag AND local time in
   05:00–11:00 AND non-empty proposal lines. Apply / Not now actions.
2. **Active experiment card** — conditional on an active experiment; opens the run sheet.
3. **Glucose card** — two-column. Left: the labels `Now` and `2h forecast` side by side
   over a single baseline row of *current value → trend arrow → forecast value → unit*,
   all three numerics tinted by glucose state; beneath them a filled status pill
   (`Normal`) and a grey relative-time line (`Updated 10 min, 44 secs ago`). Right: a
   **nested grey rounded panel** holding COB and IOB as icon + coloured label + bold black
   value — orange for COB, indigo for IOB. Not stacked tiles, not full width.
4. **Forecast chart card** — titled `Forecast (4h)`. A shaded green target band; solid blue
   history continuing into a dashed blue prediction from "now"; filled orange point
   markers with their value printed alongside; solid green vertical lines at note times
   with a black dashed line at the current time; yellow rounded carb pills (`25g`) along
   the top edge; pale blue rounded insulin bars along the bottom with unit counts above
   them; y-axis 0–20 and a time x-axis.
5. **Recent notes (12 h)** — header row carries the title plus a scan-frame icon and a
   filled blue circular add button. Each row: green status dot, bold title, blue `Del`
   action right-aligned, absolute timestamp (`6 Aug at 2:24 PM`), then a tinted quantity
   pill (orange for carbs, indigo for insulin), a droplet glyph, and the glucose value at
   entry. Hairline separators between rows, inset past the dot.
6. **Sensor & alarms bar** — only when `dataSource === "libre"`.
7. **Quick actions** — add note, scan, AI, activity.
8. **Global error footnote**, when set.

Capsule toolbar actions: refresh, bedside mode, add note. Pull-to-refresh on the scroll
view.

Card 3's forecast horizon (2 h) and card 4's window (4 h) are different numbers and both
are deliberate — they are read from the app, not a transcription slip.

### 7.1 Other tabs — visual contracts for later slices

Recorded now while the screenshots are in hand, so slices C–E inherit the design rather
than re-deriving it:

- **Notes (slice C)** — large title; toolbar capsule holds activity, scan and add. A
  *single* card contains every row, rather than one card per note. Row: bold title left,
  relative age right (`4 min, 19 secs`), then a type glyph with quantity and a droplet with
  the glucose value, and an optional grey detail line (`sesame cookies | GI 60`).
- **Experiments (slice E)** — large title; toolbar capsule holds refresh only. An intro
  card, then a `Available Experiments` section heading, then one card per experiment.
  Available cards are white with a blue border and a green check, and end in a blue
  `Start →`. **Locked cards are fully greyed out** with a lock glyph and an orange
  prerequisite line (`Complete a successful Basal Rate Check first`). The gating chain is
  part of the design, not a runtime detail.
- **Settings (slice D)** — large title; separate floating cards per group rather than one
  grouped list. Single-row cards (`Backend → Remote`, `Data Source → LibreLinkUp`) lead
  with a coloured rounded-square icon. A grey sentence-case `User Settings` label
  introduces a multi-row card where each row is a name, an optional grey unit/range
  subtitle (`mmol/L per unit * 05:00 - 11:00`), and a right-aligned value.

## 8. State and data flow

Today the dashboard fetches in five separate `useEffect`s
(`EnhancedDashboard.tsx:271`, `:393`, `:453`, `:469`, `:497`), each re-implementing
*current reading → history → calculations*. `GlucoseStore` centralizes this, mirroring
`AppState.swift`.

**State:** `currentReading`, `glucoseHistory`, `calculations`, `calculationsStale`,
`notes`, `sensorInfo`, `insulinPrefs`, `dataSource`, `preferredGlucoseUnit`, `isLoading`,
`errorMessage`, `lastGlucoseRefresh`.

**Actions:** `refreshAll()`, `refreshGlucoseOnly({ silent, forceServerSync })`,
`fetchNotes()`, `createNote()`, `updateNote()`.

Two behaviors ported deliberately, load-bearing on iOS and absent on web:

- **Request coalescing.** iOS holds `fullRefreshTask` / `glucoseRefreshTask` handles so
  overlapping refreshes dedupe. Web equivalent: a promise ref per refresh kind; an
  in-flight call returns the existing promise instead of firing a second round trip.
- **Auth-generation guard.** iOS bumps `authGeneration` so a response landing after
  logout cannot write into state. Without it the web app has a real bug: logging out with
  a fetch in flight repopulates the dashboard. Same counter, checked before every state
  write.

**Refresh triggers:**

| iOS | Web |
|---|---|
| `.onAppear` / post-auth | mount + auth transition |
| 5-minute `autoRefreshTask` | interval, paused while document hidden |
| tab switch → Dashboard | route change to `/dashboard`, `forceServerSync` |
| `scenePhase .active`, >45 s elapsed | `visibilitychange` → visible, same 45 s threshold |
| `.refreshable` | pull-to-refresh |
| `BGTaskScheduler` background fetch | no equivalent — see §12 |

**The 1 Hz tick.** iOS scopes it with `TimelineView(.periodic(by: 1))`, so only the
glucose card re-renders. The web version currently calls `setNowTick(Date.now())` at the
top of the 1035-line component (`EnhancedDashboard.tsx:497`), re-rendering the entire
dashboard — Recharts included — every second. In the new structure the clock lives inside
`CompactGlucoseCard` and nothing else subscribes to it.

## 9. PWA

- **Manifest:** standalone display, theme and background colors from the token set, icons
  at 180 / 192 / 512 px plus a maskable variant.
- **Service worker** via `vite-plugin-pwa` (Workbox): precache the app shell; API GETs use
  network-first with a short-lived fallback so a cold open shows last-known values rather
  than a blank screen.
- **Never cached:** authentication responses and all mutations.

**Safety rule — a cached glucose reading must never render as if it were current.** This is
a diabetes app; a stale number presented as live is a safety problem, not a cosmetic one.
iOS already models this with `calculationsStale`. Every render path that can show cached
data carries its reading timestamp and switches to explicit stale treatment past the
threshold. Offline state is always shown, never silently absorbed.

## 10. Error handling

- **Error boundaries per tab screen.** `NightscoutErrorBoundary` is kept and moved to wrap
  each screen, so one card throwing cannot white-screen a tester's session.
- **Cards own their states.** Each card renders its own loading / empty / error, so a
  failed calculations call degrades that card while the glucose card keeps working. Global
  failures render as a footnote at the bottom of the scroll, mirroring iOS.
- **Network loss** → last-known values with the stale treatment from §9.
- **401** → the existing `authService` refresh path runs first; on hard failure, route to
  sign-in preserving the intended route so the tester returns to where they were.
- **Backend unreachable** → the precached shell still boots and offers retry.

### 10.1 Client error logging

Boundary catches and unhandled promise rejections are POSTed to the backend.

**Payload:** app version, route, error name, message, stack, user agent, timestamp,
anonymous session id.

**Never included:** glucose values, note text, food photos, usernames, email addresses, or
any request/response body. This is health data; the error channel must not become a side
door around that. Messages and stacks are length-capped, and the client rate-limits to
avoid flooding the endpoint during a render loop.

**Cross-repo dependency:** no client-log endpoint exists on the backend today. This
requires a new `POST /api/client-errors` in `glucose-monitor-be` — a separate repository.
That backend change must land before the frontend logging is enabled; until it does, the
client-side capture is built but its transport is disabled behind a flag. Implementation
planning must treat this as an external dependency, not an assumption.

## 11. Testing

Vite brings **Vitest**, whose API is Jest-compatible, so existing tests port with near-zero
rewriting.

- **Unit (mock-first, per `CLAUDE.md`):** `GlucoseStore` reducer, request coalescing, and
  the auth-generation guard. Highest-risk pieces — both race-sensitive and both fine under
  manual testing while broken under concurrency.
- **Component:** each of the seven cards across loading / empty / error / data.
- **Integration:** `DashboardScreen` over mocked services — full refresh cycle,
  visibility-change refresh, and the 45 s threshold.
- **Named safety test:** a cached reading past the stale threshold must render stale
  treatment. Explicit and named, not implied by a snapshot.
- **Error logging:** asserts the payload contains no glucose values, note text, or
  usernames.
- **Existing tests:**
  - `hybridNotesApi.test.ts` — survives untouched.
  - `EnhancedDashboard.mainpage.test.tsx` — targets a component being replaced. Its
    assertion (main sections and recent notes present on first load) is **ported** to
    `DashboardScreen`, not dropped.
  - `Dashboard-NightscoutConfig.integration.test.tsx` — imports `Dashboard` (line 5), one
    of the dead components in §14, so it is **deleted with it**. It has been exercising a
    component no user could reach, which is why its passing status carried no signal. Its
    intent — that data-source configuration opens, saves, surfaces save errors, populates
    from existing config, and tests the connection before saving — is **re-targeted at
    `DataSourceConfigModal` mounted through the Settings host** (§14.1), so the coverage
    survives against code that actually ships.
  - `NightscoutConfigModal.simple.test.tsx` — asserts only that the test harness renders
    and jest-dom matchers are present. It is superseded by Vitest's own setup and is
    deleted.
- **Manual acceptance gate:** install the PWA on a real iPhone and compare side-by-side
  against the native app. iOS Safari home-screen install cannot be automated, and this is
  the check that actually matters for a UX focus group.

## 12. Known divergences from iOS

These are permanent platform limits, not deferred work. They are recorded so later slices
are designed against reality.

- **No background refresh.** iOS refreshes via `BGTaskScheduler`. The web has no
  equivalent on iOS — Periodic Background Sync is Chrome-only and absent from iOS Safari,
  installed PWA or not. A closed web app does not update in the background. Consequence
  for slice G: experiment alarms must be **server-pushed** via Web Push, not
  client-scheduled the way `ExperimentAlarmManager` does natively.
- **No LiDAR volume estimation.** `ARFoodScanner.swift` uses ARKit `.sceneDepth` to
  estimate food volume from per-pixel depth and convert to grams. Browsers expose no depth
  API. Slice F uses the existing `POST /api/nutrition/analyze-image` endpoint — which iOS
  itself calls at `BackendAPI.swift:1227` — for segmentation and nutrition, with manual
  portion-size entry replacing the depth-derived estimate.
- **Web Push requires installation.** On iOS, Web Push works only for home-screen-installed
  PWAs on 16.4+. Testers who merely open the URL get no notifications.

## 13. Build migration

Deliberately boring, because it is the riskiest non-UI part.

- Vite configured with `outDir: 'build'`, so `Dockerfile` (`COPY /app/build`),
  `render.yaml` (`serve -s build`) and the nginx config keep working **unchanged**.
- `envPrefix: 'REACT_APP_'`, so every environment variable in `render.yaml` and the Render
  dashboard keeps its current name. No coordinated config change, and no chance of a
  production deploy booting with an undefined backend URL.
- Only two live files read `process.env` — `config/environments.ts` and
  `config/version.ts`. The other two references are in `Dashboard.tsx` and
  `EnhancedDashboard.tsx`, which are deleted and replaced respectively.
- `scripts/set-version.sh` and `scripts/render-build.sh` need **no changes**.
  `set-version.sh` writes `REACT_APP_*` variables into `.env.local`, which Vite reads
  natively and exposes under the configured `envPrefix`; `render-build.sh` shells out to
  `npm run build`. Version stamping keeps working untouched — this is a consequence of
  keeping the `REACT_APP_` prefix rather than a coincidence.

## 14. Dead code removal

2,844 of the 8,134 lines in `src/components/` are unreachable — 35% of the component tree:

`Dashboard.tsx` (999 lines, an older twin of `EnhancedDashboard` that nothing imports),
`GlucoseChart`, `GlucoseDisplay`, `COBChart`, `COBDisplay`, `GlucosePrediction`,
`NotesList`, `NightscoutDataStatus`, `LoginForm`, `CarbsOnBoardTest`, `TimezoneTest`.

They are deleted as part of this slice. This is not opportunistic cleanup: several are
near-namesakes of components being built here — `GlucoseChart` versus the new chart card,
`NotesList` versus the new recent-notes card — so leaving them means every future search
in this codebase returns two plausible answers.

`LibreLinkUpTest.tsx` is still reachable from `App.tsx` and is **kept**, reachable from
the Settings host below.

### 14.1 Disposition of live components

`EnhancedDashboard.tsx` is superseded by `DashboardScreen` and deleted once parity is
verified. Everything it currently owns has a defined destination — nothing is dropped by
omission:

| Component | Lines | Destination in this slice |
|---|---|---|
| `CombinedGlucoseChart` | 491 | Rewritten as `cards/GlucoseChart` (mobile-first, note markers) |
| `NoteInputModal` | 481 | Rewritten as `sheets/NoteEditor` |
| `AIInsightPanel` | 389 | Ported into `sheets/AI`, largely as-is |
| `NutritionAnalyzerModal` | 103 | Ported into `sheets/Nutrition`, largely as-is |
| `VersionInfo` | 156 | Ported into `sheets/Version`, largely as-is |
| `NightscoutErrorBoundary`, `NightscoutFallbackUI` | 109 | Kept; boundary re-scoped per §10 |
| `JwtLoginForm` | 283 | Kept unchanged; replaced by the onboarding flow in slice D |
| `DataSourceConfigModal` | 501 | **Moves to the Settings host**, unchanged |
| `COBSettings` | 243 | **Moves to the Settings host**, unchanged |
| `InsulinPreferencesSettings` | 239 | **Moves to the Settings host**, unchanged |
| `LibreLinkUpTest` | 239 | **Moves to the Settings host**, unchanged |

**Why Settings is a host rather than a stub.** On iOS these four live under Settings, and
this slice does not rebuild them — that is slice D. But if the dashboard is replaced while
Settings is genuinely empty, the web app loses data-source configuration entirely, and a
focus-group tester could not connect Libre or Nightscout at all. That is a parity
regression introduced by our own sequencing, so the Settings tab renders these four
existing components in the new shell, styled only enough not to look broken. Slice D
rebuilds them properly against `SettingsView.swift`. This is the one place in the slice
where we deliberately ship something not yet mirroring iOS, and it is preferable to
shipping a hole.

## 15. Acceptance criteria

1. The app installs to an iPhone home screen and launches chrome-free in standalone mode.
2. Four tabs render; Dashboard is complete, Notes and Experiments are stubs, and Settings
   hosts the four existing configuration components per §14.1.
3. No capability reachable in the web app before this slice is unreachable after it —
   specifically, data-source, COB, and insulin-preference configuration all still open and
   save.
4. The dashboard shows all seven cards in iOS order, with correct conditional visibility
   for the ISF banner, active-experiment card and sensor bar, and each card's internal
   anatomy matches §7.
5. The dashboard scrolls; pull-to-refresh works; safe areas are respected on a notched
   device.
6. The chrome is the floating-capsule language of §5.1 — detached toolbar and tab bar with
   content visibly scrolling beneath the latter, large titles on Notes / Experiments /
   Settings and none on Dashboard.
7. All nine sheet routes and `/bedside` open, close, and respond correctly to the browser
   Back button.
8. Only `CompactGlucose` re-renders on the 1 Hz tick.
9. Logging out with a refresh in flight does not repopulate the dashboard.
10. A cached reading past the stale threshold renders visibly stale, never as current.
11. Client errors reach the backend endpoint carrying no glucose values, note text, or
    usernames.
12. `npm run build` produces `build/`, and the existing Docker and Render deploy paths work
    unchanged.
13. Every new file is under 500 lines; the 2,844 dead lines are gone.
14. Side-by-side on a real iPhone against the reference screenshots, the web dashboard is
    the same design — chrome, card anatomy, type scale and colour, not merely a similar
    arrangement.

## 16. Out of scope

Slices C–G (Notes, Settings/onboarding, Experiments, camera, Push), any backend change
beyond the `POST /api/client-errors` endpoint in §10.1, any change to `services/`, and any
change to the iOS or watch apps.
