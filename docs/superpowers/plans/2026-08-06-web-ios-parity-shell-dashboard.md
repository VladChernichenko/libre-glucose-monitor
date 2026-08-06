# Web ↔ iOS Parity Slice A+B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `glucose-monitor-fe` web app as an installable, mobile-first PWA whose shell and dashboard mirror the iOS app, so it can serve as the focus-group vehicle ahead of the iOS App Store release.

**Architecture:** Migrate the build from CRA to Vite, then layer a hand-rolled design system (floating-capsule chrome, white cards on grey) over a `react-router` shell with four tab routes and sheet-as-URL modals. Dashboard data moves from five ad-hoc `useEffect`s into a single `GlucoseStore` that mirrors iOS's `AppState`, including request coalescing and an auth-generation guard. The existing `src/services/` API layer is not touched.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + Testing Library, Tailwind CSS, Recharts, react-router-dom, vite-plugin-pwa (Workbox).

**Spec:** `docs/superpowers/specs/2026-08-06-web-ios-parity-shell-dashboard-design.md`

## Global Constraints

- **Every new file stays under 500 lines** (`CLAUDE.md`). If a file approaches it, split by responsibility.
- **`src/services/` is not modified.** New API calls go in new files under `src/services/`, but existing files stay as they are. Exception: Task 21 adds one new service file.
- **Build output directory must remain `build/`.** `Dockerfile` copies `/app/build`; `render.yaml` runs `serve -s build`. Neither may be edited.
- **Environment variables keep the `REACT_APP_` prefix.** `render.yaml` and the Render dashboard are not to be touched.
- **Stale threshold is 15 minutes.** A glucose reading whose timestamp is older than 15 minutes renders with explicit stale treatment and never as current. CGM updates every ~5 min, so this is three missed readings. This value lives in exactly one constant, `STALE_THRESHOLD_MS`, in `src/state/glucoseStaleness.ts`.
- **Error payloads carry no health data.** No glucose values, note text, meal names, photos, usernames or emails. Enforced by a test in Task 21.
- **Colours, radii, type sizes come from `tokens.css` only.** No hard-coded hex values or px sizes in feature components.
- **Design source of truth is the iOS screenshots**, not platform convention. Where they disagree, the screenshots win.
- **Commit after every task.** Never commit `.env.local` or secrets.
- **TDD**: write the failing test, watch it fail, implement, watch it pass.

## File Structure

```
src/
  app/
    App.tsx                          router + providers only
    routes.tsx                       route table
    shell/
      AppShell.tsx                   layout frame
      CapsuleToolbar.tsx             floating top-right actions
      CapsuleTabBar.tsx              floating bottom tab bar
      LargeTitle.tsx                 34px/800 screen title
      SheetOutlet.tsx                renders sheet routes over the active tab
  ui/
    tokens.css                       CSS custom properties
    Card.tsx  ListRow.tsx  Pill.tsx  StatusPill.tsx
    Sheet.tsx  PullToRefresh.tsx  Spinner.tsx
  state/
    glucoseReducer.ts                pure reducer + action types
    glucoseStaleness.ts              STALE_THRESHOLD_MS + isStale()
    GlucoseStore.tsx                 provider, effects, refresh triggers
  features/
    dashboard/
      DashboardScreen.tsx
      cards/  IsfSuggestionCard · ActiveExperimentCard · CompactGlucoseCard ·
              ForecastChartCard · RecentNotesCard · SensorAlarmsCard · QuickActions
      sheets/ NoteEditorSheet · AiSheet · NutritionSheet · VersionSheet ·
              ActivitySheet · LongActingSheet · ForecastSheet · ScanSheet
    notes/NotesStub.tsx
    experiments/ExperimentsStub.tsx
    settings/SettingsHost.tsx
    bedside/BedsideScreen.tsx
  services/
    isfSuggestionApi.ts              new (Task 13)
    clientErrorApi.ts                new (Task 21)
```

## Task Order & Rationale

Tasks 1–2 change the toolchain and remove noise before any new code lands. Tasks 3–7 build the shell bottom-up (tokens → primitives → chrome → router → sheets) so each has something real to render against. Tasks 8–9 land state before the cards that consume it. Tasks 10–15 build the dashboard. Tasks 16–19 add sheets. Tasks 20–22 add PWA, error logging and the staleness safety net. Task 23 removes the old dashboard and verifies acceptance.

---

### Task 1: Migrate build from CRA to Vite + Vitest

**Files:**
- Create: `vite.config.ts`, `src/vite-env.d.ts`, `index.html` (repo root)
- Modify: `package.json`, `src/config/environments.ts`, `src/config/version.ts`, `tsconfig.json`, `src/setupTests.ts`
- Delete: `public/index.html`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run dev`, `npm run build` (→ `build/`), `npm test` (Vitest). All `process.env.REACT_APP_*` reads replaced by `import.meta.env.REACT_APP_*`, same names.

- [ ] **Step 1: Install dependencies**

```bash
npm install -D vite @vitejs/plugin-react vitest jsdom @testing-library/jest-dom @testing-library/react @testing-library/user-event
npm uninstall react-scripts
```

- [ ] **Step 2: Create `vite.config.ts`**

`outDir: 'build'` and `envPrefix: 'REACT_APP_'` are the two lines that keep Docker and Render working untouched.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  build: { outDir: 'build' },
  server: {
    port: 3000,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
```

- [ ] **Step 3: Move `index.html` to the repo root**

Vite requires it at the root, with a module script tag. Copy `public/index.html`, delete `%PUBLIC_URL%` placeholders, and add the entry script. The `viewport-fit=cover` value is required by the spec for safe-area insets.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Glucose Monitor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

Then: `git rm public/index.html`

- [ ] **Step 4: Create `src/vite-env.d.ts`**

Without this, TypeScript rejects `import.meta.env`.

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_ENVIRONMENT?: string;
  readonly REACT_APP_DOCKER?: string;
  readonly REACT_APP_BACKEND_URL?: string;
  readonly REACT_APP_COB_API_URL?: string;
  readonly REACT_APP_NIGHTSCOUT_URL?: string;
  readonly REACT_APP_NIGHTSCOUT_SECRET?: string;
  readonly REACT_APP_NIGHTSCOUT_TOKEN?: string;
  readonly REACT_APP_ENABLE_DEMO_MODE?: string;
  readonly REACT_APP_BUILD_NUMBER?: string;
  readonly REACT_APP_GIT_COMMIT?: string;
  readonly REACT_APP_BUILD_TIME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 5: Replace `process.env` reads**

In `src/config/environments.ts` (11 occurrences) and `src/config/version.ts` (4 occurrences), replace every `process.env.` with `import.meta.env.`. Variable names do not change. Example, `environments.ts:76-77`:

```ts
const env = import.meta.env.REACT_APP_ENVIRONMENT;
const dockerMode = import.meta.env.REACT_APP_DOCKER === 'true';
```

`src/components/EnhancedDashboard.tsx:46` also reads `process.env.REACT_APP_ENABLE_DEMO_MODE`. Update it too — the file survives until Task 23.

- [ ] **Step 6: Update `package.json` scripts**

Keep the existing per-environment script names so nobody's muscle memory breaks.

```json
"scripts": {
  "dev": "npm run set-version && vite",
  "start": "npm run set-version && vite",
  "start:dev": "npm run set-version && REACT_APP_ENVIRONMENT=development vite",
  "start:staging": "npm run set-version && REACT_APP_ENVIRONMENT=staging vite",
  "start:prod": "npm run set-version && REACT_APP_ENVIRONMENT=production vite",
  "build": "(npm run set-version || echo 'Version script failed, continuing...') && REACT_APP_ENVIRONMENT=production vite build",
  "build:simple": "vite build",
  "build:docker": "(npm run set-version || echo 'Version script failed, continuing...') && REACT_APP_DOCKER=true vite build",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "tsc --noEmit",
  "set-version": "bash ./scripts/set-version.sh",
  "pre-commit": "./scripts/pre-commit-check.sh"
}
```

- [ ] **Step 7: Update `src/setupTests.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 8: Replace `jest.` with `vi.` in existing tests**

Three files use `jest.mock` / `jest.fn`: `src/components/__tests__/EnhancedDashboard.mainpage.test.tsx`, `src/components/__tests__/Dashboard-NightscoutConfig.integration.test.tsx`, `src/services/__tests__/hybridNotesApi.test.ts`. Add `import { vi } from 'vitest';` at the top of each and replace `jest.` with `vi.` throughout. (Two of these three are deleted in Task 2 — do the mechanical replace anyway so the suite is green at this commit.)

- [ ] **Step 9: Verify the build produces `build/`**

Run: `npm run build && ls build/index.html`
Expected: the file exists. If Vite emitted `dist/`, `outDir` is wrong — fix before continuing, because Docker and Render both depend on `build/`.

- [ ] **Step 10: Verify tests run**

Run: `npm test`
Expected: the suite executes under Vitest. Pre-existing failures unrelated to the migration are acceptable here; record them in the commit message. A failure mentioning `process is not defined` means a `process.env` read was missed in Step 5.

- [ ] **Step 11: Verify version stamping still works**

`scripts/set-version.sh` writes `REACT_APP_GIT_COMMIT`, `REACT_APP_BUILD_NUMBER` and
`REACT_APP_BUILD_TIME` into `.env.local`. Vite reads `.env.local` natively and exposes
those names because of `envPrefix`, so **neither `set-version.sh` nor `render-build.sh`
needs editing**. Confirm rather than assume:

```bash
npm run set-version && grep REACT_APP_GIT_COMMIT .env.local
```

Then start the dev server and check the value reaches the app — `getVersionInfo().gitCommit`
must not be the `"unknown"` fallback. Never commit `.env.local`; it is already gitignored.

- [ ] **Step 12: Verify the dev server boots**

Run: `npm run dev`
Expected: Vite serves on port 3000 and the app renders. Stop it afterwards.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "build: migrate from CRA to Vite + Vitest

outDir=build and envPrefix=REACT_APP_ keep the Docker and Render
deploy paths working without config changes."
```

---

### Task 2: Delete dead components and their tests

**Files:**
- Delete: `src/components/{Dashboard,GlucoseChart,GlucoseDisplay,COBChart,COBDisplay,GlucosePrediction,NotesList,NightscoutDataStatus,LoginForm,CarbsOnBoardTest,TimezoneTest}.tsx`
- Delete: `src/components/__tests__/Dashboard-NightscoutConfig.integration.test.tsx`, `src/components/__tests__/NightscoutConfigModal.simple.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a component tree where each name resolves to exactly one file.

- [ ] **Step 1: Confirm each file is unreferenced**

```bash
cd src && for f in Dashboard GlucoseChart GlucoseDisplay COBChart COBDisplay GlucosePrediction NotesList NightscoutDataStatus LoginForm CarbsOnBoardTest TimezoneTest; do echo "$f <- $(grep -rlE "from '[^']*/${f}'" . | grep -v __tests__ | tr '\n' ' ')"; done
```

Expected: every line reads `<name> <- ` with nothing after the arrow. If a name has a referrer, stop and investigate rather than deleting.

- [ ] **Step 2: Delete the components**

```bash
cd src/components && git rm Dashboard.tsx GlucoseChart.tsx GlucoseDisplay.tsx COBChart.tsx COBDisplay.tsx GlucosePrediction.tsx NotesList.tsx NightscoutDataStatus.tsx LoginForm.tsx CarbsOnBoardTest.tsx TimezoneTest.tsx
```

- [ ] **Step 3: Delete the two dead tests**

`Dashboard-NightscoutConfig.integration.test.tsx` imports `../Dashboard` (line 5), which no longer exists. `NightscoutConfigModal.simple.test.tsx` only asserts that the harness renders, which Vitest's own setup now covers.

```bash
cd src/components/__tests__ && git rm Dashboard-NightscoutConfig.integration.test.tsx NightscoutConfigModal.simple.test.tsx
```

Its five assertions are re-targeted at `DataSourceConfigModal` in Task 6, so the coverage is not lost.

- [ ] **Step 4: Verify the app still compiles**

Run: `npm run lint && npm run build`
Expected: both succeed. A "cannot find module" error means something did reference a deleted file — restore it and re-check Step 1.

- [ ] **Step 5: Verify remaining tests pass**

Run: `npm test`
Expected: `hybridNotesApi.test.ts` and `EnhancedDashboard.mainpage.test.tsx` run.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: delete 2844 lines of unreachable components

Dashboard.tsx and ten others were reachable from nothing. Several are
near-namesakes of components being built in this slice, so leaving them
would make every future search ambiguous."
```

---

### Task 3: Design tokens

**Files:**
- Create: `src/ui/tokens.css`
- Modify: `tailwind.config.js`, `src/index.tsx`

**Interfaces:**
- Produces: CSS custom properties `--gm-*` and Tailwind utilities `bg-surface`, `text-label-secondary`, `rounded-card`, `shadow-capsule`, etc., consumed by every later task.

- [ ] **Step 1: Create `src/ui/tokens.css`**

Values read from the iOS screenshots per spec §6.

```css
:root {
  /* System colours */
  --gm-blue: #007aff;
  --gm-green: #34c759;
  --gm-orange: #ff9500;
  --gm-red: #ff3b30;
  --gm-purple: #af52de;
  --gm-indigo: #5856d6;

  /* Surfaces */
  --gm-bg-grouped: #f2f2f7;
  --gm-surface: #ffffff;
  --gm-surface-nested: #f2f2f7;
  --gm-separator: #e5e5ea;
  --gm-tab-selected-bg: #ececed;

  /* Labels */
  --gm-label: #000000;
  --gm-label-secondary: #8e8e93;
  --gm-label-tertiary: #aeaeb2;

  /* Tints for quantity pills */
  --gm-carb-pill-bg: #ffeddb;
  --gm-insulin-pill-bg: #ece9ff;
  --gm-status-normal-bg: #d8f5e3;
  --gm-status-normal-fg: #248a4e;

  /* Radii */
  --gm-radius-card: 20px;
  --gm-radius-nested: 14px;
  --gm-radius-capsule: 28px;

  /* Elevation: cards near-flat, floating capsules visibly above content */
  --gm-shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05);
  --gm-shadow-capsule: 0 3px 14px rgba(0, 0, 0, 0.15);

  /* Layout */
  --gm-capsule-inset: 14px;
  --gm-tabbar-height: 58px;
  --gm-safe-bottom: env(safe-area-inset-bottom, 0px);
  --gm-safe-top: env(safe-area-inset-top, 0px);

  /* Scroll containers must clear the floating tab bar */
  --gm-scroll-bottom-pad: calc(
    var(--gm-tabbar-height) + var(--gm-capsule-inset) * 2 + var(--gm-safe-bottom)
  );
}

html,
body,
#root {
  height: 100%;
  background: var(--gm-bg-grouped);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI',
    system-ui, sans-serif;
  color: var(--gm-label);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 2: Extend `tailwind.config.js`**

Keep the existing `glucose.*` and `primary.*` colours — they are domain semantics, not chrome.

```js
extend: {
  colors: {
    primary: { /* unchanged */ },
    glucose: { /* unchanged */ },
    surface: 'var(--gm-surface)',
    'surface-nested': 'var(--gm-surface-nested)',
    'bg-grouped': 'var(--gm-bg-grouped)',
    separator: 'var(--gm-separator)',
    label: 'var(--gm-label)',
    'label-secondary': 'var(--gm-label-secondary)',
    'label-tertiary': 'var(--gm-label-tertiary)',
    'sys-blue': 'var(--gm-blue)',
    'sys-green': 'var(--gm-green)',
    'sys-orange': 'var(--gm-orange)',
    'sys-red': 'var(--gm-red)',
    'sys-indigo': 'var(--gm-indigo)',
    'sys-purple': 'var(--gm-purple)',
  },
  borderRadius: {
    card: 'var(--gm-radius-card)',
    nested: 'var(--gm-radius-nested)',
    capsule: 'var(--gm-radius-capsule)',
  },
  boxShadow: {
    card: 'var(--gm-shadow-card)',
    capsule: 'var(--gm-shadow-capsule)',
  },
  fontSize: {
    'gm-title': ['34px', { lineHeight: '40px', fontWeight: '800', letterSpacing: '-1px' }],
    'gm-card-title': ['22px', { lineHeight: '28px', fontWeight: '700', letterSpacing: '-0.3px' }],
    'gm-hero': ['56px', { lineHeight: '60px', fontWeight: '700', letterSpacing: '-1.5px' }],
    'gm-body': ['17px', { lineHeight: '22px' }],
    'gm-subhead': ['15px', { lineHeight: '20px' }],
    'gm-caption': ['13px', { lineHeight: '18px' }],
    'gm-label': ['11px', { lineHeight: '14px' }],
  },
}
```

- [ ] **Step 3: Import tokens in `src/index.tsx`**

Add above the existing `index.css` import so tokens are defined before use:

```tsx
import './ui/tokens.css';
```

- [ ] **Step 4: Verify the build compiles and the background renders**

Run: `npm run build`
Expected: success.
Then `npm run dev`, open the app, and confirm the page background is the grey `#f2f2f7` rather than white. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/ui/tokens.css tailwind.config.js src/index.tsx
git commit -m "feat(ui): add iOS design tokens read from app screenshots"
```

---

### Task 4: Base primitives — Card, ListRow, Pill, StatusPill

**Files:**
- Create: `src/ui/Card.tsx`, `src/ui/Pill.tsx`, `src/ui/StatusPill.tsx`, `src/ui/ListRow.tsx`
- Test: `src/ui/__tests__/primitives.test.tsx`

**Interfaces:**
- Consumes: tokens from Task 3.
- Produces:
  - `<Card className?: string; children: ReactNode>`
  - `<Pill tone: 'carb' | 'insulin' | 'neutral'; children: ReactNode>`
  - `<StatusPill status: 'low' | 'normal' | 'high' | 'critical'>` — renders the capitalised status word
  - `<ListRow leading?: ReactNode; title: string; subtitle?: string; trailing?: ReactNode; onClick?: () => void>`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';
import { Pill } from '../Pill';
import { StatusPill } from '../StatusPill';
import { ListRow } from '../ListRow';

describe('ui primitives', () => {
  it('Card renders children inside a rounded surface', () => {
    render(<Card>content</Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('Pill applies the carb tone', () => {
    render(<Pill tone="carb">25 g</Pill>);
    expect(screen.getByText('25 g')).toHaveClass('bg-[var(--gm-carb-pill-bg)]');
  });

  it('StatusPill shows the capitalised status word', () => {
    render(<StatusPill status="normal" />);
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('ListRow renders title, subtitle and trailing content', () => {
    render(<ListRow title="Carb Ratio" subtitle="mmol/L per 10 g" trailing={<span>2,0</span>} />);
    expect(screen.getByText('Carb Ratio')).toBeInTheDocument();
    expect(screen.getByText('mmol/L per 10 g')).toBeInTheDocument();
    expect(screen.getByText('2,0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/__tests__/primitives.test.tsx`
Expected: FAIL — cannot resolve `../Card`.

- [ ] **Step 3: Implement the four primitives**

`src/ui/Card.tsx`:

```tsx
import React from 'react';

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => (
  <div className={`bg-surface rounded-card shadow-card p-3.5 ${className}`}>{children}</div>
);
```

`src/ui/Pill.tsx`:

```tsx
import React from 'react';

const TONES = {
  carb: 'bg-[var(--gm-carb-pill-bg)]',
  insulin: 'bg-[var(--gm-insulin-pill-bg)]',
  neutral: 'bg-surface-nested',
} as const;

export const Pill: React.FC<{
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}> = ({ tone = 'neutral', children }) => (
  <span className={`${TONES[tone]} rounded-full px-2.5 py-0.5 text-gm-label text-label`}>
    {children}
  </span>
);
```

`src/ui/StatusPill.tsx`:

```tsx
import React from 'react';
import type { GlucoseReading } from '../types/libre';

const STATUS_STYLES: Record<GlucoseReading['status'], string> = {
  normal: 'bg-[var(--gm-status-normal-bg)] text-[var(--gm-status-normal-fg)]',
  low: 'bg-red-100 text-sys-red',
  high: 'bg-orange-100 text-sys-orange',
  critical: 'bg-red-100 text-sys-red',
};

export const StatusPill: React.FC<{ status: GlucoseReading['status'] }> = ({ status }) => (
  <span className={`${STATUS_STYLES[status]} rounded-full px-3 py-1 text-gm-caption font-semibold`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);
```

`src/ui/ListRow.tsx`:

```tsx
import React from 'react';

export const ListRow: React.FC<{
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}> = ({ leading, title, subtitle, trailing, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className="flex w-full items-center gap-3 py-2.5 text-left"
      {...(onClick ? { type: 'button' as const } : {})}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-gm-body text-label">{title}</span>
        {subtitle && (
          <span className="block text-gm-label text-label-secondary">{subtitle}</span>
        )}
      </span>
      {trailing}
    </Tag>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/__tests__/primitives.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat(ui): add Card, Pill, StatusPill and ListRow primitives"
```

---

### Task 5: Floating-capsule shell chrome

**Files:**
- Create: `src/app/shell/CapsuleToolbar.tsx`, `src/app/shell/CapsuleTabBar.tsx`, `src/app/shell/LargeTitle.tsx`, `src/app/shell/AppShell.tsx`
- Test: `src/app/shell/__tests__/shell.test.tsx`

**Interfaces:**
- Consumes: tokens (Task 3).
- Produces:
  - `<CapsuleToolbar actions: ToolbarAction[]>` where `ToolbarAction = { key: string; label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }`
  - `<CapsuleTabBar>` — self-contained, reads the active route via `useLocation`
  - `<LargeTitle>{string}</LargeTitle>`
  - `<AppShell>` — renders `<Outlet/>`, tab bar and sheet outlet

The tab bar is the load-bearing piece: it floats, and content scrolls beneath it. Scroll containers get `padding-bottom: var(--gm-scroll-bottom-pad)` from Task 3.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CapsuleTabBar } from '../CapsuleTabBar';
import { CapsuleToolbar } from '../CapsuleToolbar';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CapsuleTabBar />
    </MemoryRouter>
  );

describe('shell chrome', () => {
  it('renders all four tabs', () => {
    renderAt('/dashboard');
    ['Dashboard', 'Notes', 'Experiments', 'Settings'].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument()
    );
  });

  it('marks the active tab as current', () => {
    renderAt('/experiments');
    expect(screen.getByRole('link', { name: /Experiments/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: /Dashboard/ })).not.toHaveAttribute('aria-current');
  });

  it('toolbar invokes an action on click', async () => {
    const onClick = vi.fn();
    render(
      <CapsuleToolbar
        actions={[{ key: 'refresh', label: 'Refresh', icon: <span>R</span>, onClick }]}
      />
    );
    screen.getByRole('button', { name: 'Refresh' }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/shell/__tests__/shell.test.tsx`
Expected: FAIL — cannot resolve `../CapsuleTabBar`.

- [ ] **Step 3: Install the router**

```bash
npm install react-router-dom
```

- [ ] **Step 4: Implement the chrome**

`src/app/shell/CapsuleToolbar.tsx`:

```tsx
import React from 'react';

export interface ToolbarAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export const CapsuleToolbar: React.FC<{ actions: ToolbarAction[] }> = ({ actions }) => (
  <div
    className="absolute right-[var(--gm-capsule-inset)] z-20 flex items-center gap-5
               rounded-capsule bg-surface px-4 py-2.5 shadow-capsule"
    style={{ top: 'calc(var(--gm-safe-top) + 8px)' }}
  >
    {actions.map((a) => (
      <button
        key={a.key}
        type="button"
        aria-label={a.label}
        onClick={a.onClick}
        disabled={a.disabled}
        className="text-xl text-label disabled:opacity-40"
      >
        {a.icon}
      </button>
    ))}
  </div>
);
```

`src/app/shell/CapsuleTabBar.tsx`:

```tsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/dashboard', label: 'Dashboard', icon: '∿' },
  { to: '/notes', label: 'Notes', icon: '▤' },
  { to: '/experiments', label: 'Experiments', icon: '⚗' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export const CapsuleTabBar: React.FC = () => (
  <nav
    className="fixed inset-x-[var(--gm-capsule-inset)] z-20 mx-auto flex max-w-[420px]
               rounded-capsule bg-surface p-1.5 shadow-capsule"
    style={{ bottom: 'calc(var(--gm-capsule-inset) + var(--gm-safe-bottom))' }}
  >
    {TABS.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        aria-current={undefined}
        className={({ isActive }) =>
          `flex-1 rounded-[18px] py-1.5 text-center text-gm-label font-medium ${
            isActive ? 'bg-[var(--gm-tab-selected-bg)] text-sys-blue' : 'text-label'
          }`
        }
      >
        {({ isActive }: { isActive: boolean }) => (
          <span aria-current={isActive ? 'page' : undefined}>
            <span className="mb-0.5 block text-lg">{tab.icon}</span>
            {tab.label}
          </span>
        )}
      </NavLink>
    ))}
  </nav>
);
```

Note: `NavLink` sets `aria-current="page"` itself on the anchor. The explicit `aria-current={undefined}` prop above prevents a duplicate; if the installed router version does not accept a render-prop child, drop the inner span and rely on `NavLink`'s built-in `aria-current`. Adjust the test only if the DOM shape genuinely differs — the assertion (active tab carries `aria-current="page"`, others do not) must hold either way.

`src/app/shell/LargeTitle.tsx`:

```tsx
import React from 'react';

export const LargeTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="px-4 pb-2.5 pt-11 text-gm-title text-label">{children}</h1>
);
```

`src/app/shell/AppShell.tsx`:

```tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { CapsuleTabBar } from './CapsuleTabBar';
import { SheetOutlet } from './SheetOutlet';

export const AppShell: React.FC = () => (
  <div className="relative mx-auto min-h-full max-w-[420px] bg-bg-grouped">
    <main
      className="min-h-full"
      style={{ paddingBottom: 'var(--gm-scroll-bottom-pad)' }}
    >
      <Outlet />
    </main>
    <CapsuleTabBar />
    <SheetOutlet />
  </div>
);
```

`SheetOutlet` is created in Task 7. Until then, add a temporary stub file `src/app/shell/SheetOutlet.tsx` exporting `export const SheetOutlet: React.FC = () => null;` so this task compiles on its own.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/app/shell/__tests__/shell.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/shell package.json package-lock.json
git commit -m "feat(shell): add floating capsule toolbar, tab bar and large title"
```

---

### Task 6: Router, tab routes, stub screens and the Settings host

**Files:**
- Create: `src/app/routes.tsx`, `src/features/notes/NotesStub.tsx`, `src/features/experiments/ExperimentsStub.tsx`, `src/features/settings/SettingsHost.tsx`
- Modify: `src/App.tsx`
- Test: `src/features/settings/__tests__/settingsHost.test.tsx`

**Interfaces:**
- Consumes: `AppShell`, `LargeTitle` (Task 5).
- Produces: routes `/dashboard`, `/notes`, `/experiments`, `/settings`; `SettingsHost` mounting the four surviving config components.

Settings is a **host, not an empty stub** (spec §14.1). Without it, replacing the dashboard would leave testers unable to configure a data source at all.

- [ ] **Step 1: Write the failing test**

This re-targets the assertions from the deleted `Dashboard-NightscoutConfig.integration.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsHost } from '../SettingsHost';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'vlad' }, isAuthenticated: true, logout: vi.fn() }),
}));

describe('SettingsHost', () => {
  it('renders the large title and the configuration entries', () => {
    render(<MemoryRouter><SettingsHost /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Data Source')).toBeInTheDocument();
    expect(screen.getByText('Carbs on Board')).toBeInTheDocument();
    expect(screen.getByText('Insulin Preferences')).toBeInTheDocument();
  });

  it('opens the data source configuration modal', async () => {
    render(<MemoryRouter><SettingsHost /></MemoryRouter>);
    await userEvent.click(screen.getByText('Data Source'));
    expect(await screen.findByRole('dialog', { name: /data source/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/settings/__tests__/settingsHost.test.tsx`
Expected: FAIL — cannot resolve `../SettingsHost`.

- [ ] **Step 3: Implement the stubs and the host**

`src/features/notes/NotesStub.tsx`:

```tsx
import React from 'react';
import { LargeTitle } from '../../app/shell/LargeTitle';
import { Card } from '../../ui/Card';

export const NotesStub: React.FC = () => (
  <>
    <LargeTitle>Notes</LargeTitle>
    <div className="px-3.5">
      <Card>
        <p className="text-gm-body text-label-secondary">
          The full notes list arrives in the next slice. Recent notes are on the Dashboard.
        </p>
      </Card>
    </div>
  </>
);
```

`src/features/experiments/ExperimentsStub.tsx`: identical shape, title `Experiments`, copy `Guided experiments arrive in a later slice.`

`src/features/settings/SettingsHost.tsx`:

```tsx
import React, { useState } from 'react';
import { LargeTitle } from '../../app/shell/LargeTitle';
import { Card } from '../../ui/Card';
import { ListRow } from '../../ui/ListRow';
import DataSourceConfigModal from '../../components/DataSourceConfigModal';
import COBSettings from '../../components/COBSettings';
import InsulinPreferencesSettings from '../../components/InsulinPreferencesSettings';
import LibreLinkUpTest from '../../components/LibreLinkUpTest';

type OpenModal = 'dataSource' | 'cob' | 'insulin' | 'libreTest' | null;

const Icon: React.FC<{ bg: string; glyph: string }> = ({ bg, glyph }) => (
  <span
    className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-sm text-white"
    style={{ background: bg }}
  >
    {glyph}
  </span>
);

export const SettingsHost: React.FC = () => {
  const [open, setOpen] = useState<OpenModal>(null);
  const close = () => setOpen(null);

  return (
    <>
      <LargeTitle>Settings</LargeTitle>
      <div className="flex flex-col gap-3.5 px-3.5">
        <Card className="py-1">
          <ListRow
            leading={<Icon bg="var(--gm-red)" glyph="∿" />}
            title="Data Source"
            trailing={<span className="text-label-secondary">›</span>}
            onClick={() => setOpen('dataSource')}
          />
        </Card>
        <Card className="py-1">
          <ListRow
            title="Carbs on Board"
            trailing={<span className="text-label-secondary">›</span>}
            onClick={() => setOpen('cob')}
          />
          <div className="border-t border-separator" />
          <ListRow
            title="Insulin Preferences"
            trailing={<span className="text-label-secondary">›</span>}
            onClick={() => setOpen('insulin')}
          />
          <div className="border-t border-separator" />
          <ListRow
            title="LibreLinkUp Test"
            trailing={<span className="text-label-secondary">›</span>}
            onClick={() => setOpen('libreTest')}
          />
        </Card>
      </div>

      {open === 'dataSource' && <DataSourceConfigModal isOpen onClose={close} />}
      {open === 'cob' && <COBSettings isOpen onClose={close} />}
      {open === 'insulin' && <InsulinPreferencesSettings isOpen onClose={close} />}
      {open === 'libreTest' && <LibreLinkUpTest />}
    </>
  );
};
```

Open each of the four imported components and match its actual prop names before wiring — they were written for the old dashboard and may take `onSave`, `onClose` or nothing at all. Adjust the call sites, not the components: they are rebuilt properly in slice D and must not be edited here.

- [ ] **Step 4: Create `src/app/routes.tsx`**

```tsx
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { NotesStub } from '../features/notes/NotesStub';
import { ExperimentsStub } from '../features/experiments/ExperimentsStub';
import { SettingsHost } from '../features/settings/SettingsHost';
import EnhancedDashboard from '../components/EnhancedDashboard';

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<EnhancedDashboard />} />
      <Route path="/notes" element={<NotesStub />} />
      <Route path="/experiments" element={<ExperimentsStub />} />
      <Route path="/settings" element={<SettingsHost />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);
```

`EnhancedDashboard` is a placeholder occupant of `/dashboard` until Task 15 replaces it. This keeps the app usable at every commit.

- [ ] **Step 5: Rewrite `src/App.tsx` as router + providers only**

```tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import JwtLoginForm from './components/JwtLoginForm';
import { AppRoutes } from './app/routes';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-label-secondary">Loading…</p>
      </div>
    );
  }
  return isAuthenticated ? <AppRoutes /> : <JwtLoginForm />;
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
```

The version-compatibility check previously in `App.tsx` moves into `GlucoseStore` in Task 9. Until then it is not running; note that in the commit message so it is not mistaken for an accidental drop.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/features/settings/__tests__/settingsHost.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 7: Verify navigation by hand**

Run `npm run dev`, sign in, and click each of the four tabs. Expected: all four render, the tab bar floats above content, and content scrolls beneath it. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/app src/features src/App.tsx
git commit -m "feat(shell): add router, tab routes, stubs and Settings host

Settings hosts the four surviving config components so data-source setup
stays reachable while the dashboard is rebuilt. The version-compatibility
check moves to GlucoseStore in a later task."
```

---

### Task 7: Sheet primitive and route-driven SheetOutlet

**Files:**
- Create: `src/ui/Sheet.tsx`
- Modify: `src/app/shell/SheetOutlet.tsx` (replacing the Task 5 stub), `src/app/routes.tsx`
- Test: `src/ui/__tests__/sheet.test.tsx`

**Interfaces:**
- Consumes: router (Task 6).
- Produces: `<Sheet title: string; onClose: () => void; children: ReactNode>`; sheet routes nested under `/dashboard`. Closing a sheet calls `navigate(-1)`, so the swipe/close button and the browser Back button agree.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from '../Sheet';

describe('Sheet', () => {
  it('renders as a labelled dialog with its title and content', () => {
    render(<Sheet title="Add note" onClose={() => {}}>body</Sheet>);
    const dialog = screen.getByRole('dialog', { name: 'Add note' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('calls onClose from the close button', async () => {
    const onClose = vi.fn();
    render(<Sheet title="Add note" onClose={onClose}>body</Sheet>);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(<Sheet title="Add note" onClose={onClose}>body</Sheet>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/__tests__/sheet.test.tsx`
Expected: FAIL — cannot resolve `../Sheet`.

- [ ] **Step 3: Implement `src/ui/Sheet.tsx`**

```tsx
import React, { useEffect } from 'react';

export const Sheet: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-[420px] overflow-y-auto rounded-t-[20px] bg-surface"
        style={{ paddingBottom: 'var(--gm-safe-bottom)' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-separator bg-surface px-4 py-3">
          <h2 className="text-gm-card-title text-label">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-sys-blue">
            Done
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
```

Drag-to-dismiss is deliberately omitted: Escape, the Done button and the browser Back button all close the sheet, which covers every path a tester will actually use. Adding a gesture handler is a candidate follow-up, not a requirement of this slice.

- [ ] **Step 4: Implement `src/app/shell/SheetOutlet.tsx`**

```tsx
import React from 'react';
import { Outlet } from 'react-router-dom';

export const SheetOutlet: React.FC = () => <Outlet />;
```

- [ ] **Step 5: Add the sheet routes to `src/app/routes.tsx`**

Nest them under `/dashboard` so the tab remains mounted behind the sheet. Each element is added by its own later task; register only the routes whose components exist, and extend this block as Tasks 16–19 land.

```tsx
<Route path="/dashboard" element={<EnhancedDashboard />}>
  {/* sheet routes registered in Tasks 16-19:
      note/new, note/:id, scan, ai, nutrition,
      activity, long-acting, forecast, version */}
</Route>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/ui/__tests__/sheet.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/ui/Sheet.tsx src/ui/__tests__/sheet.test.tsx src/app
git commit -m "feat(ui): add Sheet primitive and route-driven SheetOutlet"
```

---

### Task 8: GlucoseStore reducer — coalescing and the auth-generation guard

**Files:**
- Create: `src/state/glucoseReducer.ts`, `src/state/glucoseStaleness.ts`
- Test: `src/state/__tests__/glucoseReducer.test.ts`

**Interfaces:**
- Consumes: `GlucoseReading` from `src/types/libre`, `GlucoseCalculationsResponse` from `src/services/glucoseCalculationsApi`, `GlucoseNote` from `src/types/notes`.
- Produces:
  - `GlucoseState` and `GlucoseAction` types
  - `glucoseReducer(state: GlucoseState, action: GlucoseAction): GlucoseState`
  - `initialGlucoseState: GlucoseState`
  - `STALE_THRESHOLD_MS: number`, `isStale(timestamp: Date, now: number): boolean`

This is the highest-risk logic in the slice and is tested hardest. Both behaviors below exist on iOS and are absent on web today.

- [ ] **Step 1: Write the failing test**

```ts
import {
  glucoseReducer,
  initialGlucoseState,
  type GlucoseState,
} from '../glucoseReducer';
import { isStale, STALE_THRESHOLD_MS } from '../glucoseStaleness';

const reading = (value: number, timestamp = new Date()) => ({
  value,
  timestamp,
  trend: 0,
  trendArrow: '→',
  status: 'normal' as const,
  unit: 'mmol/L',
});

describe('glucoseReducer', () => {
  it('stores a reading received for the current auth generation', () => {
    const s = glucoseReducer(initialGlucoseState, {
      type: 'readingReceived',
      generation: 0,
      reading: reading(6.2),
    });
    expect(s.currentReading?.value).toBe(6.2);
  });

  it('ignores a reading from a stale auth generation', () => {
    const loggedOut = glucoseReducer(initialGlucoseState, { type: 'authChanged' });
    expect(loggedOut.authGeneration).toBe(1);

    const after = glucoseReducer(loggedOut, {
      type: 'readingReceived',
      generation: 0,
      reading: reading(6.2),
    });
    expect(after.currentReading).toBeNull();
  });

  it('clears data on auth change', () => {
    const withData = glucoseReducer(initialGlucoseState, {
      type: 'readingReceived',
      generation: 0,
      reading: reading(6.2),
    });
    const cleared = glucoseReducer(withData, { type: 'authChanged' });
    expect(cleared.currentReading).toBeNull();
    expect(cleared.notes).toEqual([]);
    expect(cleared.calculations).toBeNull();
  });

  it('records the refresh timestamp when a refresh finishes', () => {
    const s = glucoseReducer(initialGlucoseState, {
      type: 'refreshFinished',
      generation: 0,
      at: 1_700_000_000_000,
    });
    expect(s.lastGlucoseRefresh).toBe(1_700_000_000_000);
    expect(s.isLoading).toBe(false);
  });

  it('sets and clears the error message', () => {
    const errored = glucoseReducer(initialGlucoseState, {
      type: 'errorRaised',
      generation: 0,
      message: 'Network unreachable',
    });
    expect(errored.errorMessage).toBe('Network unreachable');
    const recovered = glucoseReducer(errored, {
      type: 'readingReceived',
      generation: 0,
      reading: reading(6.2),
    });
    expect(recovered.errorMessage).toBeNull();
  });
});

describe('staleness', () => {
  it('uses a 15 minute threshold', () => {
    expect(STALE_THRESHOLD_MS).toBe(15 * 60 * 1000);
  });

  it('treats a reading older than the threshold as stale', () => {
    const now = Date.now();
    expect(isStale(new Date(now - 16 * 60 * 1000), now)).toBe(true);
  });

  it('treats a recent reading as fresh', () => {
    const now = Date.now();
    expect(isStale(new Date(now - 4 * 60 * 1000), now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/state/__tests__/glucoseReducer.test.ts`
Expected: FAIL — cannot resolve `../glucoseReducer`.

- [ ] **Step 3: Implement `src/state/glucoseStaleness.ts`**

```ts
/**
 * A CGM reports roughly every 5 minutes, so three missed readings means the
 * displayed value can no longer be trusted as current. Showing a stale glucose
 * value as if it were live is a safety problem, not a cosmetic one.
 */
export const STALE_THRESHOLD_MS = 15 * 60 * 1000;

export function isStale(timestamp: Date, now: number = Date.now()): boolean {
  return now - timestamp.getTime() > STALE_THRESHOLD_MS;
}
```

- [ ] **Step 4: Implement `src/state/glucoseReducer.ts`**

```ts
import type { GlucoseReading } from '../types/libre';
import type { GlucoseNote } from '../types/notes';
import type { GlucoseCalculationsResponse } from '../services/glucoseCalculationsApi';

export interface GlucoseState {
  currentReading: GlucoseReading | null;
  glucoseHistory: GlucoseReading[];
  calculations: GlucoseCalculationsResponse | null;
  notes: GlucoseNote[];
  isLoading: boolean;
  errorMessage: string | null;
  lastGlucoseRefresh: number | null;
  /** Bumped on every auth transition; responses from an older generation are discarded. */
  authGeneration: number;
}

export type GlucoseAction =
  | { type: 'authChanged' }
  | { type: 'refreshStarted'; generation: number }
  | { type: 'refreshFinished'; generation: number; at: number }
  | { type: 'readingReceived'; generation: number; reading: GlucoseReading }
  | { type: 'historyReceived'; generation: number; history: GlucoseReading[] }
  | { type: 'calculationsReceived'; generation: number; calculations: GlucoseCalculationsResponse }
  | { type: 'notesReceived'; generation: number; notes: GlucoseNote[] }
  | { type: 'errorRaised'; generation: number; message: string };

export const initialGlucoseState: GlucoseState = {
  currentReading: null,
  glucoseHistory: [],
  calculations: null,
  notes: [],
  isLoading: false,
  errorMessage: null,
  lastGlucoseRefresh: null,
  authGeneration: 0,
};

export function glucoseReducer(state: GlucoseState, action: GlucoseAction): GlucoseState {
  if (action.type === 'authChanged') {
    return {
      ...initialGlucoseState,
      authGeneration: state.authGeneration + 1,
    };
  }

  // Any response that left before the last auth transition is discarded.
  if (action.generation !== state.authGeneration) return state;

  switch (action.type) {
    case 'refreshStarted':
      return { ...state, isLoading: true };
    case 'refreshFinished':
      return { ...state, isLoading: false, lastGlucoseRefresh: action.at };
    case 'readingReceived':
      return { ...state, currentReading: action.reading, errorMessage: null };
    case 'historyReceived':
      return { ...state, glucoseHistory: action.history, errorMessage: null };
    case 'calculationsReceived':
      return { ...state, calculations: action.calculations, errorMessage: null };
    case 'notesReceived':
      return { ...state, notes: action.notes };
    case 'errorRaised':
      return { ...state, isLoading: false, errorMessage: action.message };
    default:
      return state;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/state/__tests__/glucoseReducer.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/state
git commit -m "feat(state): add glucose reducer with auth-generation guard

A response landing after logout can no longer repopulate the dashboard.
Staleness threshold is 15 minutes, defined in one place."
```

---

### Task 9: GlucoseStore provider, coalescing and refresh triggers

**Files:**
- Create: `src/state/GlucoseStore.tsx`
- Modify: `src/App.tsx`
- Test: `src/state/__tests__/glucoseStore.test.tsx`

**Interfaces:**
- Consumes: `glucoseReducer` (Task 8), `EnhancedNightscoutService`, `glucoseCalculationsApi`, `hybridNotesApiService`.
- Produces: `<GlucoseProvider>` and `useGlucose(): GlucoseState & { refreshAll(): Promise<void>; refreshGlucoseOnly(opts?: { silent?: boolean; forceServerSync?: boolean }): Promise<void>; fetchNotes(): Promise<void>; }`

Refresh triggers, mirroring iOS: mount/auth, a 5-minute interval paused while the document is hidden, navigation to `/dashboard`, `visibilitychange` when more than 45 s has elapsed, and pull-to-refresh.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlucoseProvider, useGlucose } from '../GlucoseStore';

const getCurrentGlucose = vi.fn();
const getGlucoseEntries = vi.fn();

vi.mock('../../services/nightscout/enhancedNightscoutService', () => ({
  EnhancedNightscoutService: class {
    getCurrentGlucose = getCurrentGlucose;
    getGlucoseEntries = getGlucoseEntries;
  },
}));
vi.mock('../../services/glucoseCalculationsApi', () => ({
  glucoseCalculationsApi: { getGlucoseCalculations: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../services/hybridNotesApi', () => ({
  hybridNotesApiService: { getNotes: vi.fn().mockResolvedValue([]) },
}));

const Probe: React.FC = () => {
  const { currentReading, refreshGlucoseOnly } = useGlucose();
  return (
    <>
      <span data-testid="value">{currentReading?.value ?? 'none'}</span>
      <button onClick={() => refreshGlucoseOnly()}>refresh</button>
    </>
  );
};

const renderStore = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <GlucoseProvider><Probe /></GlucoseProvider>
    </MemoryRouter>
  );

describe('GlucoseStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentGlucose.mockResolvedValue({
      success: true,
      source: 'nightscout',
      data: { sgv: 112, date: Date.now(), direction: 'Flat' },
    });
    getGlucoseEntries.mockResolvedValue({ success: true, source: 'nightscout', data: [] });
  });

  it('loads a reading on mount', async () => {
    renderStore();
    await waitFor(() => expect(screen.getByTestId('value').textContent).not.toBe('none'));
  });

  it('coalesces concurrent refreshes into one network call', async () => {
    renderStore();
    await waitFor(() => expect(getCurrentGlucose).toHaveBeenCalled());
    const callsAfterMount = getCurrentGlucose.mock.calls.length;

    const button = screen.getByText('refresh');
    button.click();
    button.click();
    button.click();

    await waitFor(() => expect(getCurrentGlucose.mock.calls.length).toBe(callsAfterMount + 1));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/state/__tests__/glucoseStore.test.tsx`
Expected: FAIL — cannot resolve `../GlucoseStore`.

- [ ] **Step 3: Implement `src/state/GlucoseStore.tsx`**

Keep this file focused on orchestration; the mapping from a Nightscout entry to a `GlucoseReading` belongs in a helper so the file stays well under 500 lines.

```tsx
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef,
} from 'react';
import { useLocation } from 'react-router-dom';
import { EnhancedNightscoutService } from '../services/nightscout/enhancedNightscoutService';
import { glucoseCalculationsApi } from '../services/glucoseCalculationsApi';
import { hybridNotesApiService } from '../services/hybridNotesApi';
import { getEnvironmentConfig } from '../config/environments';
import { glucoseReducer, initialGlucoseState, type GlucoseState } from './glucoseReducer';
import { toGlucoseReading } from './toGlucoseReading';

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const VISIBILITY_REFRESH_THRESHOLD_MS = 45 * 1000;

interface GlucoseContextValue extends GlucoseState {
  refreshAll: () => Promise<void>;
  refreshGlucoseOnly: (opts?: { silent?: boolean; forceServerSync?: boolean }) => Promise<void>;
  fetchNotes: () => Promise<void>;
}

const GlucoseContext = createContext<GlucoseContextValue | null>(null);

export const GlucoseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(glucoseReducer, initialGlucoseState);
  const location = useLocation();

  const service = useMemo(() => {
    const config = getEnvironmentConfig();
    return new EnhancedNightscoutService({
      backendUrl: config.backendUrl,
      enableFallbacks: true,
      enableDemoData: import.meta.env.REACT_APP_ENABLE_DEMO_MODE === 'true',
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
    });
  }, []);

  // One in-flight promise per refresh kind. A second caller joins the first
  // rather than firing another round trip — iOS does this with task handles.
  const inFlight = useRef<{ full?: Promise<void>; glucose?: Promise<void> }>({});
  const generation = useRef(state.authGeneration);
  generation.current = state.authGeneration;

  const loadGlucose = useCallback(async () => {
    const gen = generation.current;
    const current = await service.getCurrentGlucose();
    if (current.success && current.data) {
      dispatch({ type: 'readingReceived', generation: gen, reading: toGlucoseReading(current.data) });
    } else if (current.error) {
      dispatch({ type: 'errorRaised', generation: gen, message: current.error });
    }

    const history = await service.getGlucoseEntries(100);
    if (history.success && history.data) {
      dispatch({
        type: 'historyReceived',
        generation: gen,
        history: history.data.map(toGlucoseReading),
      });
    }

    if (current.success && current.data) {
      const reading = toGlucoseReading(current.data);
      try {
        const calc = await glucoseCalculationsApi.getGlucoseCalculations(reading.value);
        if (calc) dispatch({ type: 'calculationsReceived', generation: gen, calculations: calc });
      } catch {
        // Calculations are supplementary: a failure degrades that card only.
      }
    }
    dispatch({ type: 'refreshFinished', generation: gen, at: Date.now() });
  }, [service]);

  const refreshGlucoseOnly = useCallback(
    (opts?: { silent?: boolean; forceServerSync?: boolean }) => {
      if (inFlight.current.glucose) return inFlight.current.glucose;
      if (!opts?.silent) dispatch({ type: 'refreshStarted', generation: generation.current });
      const p = loadGlucose().finally(() => {
        inFlight.current.glucose = undefined;
      });
      inFlight.current.glucose = p;
      return p;
    },
    [loadGlucose]
  );

  const fetchNotes = useCallback(async () => {
    const gen = generation.current;
    try {
      const notes = await hybridNotesApiService.getNotes();
      dispatch({ type: 'notesReceived', generation: gen, notes });
    } catch {
      // Notes failing must not take down the dashboard.
    }
  }, []);

  const refreshAll = useCallback(() => {
    if (inFlight.current.full) return inFlight.current.full;
    dispatch({ type: 'refreshStarted', generation: generation.current });
    const p = Promise.all([loadGlucose(), fetchNotes()])
      .then(() => undefined)
      .finally(() => {
        inFlight.current.full = undefined;
      });
    inFlight.current.full = p;
    return p;
  }, [loadGlucose, fetchNotes]);

  // Mount
  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // 5-minute auto refresh, paused while hidden
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshGlucoseOnly({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refreshGlucoseOnly]);

  // Returning to the foreground, if enough time has passed
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = state.lastGlucoseRefresh
        ? Date.now() - state.lastGlucoseRefresh
        : Number.POSITIVE_INFINITY;
      if (elapsed > VISIBILITY_REFRESH_THRESHOLD_MS) {
        void refreshGlucoseOnly({ silent: true, forceServerSync: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshGlucoseOnly, state.lastGlucoseRefresh]);

  // Navigating back to the dashboard tab
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard')) {
      void refreshGlucoseOnly({ silent: true, forceServerSync: true });
    }
  }, [location.pathname, refreshGlucoseOnly]);

  const value = useMemo(
    () => ({ ...state, refreshAll, refreshGlucoseOnly, fetchNotes }),
    [state, refreshAll, refreshGlucoseOnly, fetchNotes]
  );

  return <GlucoseContext.Provider value={value}>{children}</GlucoseContext.Provider>;
};

export function useGlucose(): GlucoseContextValue {
  const ctx = useContext(GlucoseContext);
  if (!ctx) throw new Error('useGlucose must be used inside GlucoseProvider');
  return ctx;
}
```

- [ ] **Step 4: Create `src/state/toGlucoseReading.ts`**

Extract the entry-to-reading mapping that `EnhancedDashboard.tsx` currently does inline. Read the existing conversion at `src/components/EnhancedDashboard.tsx:118-210` and `src/services/nightscout/adapter.ts` and reuse `NightscoutDataAdapter` if it already exposes this; only write a new function if it does not.

```ts
import type { GlucoseReading } from '../types/libre';

const TREND_ARROWS: Record<string, string> = {
  DoubleUp: '↑↑', SingleUp: '↑', FortyFiveUp: '↗',
  Flat: '→',
  FortyFiveDown: '↘', SingleDown: '↓', DoubleDown: '↓↓',
};

export function toGlucoseReading(entry: { sgv: number; date: number; direction?: string }): GlucoseReading {
  const mmol = Math.round((entry.sgv / 18) * 10) / 10;
  return {
    value: mmol,
    timestamp: new Date(entry.date),
    trend: 0,
    trendArrow: TREND_ARROWS[entry.direction ?? 'Flat'] ?? '→',
    status: mmol < 4 ? 'low' : mmol > 10 ? 'high' : 'normal',
    unit: 'mmol/L',
  };
}
```

Confirm the mmol conversion and the low/high boundaries against `EnhancedDashboard.tsx` before committing — if the existing code uses different thresholds, match it exactly rather than introducing a second definition of "normal".

- [ ] **Step 5: Wrap the routes in the provider**

In `src/App.tsx`, wrap `<AppRoutes />` with `<GlucoseProvider>`. It must sit inside `<BrowserRouter>` because it calls `useLocation`.

```tsx
<BrowserRouter>
  <GlucoseProvider>
    <AppContent />
  </GlucoseProvider>
</BrowserRouter>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/state/__tests__/glucoseStore.test.tsx`
Expected: PASS, 2 tests. The coalescing test is the one that matters — if it fails, three clicks produced three network calls and the `inFlight` guard is wrong.

- [ ] **Step 7: Commit**

```bash
git add src/state src/App.tsx
git commit -m "feat(state): add GlucoseStore with coalescing and refresh triggers

Replaces five ad-hoc useEffect fetch chains with one store mirroring
iOS AppState."
```

---

### Task 10: CompactGlucoseCard

**Files:**
- Create: `src/features/dashboard/cards/CompactGlucoseCard.tsx`, `src/features/dashboard/cards/useNow.ts`
- Test: `src/features/dashboard/cards/__tests__/compactGlucoseCard.test.tsx`

**Interfaces:**
- Consumes: `useGlucose()` (Task 9), `Card`, `StatusPill` (Task 4), `isStale` (Task 8).
- Produces: `<CompactGlucoseCard />`, and `useNow(intervalMs: number): number`.

Layout per spec §7 item 3: left column has `Now` / `2h forecast` labels over one baseline row (current → arrow → forecast → unit), then the status pill, then the relative-time line. Right column is a **nested grey panel** with COB and IOB.

The 1 Hz clock lives in `useNow` inside this card and nowhere else — today `EnhancedDashboard.tsx:497` ticks the whole 1035-line component every second, re-rendering the chart with it.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { CompactGlucoseCard } from '../CompactGlucoseCard';

const state = {
  currentReading: {
    value: 8.7, timestamp: new Date(), trend: 0, trendArrow: '↘',
    status: 'normal' as const, unit: 'mmol/L',
  },
  calculations: {
    activeCarbsOnBoard: 25, activeCarbsUnit: 'g',
    activeInsulinOnBoard: 3.69, activeInsulinUnit: 'u',
    twoHourPrediction: 7.4, predictionUnit: 'mmol/L',
  },
};

vi.mock('../../../../state/GlucoseStore', () => ({ useGlucose: () => state }));

describe('CompactGlucoseCard', () => {
  it('shows current value, forecast, unit and status', () => {
    render(<CompactGlucoseCard />);
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByText('7.4')).toBeInTheDocument();
    expect(screen.getByText('mmol/L')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('2h forecast')).toBeInTheDocument();
  });

  it('shows COB and IOB in the nested panel', () => {
    render(<CompactGlucoseCard />);
    expect(screen.getByText('25.0 g')).toBeInTheDocument();
    expect(screen.getByText('3.69 u')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/cards/__tests__/compactGlucoseCard.test.tsx`
Expected: FAIL — cannot resolve `../CompactGlucoseCard`.

- [ ] **Step 3: Implement `useNow`**

```ts
import { useEffect, useState } from 'react';

/** Scoped clock. Only the component calling this re-renders on each tick. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

- [ ] **Step 4: Implement `CompactGlucoseCard`**

```tsx
import React from 'react';
import { Card } from '../../../ui/Card';
import { StatusPill } from '../../../ui/StatusPill';
import { useGlucose } from '../../../state/GlucoseStore';
import { isStale } from '../../../state/glucoseStaleness';
import { useNow } from './useNow';

function relativeAge(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins > 0 ? `${mins} min, ${secs} secs ago` : `${secs} secs ago`;
}

export const CompactGlucoseCard: React.FC = () => {
  const { currentReading, calculations } = useGlucose();
  const now = useNow(1000);

  if (!currentReading) {
    return (
      <Card>
        <p className="text-gm-body text-label-secondary">Waiting for a glucose reading…</p>
      </Card>
    );
  }

  const stale = isStale(currentReading.timestamp, now);
  const tint = stale ? 'text-label-tertiary' : 'text-sys-orange';

  return (
    <Card>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex gap-6 text-gm-caption text-label-secondary">
            <span>Now</span>
            <span>2h forecast</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-gm-hero ${tint}`}>{currentReading.value.toFixed(1)}</span>
            <span className={`text-2xl ${tint}`}>{currentReading.trendArrow}</span>
            <span className={`text-gm-hero ${tint}`}>
              {calculations ? calculations.twoHourPrediction.toFixed(1) : '--'}
            </span>
            <span className="text-gm-subhead text-label-tertiary">{currentReading.unit}</span>
          </div>
          <div className="my-1.5">
            {stale ? (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-gm-caption font-semibold text-sys-orange">
                Stale
              </span>
            ) : (
              <StatusPill status={currentReading.status} />
            )}
          </div>
          <p className="text-gm-label text-label-tertiary">
            Updated {relativeAge(now - currentReading.timestamp.getTime())}
          </p>
        </div>

        <div className="w-[104px] shrink-0 rounded-nested bg-surface-nested p-2.5">
          <p className="text-gm-label font-semibold text-sys-orange">COB</p>
          <p className="mb-1.5 text-lg font-bold">
            {calculations ? `${calculations.activeCarbsOnBoard.toFixed(1)} g` : '--'}
          </p>
          <p className="text-gm-label font-semibold text-sys-indigo">IOB</p>
          <p className="text-lg font-bold">
            {calculations ? `${calculations.activeInsulinOnBoard.toFixed(2)} u` : '--'}
          </p>
        </div>
      </div>
    </Card>
  );
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/cards/__tests__/compactGlucoseCard.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/cards
git commit -m "feat(dashboard): add CompactGlucoseCard with scoped 1Hz clock"
```

---

### Task 11: ForecastChartCard

**Files:**
- Create: `src/features/dashboard/cards/ForecastChartCard.tsx`
- Test: `src/features/dashboard/cards/__tests__/forecastChartCard.test.tsx`

**Interfaces:**
- Consumes: `useGlucose()`, `Card`, Recharts.
- Produces: `<ForecastChartCard />`.

Marker vocabulary per spec §7 item 4: green target band, solid blue history continuing into dashed blue prediction, orange point markers with printed values, green vertical note lines, black dashed "now" line, yellow carb pills on the top edge, pale blue insulin bars along the bottom with unit counts.

- [ ] **Step 1: Write the failing test**

Recharts needs explicit dimensions in jsdom; `ResponsiveContainer` collapses to zero otherwise. Mock it.

```tsx
import { render, screen } from '@testing-library/react';
import { ForecastChartCard } from '../ForecastChartCard';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

const base = Date.now();
vi.mock('../../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    glucoseHistory: [
      { value: 15.2, timestamp: new Date(base - 3600_000), trend: 0, trendArrow: '→', status: 'high', unit: 'mmol/L' },
      { value: 8.5, timestamp: new Date(base), trend: 0, trendArrow: '↘', status: 'normal', unit: 'mmol/L' },
    ],
    calculations: {
      predictionPath: [
        { timestamp: new Date(base + 1800_000).toISOString(), predictedGlucose: 7.4 },
        { timestamp: new Date(base + 3600_000).toISOString(), predictedGlucose: 6.2 },
      ],
    },
    notes: [],
  }),
}));

describe('ForecastChartCard', () => {
  it('renders the titled card', () => {
    render(<ForecastChartCard />);
    expect(screen.getByText('Forecast (4h)')).toBeInTheDocument();
  });

  it('renders an empty state when there is no history', () => {
    vi.resetModules();
    render(<ForecastChartCard />);
    expect(screen.getByText('Forecast (4h)')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/cards/__tests__/forecastChartCard.test.tsx`
Expected: FAIL — cannot resolve `../ForecastChartCard`.

- [ ] **Step 3: Implement the card**

```tsx
import React, { useMemo } from 'react';
import {
  CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import { Card } from '../../../ui/Card';
import { useGlucose } from '../../../state/GlucoseStore';

const WINDOW_MS = 4 * 60 * 60 * 1000;
const TARGET_LOW = 4;
const TARGET_HIGH = 10;

interface Point {
  t: number;
  history?: number;
  prediction?: number;
}

export const ForecastChartCard: React.FC = () => {
  const { glucoseHistory, calculations, notes } = useGlucose();

  const data = useMemo<Point[]>(() => {
    const now = Date.now();
    const from = now - WINDOW_MS / 2;
    const past: Point[] = glucoseHistory
      .filter((r) => r.timestamp.getTime() >= from)
      .map((r) => ({ t: r.timestamp.getTime(), history: r.value }));

    const future: Point[] = (calculations?.predictionPath ?? []).map((p) => ({
      t: new Date(p.timestamp).getTime(),
      prediction: p.predictedGlucose,
    }));

    // Join the two series so the dashed line starts exactly at the last reading.
    const last = past[past.length - 1];
    if (last) last.prediction = last.history;

    return [...past, ...future].sort((a, b) => a.t - b.t);
  }, [glucoseHistory, calculations]);

  const recentNotes = useMemo(
    () => notes.filter((n) => n.timestamp.getTime() >= Date.now() - WINDOW_MS / 2),
    [notes]
  );

  return (
    <Card>
      <h2 className="mb-2 text-gm-card-title text-label">Forecast (4h)</h2>
      {data.length === 0 ? (
        <p className="py-8 text-center text-gm-body text-label-secondary">No readings yet.</p>
      ) : (
        <div className="h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 18, right: 6, bottom: 4, left: -18 }}>
              <CartesianGrid stroke="var(--gm-separator)" vertical={false} />
              <ReferenceArea
                y1={TARGET_LOW}
                y2={TARGET_HIGH}
                fill="var(--gm-green)"
                fillOpacity={0.15}
              />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={(t) =>
                  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                }
                tick={{ fontSize: 10, fill: 'var(--gm-label-secondary)' }}
              />
              <YAxis
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
                tick={{ fontSize: 10, fill: 'var(--gm-label-tertiary)' }}
              />
              <ReferenceLine x={Date.now()} stroke="var(--gm-label)" strokeDasharray="4 3" />
              {recentNotes.map((n) => (
                <ReferenceLine
                  key={n.id}
                  x={n.timestamp.getTime()}
                  stroke="var(--gm-green)"
                  strokeWidth={2}
                  label={
                    n.carbs > 0
                      ? { value: `${n.carbs}g`, position: 'top', fontSize: 11, fill: 'var(--gm-label)' }
                      : undefined
                  }
                />
              ))}
              <Line
                type="monotone"
                dataKey="history"
                stroke="var(--gm-blue)"
                strokeWidth={3}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="prediction"
                stroke="var(--gm-blue)"
                strokeWidth={3}
                strokeDasharray="7 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
```

The yellow carb pill is rendered via the `ReferenceLine` label above. Insulin bars along the bottom axis and the orange value-labelled point markers are not expressible as Recharts primitives without a custom shape — add them as a custom `Customized` layer only if the side-by-side comparison in Task 23 shows the difference matters. Record whichever choice you make in the commit message.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/cards/__tests__/forecastChartCard.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/cards
git commit -m "feat(dashboard): add ForecastChartCard with target band and prediction"
```

---

### Task 12: RecentNotesCard

**Files:**
- Create: `src/features/dashboard/cards/RecentNotesCard.tsx`
- Test: `src/features/dashboard/cards/__tests__/recentNotesCard.test.tsx`

**Interfaces:**
- Consumes: `useGlucose()`, `Card`, `Pill`, `useNavigate`.
- Produces: `<RecentNotesCard />`.

Row anatomy per spec §7 item 5: green status dot, bold title, blue `Del`, absolute timestamp, tinted quantity pill, droplet glyph and the glucose value at entry. Header carries the scan icon and a filled blue circular add button. Window is 12 hours.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecentNotesCard } from '../RecentNotesCard';

const now = Date.now();
vi.mock('../../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    notes: [
      { id: '1', timestamp: new Date(now - 5 * 60_000), carbs: 25, insulin: 0, meal: 'Lunch', glucoseValue: 8.5 },
      { id: '2', timestamp: new Date(now - 8 * 60_000), carbs: 0, insulin: 1, meal: 'Pre-bolus', glucoseValue: 8.5 },
      { id: '3', timestamp: new Date(now - 20 * 60 * 60_000), carbs: 40, insulin: 0, meal: 'Old', glucoseValue: 7.0 },
    ],
  }),
}));

const renderCard = () => render(<MemoryRouter><RecentNotesCard /></MemoryRouter>);

describe('RecentNotesCard', () => {
  it('renders the header and add control', () => {
    renderCard();
    expect(screen.getByText('Recent notes (12h)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add note' })).toBeInTheDocument();
  });

  it('shows notes inside the 12 hour window and hides older ones', () => {
    renderCard();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Pre-bolus')).toBeInTheDocument();
    expect(screen.queryByText('Old')).not.toBeInTheDocument();
  });

  it('renders carb and insulin quantity pills', () => {
    renderCard();
    expect(screen.getByText('25 g')).toBeInTheDocument();
    expect(screen.getByText('1.0 u')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/cards/__tests__/recentNotesCard.test.tsx`
Expected: FAIL — cannot resolve `../RecentNotesCard`.

- [ ] **Step 3: Implement the card**

```tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../ui/Card';
import { Pill } from '../../../ui/Pill';
import { useGlucose } from '../../../state/GlucoseStore';

const WINDOW_MS = 12 * 60 * 60 * 1000;

export const RecentNotesCard: React.FC = () => {
  const { notes } = useGlucose();

  const recent = useMemo(() => {
    const cutoff = Date.now() - WINDOW_MS;
    return notes
      .filter((n) => n.timestamp.getTime() >= cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [notes]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-gm-card-title text-label">Recent notes (12h)</h2>
        <div className="flex items-center gap-2.5">
          <Link to="/dashboard/scan" aria-label="Scan food" className="text-lg text-label">
            ⛶
          </Link>
          <Link
            to="/dashboard/note/new"
            aria-label="Add note"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sys-blue text-white"
          >
            +
          </Link>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="py-6 text-center text-gm-body text-label-secondary">
          No notes in the last 12 hours.
        </p>
      ) : (
        <ul className="mt-2">
          {recent.map((n, i) => (
            <li key={n.id} className={i > 0 ? 'mt-2 border-t border-separator pt-2' : ''}>
              <div className="flex items-center">
                <span className="mr-2.5 h-2 w-2 rounded-full bg-sys-green" />
                <span className="flex-1 text-gm-body font-semibold text-label">{n.meal}</span>
                <Link to={`/dashboard/note/${n.id}`} className="text-gm-caption text-sys-blue">
                  Del
                </Link>
              </div>
              <p className="ml-[18px] text-gm-label text-label-secondary">
                {n.timestamp.toLocaleString([], {
                  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                })}
              </p>
              <div className="ml-[18px] mt-1 flex items-center gap-2.5">
                {n.carbs > 0 && <Pill tone="carb">{n.carbs} g</Pill>}
                {n.insulin > 0 && <Pill tone="insulin">{n.insulin.toFixed(1)} u</Pill>}
                {n.glucoseValue !== undefined && (
                  <span className="text-gm-caption text-label-secondary">
                    💧 {n.glucoseValue}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
```

`Del` links to the note route rather than deleting inline — a destructive action must not be one stray tap on a phone. The confirm-and-delete lives in the note sheet built in Task 16.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/cards/__tests__/recentNotesCard.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/cards
git commit -m "feat(dashboard): add RecentNotesCard with 12h window"
```

---

### Task 13: IsfSuggestionCard and its API client

**Files:**
- Create: `src/services/isfSuggestionApi.ts`, `src/features/dashboard/cards/IsfSuggestionCard.tsx`
- Test: `src/features/dashboard/cards/__tests__/isfSuggestionCard.test.tsx`

**Interfaces:**
- Consumes: the backend endpoints confirmed to exist in `IsfMealWindowController.java`:
  - `GET /api/isf/meal-windows/suggestion`
  - `POST /api/isf/meal-windows/suggestion/accept`
  - `POST /api/isf/meal-windows/suggestion/dismiss`
- Produces:
  - `isfSuggestionApi.fetch(): Promise<IsfSuggestion>`, `.accept(): Promise<void>`, `.dismiss(): Promise<void>`
  - `IsfSuggestion = { show: boolean; windows: WindowProposal[] }`, `WindowProposal = { id: string; displayName: string; currentIsf?: number; proposedIsf?: number }`
  - `<IsfSuggestionCard />`

Visibility rule from `ContentView.swift:277-282`: the server's `show` flag **and** local time between 05:00 and 11:00 **and** a non-empty proposal list. All three, not any.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IsfSuggestionCard } from '../IsfSuggestionCard';

const fetchSuggestion = vi.fn();
const accept = vi.fn().mockResolvedValue(undefined);
const dismiss = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../services/isfSuggestionApi', () => ({
  isfSuggestionApi: { fetch: () => fetchSuggestion(), accept, dismiss },
}));

const suggestion = {
  show: true,
  windows: [{ id: 'breakfast', displayName: 'Breakfast', currentIsf: 2.1, proposedIsf: 2.45 }],
};

describe('IsfSuggestionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuggestion.mockResolvedValue(suggestion);
    vi.setSystemTime(new Date('2026-08-06T08:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders in the morning when the server says show', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-06T08:00:00'));
    render(<IsfSuggestionCard />);
    expect(await screen.findByText('Updated ISF ready')).toBeInTheDocument();
    expect(screen.getByText(/Breakfast/)).toBeInTheDocument();
  });

  it('stays hidden outside the 05:00-11:00 window', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-06T15:00:00'));
    render(<IsfSuggestionCard />);
    await waitFor(() => expect(fetchSuggestion).toHaveBeenCalled());
    expect(screen.queryByText('Updated ISF ready')).not.toBeInTheDocument();
  });

  it('hides itself after Apply', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-06T08:00:00'));
    render(<IsfSuggestionCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(accept).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByText('Updated ISF ready')).not.toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/cards/__tests__/isfSuggestionCard.test.tsx`
Expected: FAIL — cannot resolve `../IsfSuggestionCard`.

- [ ] **Step 3: Implement `src/services/isfSuggestionApi.ts`**

Copy the axios instance and auth-header pattern from `src/services/glucoseCalculationsApi.ts` so token handling and the 401 interceptor behave identically.

```ts
import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';

export interface WindowProposal {
  id: string;
  displayName: string;
  currentIsf?: number;
  proposedIsf?: number;
}

export interface IsfSuggestion {
  show: boolean;
  windows: WindowProposal[];
}

const api = axios.create({
  baseURL: `${getEnvironmentConfig().backendUrl}/api/isf/meal-windows`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Let AuthContext own the session lifecycle; this client only reports.
      window.dispatchEvent(new CustomEvent('gm:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const isfSuggestionApi = {
  async fetch(): Promise<IsfSuggestion> {
    const res = await api.get<IsfSuggestion>('/suggestion');
    return res.data;
  },
  async accept(): Promise<void> {
    await api.post('/suggestion/accept');
  },
  async dismiss(): Promise<void> {
    await api.post('/suggestion/dismiss');
  },
};
```

- [ ] **Step 4: Implement `IsfSuggestionCard`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { isfSuggestionApi, type IsfSuggestion } from '../../../services/isfSuggestionApi';

const isLocalMorning = (d = new Date()) => d.getHours() >= 5 && d.getHours() < 11;

export const IsfSuggestionCard: React.FC = () => {
  const [suggestion, setSuggestion] = useState<IsfSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isfSuggestionApi
      .fetch()
      .then((s) => {
        if (!cancelled) setSuggestion(s);
      })
      .catch(() => {
        // A missing suggestion is not an error worth showing the user.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolve = useCallback(async (action: 'accept' | 'dismiss') => {
    setBusy(true);
    try {
      await isfSuggestionApi[action]();
      setHidden(true);
    } finally {
      setBusy(false);
    }
  }, []);

  const visible =
    !hidden && suggestion?.show === true && isLocalMorning() && suggestion.windows.length > 0;
  if (!visible) return null;

  return (
    <div className="rounded-card border border-sys-purple/40 bg-sys-purple/10 p-3">
      <p className="text-gm-body font-bold text-label">Updated ISF ready</p>
      <p className="mt-0.5 text-gm-label text-label-secondary">
        Based on your recent data, we suggest refining meal-window ISF.
      </p>
      <ul className="my-2">
        {suggestion!.windows.map((w) => (
          <li key={w.id} className="flex justify-between text-gm-caption">
            <span className="font-medium">{w.displayName}</span>
            {w.currentIsf != null && w.proposedIsf != null && (
              <span className="tabular-nums text-label-secondary">
                {w.currentIsf.toFixed(2)} → {w.proposedIsf.toFixed(2)}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve('dismiss')}
          className="flex-1 rounded-lg bg-sys-purple/10 py-1.5 text-gm-caption font-semibold text-sys-purple disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve('accept')}
          className="flex-1 rounded-lg bg-sys-purple py-1.5 text-gm-caption font-semibold text-white disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/cards/__tests__/isfSuggestionCard.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/services/isfSuggestionApi.ts src/features/dashboard/cards
git commit -m "feat(dashboard): add morning ISF suggestion card"
```

---

### Task 14: ActiveExperimentCard, SensorAlarmsCard and QuickActions

**Files:**
- Create: `src/features/dashboard/cards/ActiveExperimentCard.tsx`, `src/features/dashboard/cards/SensorAlarmsCard.tsx`, `src/features/dashboard/cards/QuickActions.tsx`
- Test: `src/features/dashboard/cards/__tests__/secondaryCards.test.tsx`

**Interfaces:**
- Consumes: `Card`, `useGlucose()`, `Link`.
- Produces: `<ActiveExperimentCard />`, `<SensorAlarmsCard />`, `<QuickActions />`.

`ActiveExperimentCard` renders nothing in this slice — experiments arrive in slice E — but the component and its slot exist so Task 15's composition is final. `SensorAlarmsCard` renders only when the data source is `libre`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickActions } from '../QuickActions';
import { ActiveExperimentCard } from '../ActiveExperimentCard';

describe('secondary dashboard cards', () => {
  it('QuickActions links to the four sheet routes', () => {
    render(<MemoryRouter><QuickActions /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Add note' })).toHaveAttribute('href', '/dashboard/note/new');
    expect(screen.getByRole('link', { name: 'Scan food' })).toHaveAttribute('href', '/dashboard/scan');
    expect(screen.getByRole('link', { name: 'AI insights' })).toHaveAttribute('href', '/dashboard/ai');
    expect(screen.getByRole('link', { name: 'Log activity' })).toHaveAttribute('href', '/dashboard/activity');
  });

  it('ActiveExperimentCard renders nothing while experiments are unavailable', () => {
    const { container } = render(<MemoryRouter><ActiveExperimentCard /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/cards/__tests__/secondaryCards.test.tsx`
Expected: FAIL — cannot resolve `../QuickActions`.

- [ ] **Step 3: Implement the three components**

`QuickActions.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';

const ACTIONS = [
  { to: '/dashboard/note/new', label: 'Add note', icon: '＋' },
  { to: '/dashboard/scan', label: 'Scan food', icon: '⛶' },
  { to: '/dashboard/ai', label: 'AI insights', icon: '✦' },
  { to: '/dashboard/activity', label: 'Log activity', icon: '⏱' },
];

export const QuickActions: React.FC = () => (
  <div className="grid grid-cols-4 gap-2">
    {ACTIONS.map((a) => (
      <Link
        key={a.to}
        to={a.to}
        aria-label={a.label}
        className="rounded-nested bg-surface p-2.5 text-center shadow-card"
      >
        <span className="mb-1 block text-lg">{a.icon}</span>
        <span className="text-gm-label text-label">{a.label}</span>
      </Link>
    ))}
  </div>
);
```

`ActiveExperimentCard.tsx`:

```tsx
import React from 'react';

/**
 * Slot for the active-experiment banner. Experiments land in slice E; until the
 * experiments API is wired there is never an active experiment, so this renders
 * nothing. The component exists so the dashboard composition is final.
 */
export const ActiveExperimentCard: React.FC = () => null;
```

`SensorAlarmsCard` gates on the real data source, so `GlucoseStore` must track it first.

In `src/state/glucoseReducer.ts`, add to `GlucoseState`:

```ts
  dataSource: 'NIGHTSCOUT' | 'LIBRE_LINK_UP';
```

to `initialGlucoseState`: `dataSource: 'NIGHTSCOUT',` — and a new action:

```ts
  | { type: 'dataSourceReceived'; generation: number; dataSource: GlucoseState['dataSource'] }
```

handled in the switch:

```ts
    case 'dataSourceReceived':
      return { ...state, dataSource: action.dataSource };
```

In `src/state/GlucoseStore.tsx`, load it once on mount. `getConfigStatus()` is the cheapest
call that reveals the active source; open `src/services/userDataSourceConfigApi.ts:179` and
match `DataSourceConfigStatus`'s actual field name before writing the mapping.

```tsx
useEffect(() => {
  const gen = generation.current;
  userDataSourceConfigApi
    .getConfigStatus()
    .then((status) => {
      dispatch({
        type: 'dataSourceReceived',
        generation: gen,
        dataSource: status.activeDataSource ?? 'NIGHTSCOUT',
      });
    })
    .catch(() => {
      // Defaulting to Nightscout only hides the sensor bar; nothing else breaks.
    });
}, []);
```

`SensorAlarmsCard.tsx`:

```tsx
import React from 'react';
import { Card } from '../../../ui/Card';
import { useGlucose } from '../../../state/GlucoseStore';

export const SensorAlarmsCard: React.FC = () => {
  const { dataSource } = useGlucose();
  // Only LibreLinkUp exposes sensor metadata; Nightscout has none to show.
  if (dataSource !== 'LIBRE_LINK_UP') return null;

  return (
    <Card className="flex items-center gap-2">
      <span>◉</span>
      <div className="flex-1">
        <p className="text-gm-caption font-semibold text-label">Sensor connected</p>
        <p className="text-gm-label text-label-secondary">Alarms managed in Settings</p>
      </div>
    </Card>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/cards/__tests__/secondaryCards.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/cards src/state
git commit -m "feat(dashboard): add quick actions, sensor bar and experiment slot"
```

---

### Task 15: DashboardScreen composition

**Files:**
- Create: `src/features/dashboard/DashboardScreen.tsx`
- Modify: `src/app/routes.tsx`
- Test: `src/features/dashboard/__tests__/dashboardScreen.test.tsx`
- Delete: `src/components/__tests__/EnhancedDashboard.mainpage.test.tsx` (assertion ported below)

**Interfaces:**
- Consumes: every card from Tasks 10–14, `CapsuleToolbar` (Task 5), `useGlucose()` (Task 9).
- Produces: `<DashboardScreen />` mounted at `/dashboard`.

Card order per spec §7: ISF banner → active experiment → glucose → forecast chart → recent notes → sensor bar → quick actions → error footnote. No large title on this tab.

- [ ] **Step 1: Write the failing test**

This carries forward the intent of the deleted `EnhancedDashboard.mainpage.test.tsx` — main sections and recent notes present on first load.

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardScreen } from '../DashboardScreen';

const now = Date.now();
vi.mock('../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    currentReading: {
      value: 8.7, timestamp: new Date(now), trend: 0, trendArrow: '↘',
      status: 'normal', unit: 'mmol/L',
    },
    glucoseHistory: [],
    calculations: {
      activeCarbsOnBoard: 25, activeInsulinOnBoard: 3.69,
      twoHourPrediction: 7.4, predictionPath: [],
    },
    notes: [{ id: '1', timestamp: new Date(now), carbs: 25, insulin: 0, meal: 'Lunch', glucoseValue: 8.5 }],
    isLoading: false,
    errorMessage: null,
    dataSource: 'nightscout',
    refreshAll: vi.fn(),
    refreshGlucoseOnly: vi.fn(),
    fetchNotes: vi.fn(),
  }),
}));
vi.mock('../../../services/isfSuggestionApi', () => ({
  isfSuggestionApi: { fetch: vi.fn().mockResolvedValue({ show: false, windows: [] }), accept: vi.fn(), dismiss: vi.fn() },
}));

describe('DashboardScreen', () => {
  it('loads main sections and recent notes on first page load', () => {
    render(<MemoryRouter><DashboardScreen /></MemoryRouter>);
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByText('Forecast (4h)')).toBeInTheDocument();
    expect(screen.getByText('Recent notes (12h)')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
  });

  it('exposes the three toolbar actions', () => {
    render(<MemoryRouter><DashboardScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bedside mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeInTheDocument();
  });

  it('renders the global error footnote when set', () => {
    render(<MemoryRouter><DashboardScreen /></MemoryRouter>);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/__tests__/dashboardScreen.test.tsx`
Expected: FAIL — cannot resolve `../DashboardScreen`.

- [ ] **Step 3: Implement `DashboardScreen`**

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CapsuleToolbar } from '../../app/shell/CapsuleToolbar';
import { useGlucose } from '../../state/GlucoseStore';
import { IsfSuggestionCard } from './cards/IsfSuggestionCard';
import { ActiveExperimentCard } from './cards/ActiveExperimentCard';
import { CompactGlucoseCard } from './cards/CompactGlucoseCard';
import { ForecastChartCard } from './cards/ForecastChartCard';
import { RecentNotesCard } from './cards/RecentNotesCard';
import { SensorAlarmsCard } from './cards/SensorAlarmsCard';
import { QuickActions } from './cards/QuickActions';

export const DashboardScreen: React.FC = () => {
  const { refreshAll, isLoading, errorMessage } = useGlucose();
  const navigate = useNavigate();

  return (
    <>
      <CapsuleToolbar
        actions={[
          { key: 'refresh', label: 'Refresh', icon: '↻', onClick: () => void refreshAll(), disabled: isLoading },
          { key: 'bedside', label: 'Bedside mode', icon: '☾', onClick: () => navigate('/bedside') },
          { key: 'add', label: 'Add note', icon: '＋', onClick: () => navigate('/dashboard/note/new') },
        ]}
      />
      <div className="flex flex-col gap-3.5 px-3.5 pt-[72px]">
        <IsfSuggestionCard />
        <ActiveExperimentCard />
        <CompactGlucoseCard />
        <ForecastChartCard />
        <RecentNotesCard />
        <SensorAlarmsCard />
        <QuickActions />
        {errorMessage && (
          <p role="alert" className="px-2 text-center text-gm-caption text-sys-red">
            {errorMessage}
          </p>
        )}
      </div>
    </>
  );
};
```

- [ ] **Step 4: Point `/dashboard` at the new screen**

In `src/app/routes.tsx`, replace the `EnhancedDashboard` element with `<DashboardScreen />` and drop the now-unused import.

- [ ] **Step 5: Delete the superseded test**

```bash
git rm src/components/__tests__/EnhancedDashboard.mainpage.test.tsx
```

Its assertion now lives in Step 1's first test.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/features/dashboard`
Expected: PASS across the dashboard suite.

- [ ] **Step 7: Verify by hand**

Run `npm run dev`, sign in, and confirm the dashboard shows the cards in order with the floating toolbar and tab bar. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(dashboard): compose DashboardScreen from seven cards

Replaces the 1035-line EnhancedDashboard as the /dashboard element.
Ports the mainpage load assertion from the deleted CRA test."
```

---

### Task 16: Note editor sheet

**Files:**
- Create: `src/features/dashboard/sheets/NoteEditorSheet.tsx`
- Modify: `src/app/routes.tsx`, `src/state/GlucoseStore.tsx`
- Test: `src/features/dashboard/sheets/__tests__/noteEditorSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 7), `hybridNotesApiService.addNote/updateNote/deleteNote`, `NoteInputData` from `src/types/notes`.
- Produces: `<NoteEditorSheet />` at `/dashboard/note/new` and `/dashboard/note/:id`; `createNote`, `updateNote`, `deleteNote` added to the `useGlucose()` value.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NoteEditorSheet } from '../NoteEditorSheet';

const createNote = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../state/GlucoseStore', () => ({
  useGlucose: () => ({ notes: [], createNote, updateNote: vi.fn(), deleteNote: vi.fn() }),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/note/new" element={<NoteEditorSheet />} />
        <Route path="/dashboard/note/:id" element={<NoteEditorSheet />} />
      </Routes>
    </MemoryRouter>
  );

describe('NoteEditorSheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens as a dialog titled for a new note', () => {
    renderAt('/dashboard/note/new');
    expect(screen.getByRole('dialog', { name: 'Add note' })).toBeInTheDocument();
  });

  it('submits carbs, insulin and meal', async () => {
    renderAt('/dashboard/note/new');
    await userEvent.type(screen.getByLabelText('Carbs (g)'), '25');
    await userEvent.type(screen.getByLabelText('Insulin (u)'), '4');
    await userEvent.selectOptions(screen.getByLabelText('Meal'), 'Lunch');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(createNote).toHaveBeenCalledWith(
        expect.objectContaining({ carbs: 25, insulin: 4, meal: 'Lunch' })
      )
    );
  });

  it('rejects a note with neither carbs nor insulin', async () => {
    renderAt('/dashboard/note/new');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter carbs, insulin, or both.')).toBeInTheDocument();
    expect(createNote).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/sheets/__tests__/noteEditorSheet.test.tsx`
Expected: FAIL — cannot resolve `../NoteEditorSheet`.

- [ ] **Step 3: Add the note mutations to `GlucoseStore`**

```tsx
const createNote = useCallback(
  async (input: NoteInputData) => {
    await hybridNotesApiService.addNote(input);
    await fetchNotes();
  },
  [fetchNotes]
);

const updateNote = useCallback(
  async (id: string, updates: Partial<NoteInputData>) => {
    await hybridNotesApiService.updateNote(id, updates);
    await fetchNotes();
  },
  [fetchNotes]
);

const deleteNote = useCallback(
  async (id: string) => {
    await hybridNotesApiService.deleteNote(id);
    await fetchNotes();
  },
  [fetchNotes]
);
```

Add all three to the context value and to `GlucoseContextValue`.

- [ ] **Step 4: Implement `NoteEditorSheet`**

```tsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import { useGlucose } from '../../../state/GlucoseStore';
import { MEAL_CATEGORIES } from '../../../types/notes';

export const NoteEditorSheet: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, createNote, updateNote, deleteNote } = useGlucose();
  const existing = id ? notes.find((n) => n.id === id) : undefined;

  const [carbs, setCarbs] = useState(existing ? String(existing.carbs) : '');
  const [insulin, setInsulin] = useState(existing ? String(existing.insulin) : '');
  const [meal, setMeal] = useState(existing?.meal ?? 'Other');
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => navigate(-1);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = Number(carbs) || 0;
    const i = Number(insulin) || 0;
    if (c <= 0 && i <= 0) {
      setError('Enter carbs, insulin, or both.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload = { timestamp: existing?.timestamp ?? new Date(), carbs: c, insulin: i, meal, comment };
      if (existing) await updateNote(existing.id, payload);
      else await createNote(payload);
      close();
    } catch {
      setError('Could not save the note. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={existing ? 'Edit note' : 'Add note'} onClose={close}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-gm-caption text-label-secondary">
          Carbs (g)
          <input
            type="number" inputMode="decimal" step="0.1" min="0" value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label"
          />
        </label>
        <label className="text-gm-caption text-label-secondary">
          Insulin (u)
          <input
            type="number" inputMode="decimal" step="0.1" min="0" value={insulin}
            onChange={(e) => setInsulin(e.target.value)}
            className="mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label"
          />
        </label>
        <label className="text-gm-caption text-label-secondary">
          Meal
          <select
            value={meal} onChange={(e) => setMeal(e.target.value)}
            className="mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label"
          >
            {MEAL_CATEGORIES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-gm-caption text-label-secondary">
          Comment
          <input
            type="text" value={comment} onChange={(e) => setComment(e.target.value)}
            className="mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label"
          />
        </label>

        {error && <p role="alert" className="text-gm-caption text-sys-red">{error}</p>}

        <button
          type="submit" disabled={busy}
          className="rounded-nested bg-sys-blue py-2.5 text-gm-body font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>

        {existing && (
          <button
            type="button" disabled={busy}
            onClick={async () => {
              if (!window.confirm('Delete this note?')) return;
              await deleteNote(existing.id);
              close();
            }}
            className="py-2 text-gm-body font-semibold text-sys-red disabled:opacity-50"
          >
            Delete note
          </button>
        )}
      </form>
    </Sheet>
  );
};
```

- [ ] **Step 5: Register the routes**

In `src/app/routes.tsx`, nest under `/dashboard`:

```tsx
<Route path="note/new" element={<NoteEditorSheet />} />
<Route path="note/:id" element={<NoteEditorSheet />} />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/sheets/__tests__/noteEditorSheet.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Verify Back closes the sheet**

Run `npm run dev`, open `/dashboard`, tap ⊕, then press the browser Back button. Expected: the sheet closes and the dashboard remains — the tab is not exited. This is the behavior the sheet-as-route decision exists for.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add note editor sheet at note/new and note/:id"
```

---

### Task 17: Ported sheets — AI, Nutrition, Version

**Files:**
- Create: `src/features/dashboard/sheets/AiSheet.tsx`, `NutritionSheet.tsx`, `VersionSheet.tsx`
- Modify: `src/app/routes.tsx`
- Test: `src/features/dashboard/sheets/__tests__/portedSheets.test.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 7) and the existing components `AIInsightPanel`, `NutritionAnalyzerModal`, `VersionInfo`.
- Produces: `<AiSheet />`, `<NutritionSheet />`, `<VersionSheet />` at `/dashboard/ai`, `/dashboard/nutrition`, `/dashboard/version`.

These three wrap components that already work. Do not rewrite their internals.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AiSheet } from '../AiSheet';
import { VersionSheet } from '../VersionSheet';

vi.mock('../../../../components/AIInsightPanel', () => ({ default: () => <div>AI Analyzer</div> }));
vi.mock('../../../../components/VersionInfo', () => ({ default: () => <div>Version details</div> }));

describe('ported sheets', () => {
  it('AiSheet wraps the insight panel in a dialog', () => {
    render(<MemoryRouter><AiSheet /></MemoryRouter>);
    expect(screen.getByRole('dialog', { name: 'AI insights' })).toBeInTheDocument();
    expect(screen.getByText('AI Analyzer')).toBeInTheDocument();
  });

  it('VersionSheet wraps version info in a dialog', () => {
    render(<MemoryRouter><VersionSheet /></MemoryRouter>);
    expect(screen.getByRole('dialog', { name: 'Version' })).toBeInTheDocument();
    expect(screen.getByText('Version details')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/sheets/__tests__/portedSheets.test.tsx`
Expected: FAIL — cannot resolve `../AiSheet`.

- [ ] **Step 3: Implement the three wrappers**

```tsx
// src/features/dashboard/sheets/AiSheet.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import AIInsightPanel from '../../../components/AIInsightPanel';

export const AiSheet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Sheet title="AI insights" onClose={() => navigate(-1)}>
      <AIInsightPanel />
    </Sheet>
  );
};
```

```tsx
// src/features/dashboard/sheets/VersionSheet.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import VersionInfo from '../../../components/VersionInfo';

export const VersionSheet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Sheet title="Version" onClose={() => navigate(-1)}>
      <VersionInfo />
    </Sheet>
  );
};
```

```tsx
// src/features/dashboard/sheets/NutritionSheet.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import NutritionAnalyzerModal from '../../../components/NutritionAnalyzerModal';

export const NutritionSheet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Sheet title="Nutrition analyzer" onClose={() => navigate(-1)}>
      <NutritionAnalyzerModal isOpen onClose={() => navigate(-1)} />
    </Sheet>
  );
};
```

Open each wrapped component first and match its real props. `AIInsightPanel` and `VersionInfo` may require props the calls above omit; `NutritionAnalyzerModal` renders its own overlay and header, so strip those from it or render its form directly rather than nesting an overlay inside a sheet.

- [ ] **Step 4: Register the routes**

```tsx
<Route path="ai" element={<AiSheet />} />
<Route path="nutrition" element={<NutritionSheet />} />
<Route path="version" element={<VersionSheet />} />
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/sheets/__tests__/portedSheets.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add AI, nutrition and version sheets"
```

---

### Task 18: Activity, long-acting and extended-forecast sheets

**Files:**
- Create: `src/features/dashboard/sheets/ActivitySheet.tsx`, `LongActingSheet.tsx`, `ForecastSheet.tsx`
- Modify: `src/app/routes.tsx`
- Test: `src/features/dashboard/sheets/__tests__/entrySheets.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `useGlucose().createNote`, `ForecastChartCard`.
- Produces: `<ActivitySheet />`, `<LongActingSheet />`, `<ForecastSheet />` at `/dashboard/activity`, `/dashboard/long-acting`, `/dashboard/forecast`.

Activity and long-acting insulin are recorded on iOS as notes, not through separate endpoints — both go through `createNote` with a fixed meal category. `ForecastSheet` is the extended chart at full height.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ActivitySheet } from '../ActivitySheet';
import { LongActingSheet } from '../LongActingSheet';

const createNote = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../state/GlucoseStore', () => ({
  useGlucose: () => ({ createNote, notes: [] }),
}));

describe('entry sheets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ActivitySheet records activity as a note', async () => {
    render(<MemoryRouter><ActivitySheet /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Duration (minutes)'), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(createNote).toHaveBeenCalledWith(
        expect.objectContaining({ meal: 'Other', carbs: 0, insulin: 0 })
      )
    );
  });

  it('LongActingSheet records a dose as an insulin note', async () => {
    render(<MemoryRouter><LongActingSheet /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Units'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(createNote).toHaveBeenCalledWith(expect.objectContaining({ insulin: 12 }))
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/dashboard/sheets/__tests__/entrySheets.test.tsx`
Expected: FAIL — cannot resolve `../ActivitySheet`.

- [ ] **Step 3: Implement `ActivitySheet`**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import { useGlucose } from '../../../state/GlucoseStore';

export const ActivitySheet: React.FC = () => {
  const navigate = useNavigate();
  const { createNote } = useGlucose();
  const [minutes, setMinutes] = useState('');
  const [kind, setKind] = useState('Walk');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(minutes);
    if (!m || m <= 0) {
      setError('Enter a duration in minutes.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createNote({
        timestamp: new Date(), carbs: 0, insulin: 0,
        meal: 'Other', comment: `Activity: ${kind}, ${m} min`,
      });
      navigate(-1);
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Log activity" onClose={() => navigate(-1)}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-gm-caption text-label-secondary">
          Activity
          <select
            value={kind} onChange={(e) => setKind(e.target.value)}
            className="mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label"
          >
            {['Walk', 'Run', 'Cycle', 'Gym', 'Other'].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="text-gm-caption text-label-secondary">
          Duration (minutes)
          <input
            type="number" inputMode="numeric" min="1" value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label"
          />
        </label>
        {error && <p role="alert" className="text-gm-caption text-sys-red">{error}</p>}
        <button
          type="submit" disabled={busy}
          className="rounded-nested bg-sys-blue py-2.5 text-gm-body font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
      </form>
    </Sheet>
  );
};
```

- [ ] **Step 4: Implement `LongActingSheet`**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import { useGlucose } from '../../../state/GlucoseStore';

export const LongActingSheet: React.FC = () => {
  const navigate = useNavigate();
  const { createNote } = useGlucose();
  const [units, setUnits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = Number(units);
    if (!u || u <= 0) {
      setError('Enter a dose in units.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createNote({
        timestamp: new Date(),
        carbs: 0,
        insulin: u,
        meal: 'Other',
        comment: 'Long-acting insulin',
      });
      navigate(-1);
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Long-acting insulin" onClose={() => navigate(-1)}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-gm-caption text-label-secondary">
          Units
          <input
            type="number" inputMode="decimal" step="0.5" min="0" value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label"
          />
        </label>
        {error && <p role="alert" className="text-gm-caption text-sys-red">{error}</p>}
        <button
          type="submit" disabled={busy}
          className="rounded-nested bg-sys-blue py-2.5 text-gm-body font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
      </form>
    </Sheet>
  );
};
```

Long-acting doses are recorded as notes with `insulin` set, exactly as a bolus is. If the
prediction model later needs to distinguish basal from bolus, that is a backend modelling
change, not a UI one — do not invent a client-side flag here.

- [ ] **Step 5: Implement `ForecastSheet`**

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import { ForecastChartCard } from '../cards/ForecastChartCard';

export const ForecastSheet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Sheet title="Extended forecast" onClose={() => navigate(-1)}>
      <ForecastChartCard />
    </Sheet>
  );
};
```

- [ ] **Step 6: Register the routes**

```tsx
<Route path="activity" element={<ActivitySheet />} />
<Route path="long-acting" element={<LongActingSheet />} />
<Route path="forecast" element={<ForecastSheet />} />
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/sheets/__tests__/entrySheets.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add activity, long-acting and forecast sheets"
```

---

### Task 19: Scan placeholder sheet and bedside screen

**Files:**
- Create: `src/features/dashboard/sheets/ScanSheet.tsx`, `src/features/bedside/BedsideScreen.tsx`
- Modify: `src/app/routes.tsx`
- Test: `src/features/bedside/__tests__/bedsideScreen.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `useGlucose()`.
- Produces: `<ScanSheet />` at `/dashboard/scan`, `<BedsideScreen />` at `/bedside` (outside `AppShell`, so no tab bar).

The camera flow is slice F. `ScanSheet` ships as an honest placeholder rather than a broken button — spec §5.2 registers the route, §16 puts photo capture out of scope.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BedsideScreen } from '../BedsideScreen';

vi.mock('../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    currentReading: {
      value: 8.7, timestamp: new Date(), trend: 0, trendArrow: '↘',
      status: 'normal', unit: 'mmol/L',
    },
  }),
}));

describe('BedsideScreen', () => {
  it('shows the reading at large size with an exit control', () => {
    render(<MemoryRouter><BedsideScreen /></MemoryRouter>);
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit bedside mode' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/bedside/__tests__/bedsideScreen.test.tsx`
Expected: FAIL — cannot resolve `../BedsideScreen`.

- [ ] **Step 3: Implement `ScanSheet`**

```tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';

export const ScanSheet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Sheet title="Scan food" onClose={() => navigate(-1)}>
      <p className="text-gm-body text-label-secondary">
        Photo capture is not available in this build. Enter the meal manually for now.
      </p>
      <Link
        to="/dashboard/note/new"
        replace
        className="mt-4 block rounded-nested bg-sys-blue py-2.5 text-center text-gm-body font-semibold text-white"
      >
        Add note instead
      </Link>
    </Sheet>
  );
};
```

- [ ] **Step 4: Implement `BedsideScreen`**

```tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlucose } from '../../state/GlucoseStore';

export const BedsideScreen: React.FC = () => {
  const { currentReading } = useGlucose();
  const navigate = useNavigate();

  // Keep the screen awake while the user is watching it overnight.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen');
      } catch {
        // Wake Lock is unsupported or was denied; bedside mode still works.
      }
    };
    void request();
    return () => {
      void lock?.release();
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black text-white">
      <p className="text-[96px] font-bold tabular-nums">
        {currentReading ? currentReading.value.toFixed(1) : '--'}
      </p>
      <p className="text-2xl text-white/60">
        {currentReading?.trendArrow} {currentReading?.unit}
      </p>
      <button
        type="button"
        aria-label="Exit bedside mode"
        onClick={() => navigate(-1)}
        className="mt-12 rounded-full border border-white/30 px-6 py-2 text-white/70"
      >
        Exit
      </button>
    </div>
  );
};
```

If TypeScript does not know `WakeLockSentinel` or `navigator.wakeLock`, add `"dom"` to `compilerOptions.lib` in `tsconfig.json`; if it still complains, type the sentinel as `any` locally rather than installing a polyfill.

- [ ] **Step 5: Register the routes**

`scan` nests under `/dashboard`. `/bedside` sits **outside** the `AppShell` route so it renders full-screen with no tab bar:

```tsx
<Route path="/bedside" element={<BedsideScreen />} />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/features/bedside/__tests__/bedsideScreen.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add scan placeholder sheet and bedside mode screen

Camera capture is slice F; the route ships with an honest placeholder
rather than a button that does nothing."
```

---

### Task 20: PWA — manifest, icons, service worker

**Files:**
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`
- Modify: `vite.config.ts`, `index.html`
- Test: manual, plus a build assertion

**Interfaces:**
- Consumes: the Vite config from Task 1.
- Produces: an installable PWA. `build/manifest.webmanifest` and `build/sw.js` exist after `npm run build`.

Caching rules from spec §9: precache the app shell; API GETs network-first with a short fallback; **auth responses and mutations are never cached.**

- [ ] **Step 1: Install the plugin**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Generate the icons**

Source art is `icon_source.svg` in the `glucose-monitor-iphone` repo. Export at 192, 512, and 512-maskable (with ~10% safe-area padding so the OS mask does not clip it), plus a 180 px `apple-touch-icon.png`. Any exporter is fine; verify each file is a valid PNG at the stated dimensions before continuing:

```bash
file public/icon-192.png public/icon-512.png public/icon-maskable-512.png public/apple-touch-icon.png
```

- [ ] **Step 3: Configure the plugin in `vite.config.ts`**

```ts
import { VitePWA } from 'vite-plugin-pwa';

// inside plugins: [react(), ...]
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['apple-touch-icon.png'],
  manifest: {
    name: 'Glucose Monitor',
    short_name: 'Glucose',
    description: 'Real-time glucose monitoring, predictions and notes',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f2f2f7',
    theme_color: '#f2f2f7',
    start_url: '/dashboard',
    scope: '/',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
    navigateFallback: '/index.html',
    runtimeCaching: [
      {
        // Auth must never be cached — a cached token response would resurrect a
        // dead session, and a cached 401 would lock a live one out.
        urlPattern: ({ url }) => url.pathname.startsWith('/api/auth'),
        handler: 'NetworkOnly',
      },
      {
        // Only GETs. Workbox does not cache non-GET requests, but being explicit
        // keeps the intent legible.
        urlPattern: ({ url, request }) =>
          url.pathname.startsWith('/api/') && request.method === 'GET',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'gm-api',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 },
        },
      },
    ],
  },
}),
```

- [ ] **Step 4: Add the apple-touch-icon link to `index.html`**

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

- [ ] **Step 5: Build and verify the artifacts exist**

Run: `npm run build && ls build/manifest.webmanifest build/sw.js`
Expected: both files exist. If `sw.js` is missing, the plugin is not registered in `plugins`.

- [ ] **Step 6: Verify installability on a real iPhone**

Serve the build over HTTPS (a tunnel such as `ngrok`, or the Render deploy), open it in iOS Safari, and use Share → Add to Home Screen. Expected: the icon appears, and launching from it opens full-screen with no Safari address bar. **A service worker will not register over plain HTTP on a non-localhost origin** — if install does not offer, check the origin is HTTPS before debugging anything else.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(pwa): add manifest, icons and service worker

Auth endpoints are NetworkOnly; API GETs are NetworkFirst with a 1h cap."
```

---

### Task 21: Client error logging

**Files:**
- Create: `src/services/clientErrorApi.ts`, `src/app/ErrorBoundary.tsx`
- Modify: `src/app/routes.tsx`, `src/index.tsx`
- Test: `src/services/__tests__/clientErrorApi.test.ts`

**Interfaces:**
- Consumes: `getVersionInfo()` from `src/config/version`.
- Produces:
  - `reportClientError(error: Error, context: { route: string }): void`
  - `<ErrorBoundary>` wrapping each tab screen
  - `CLIENT_ERROR_ENDPOINT = '/api/client-errors'`

**Cross-repo dependency:** this endpoint does **not exist** in `glucose-monitor-be` yet (spec §10.1). The transport therefore ships behind `REACT_APP_ENABLE_ERROR_REPORTING`, default off. Capture and redaction are built and tested now; enabling the POST waits on the backend.

- [ ] **Step 1: Write the failing test**

The redaction test is the point of this task — the error channel must not become a side door around health-data handling.

```ts
import { buildErrorPayload } from '../clientErrorApi';

describe('client error payload', () => {
  it('includes diagnostic fields', () => {
    const p = buildErrorPayload(new Error('boom'), { route: '/dashboard' });
    expect(p.name).toBe('Error');
    expect(p.message).toBe('boom');
    expect(p.route).toBe('/dashboard');
    expect(p.appVersion).toBeTruthy();
    expect(p.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('caps message and stack length', () => {
    const long = new Error('x'.repeat(5000));
    long.stack = 'y'.repeat(20000);
    const p = buildErrorPayload(long, { route: '/dashboard' });
    expect(p.message.length).toBeLessThanOrEqual(500);
    expect((p.stack ?? '').length).toBeLessThanOrEqual(4000);
  });

  it('carries no health data or identity fields', () => {
    const p = buildErrorPayload(new Error('boom'), { route: '/dashboard' });
    const keys = Object.keys(p);
    ['glucose', 'reading', 'notes', 'note', 'meal', 'carbs', 'insulin',
     'username', 'email', 'user', 'photo'].forEach((forbidden) => {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
    });
  });

  it('redacts a message that embeds a glucose reading', () => {
    const p = buildErrorPayload(new Error('failed to render 8.7 mmol/L for vlad'), {
      route: '/dashboard',
    });
    expect(p.message).not.toContain('8.7');
    expect(p.message).toContain('[redacted]');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/__tests__/clientErrorApi.test.ts`
Expected: FAIL — cannot resolve `../clientErrorApi`.

- [ ] **Step 3: Implement `src/services/clientErrorApi.ts`**

```ts
import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { getVersionInfo } from '../config/version';

export const CLIENT_ERROR_ENDPOINT = '/api/client-errors';

const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_PER_MINUTE = 5;

export interface ClientErrorPayload {
  name: string;
  message: string;
  stack?: string;
  route: string;
  appVersion: string;
  userAgent: string;
  occurredAt: string;
  sessionId: string;
}

/**
 * Numbers that look like glucose readings are stripped before transmission.
 * This is a health app: an error string is not a licence to ship a reading.
 */
function redact(text: string): string {
  return text
    .replace(/\b\d+([.,]\d+)?\s*(mmol\/L|mg\/dL)\b/gi, '[redacted]')
    .replace(/\b\d+([.,]\d+)?\s*(g\b|units?\b|u\b)/gi, '[redacted]');
}

const sessionId =
  globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000';

export function buildErrorPayload(
  error: Error,
  context: { route: string }
): ClientErrorPayload {
  return {
    name: error.name,
    message: redact(error.message).slice(0, MAX_MESSAGE),
    stack: error.stack?.slice(0, MAX_STACK),
    route: context.route,
    appVersion: getVersionInfo().version,
    userAgent: navigator.userAgent,
    occurredAt: new Date().toISOString(),
    sessionId,
  };
}

let sentThisMinute = 0;
let windowStart = Date.now();

export function reportClientError(error: Error, context: { route: string }): void {
  if (import.meta.env.REACT_APP_ENABLE_ERROR_REPORTING !== 'true') return;

  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    sentThisMinute = 0;
  }
  // A render loop must not flood the endpoint with thousands of identical errors.
  if (sentThisMinute >= MAX_PER_MINUTE) return;
  sentThisMinute += 1;

  const url = `${getEnvironmentConfig().backendUrl}${CLIENT_ERROR_ENDPOINT}`;
  void axios.post(url, buildErrorPayload(error, context)).catch(() => {
    // Reporting a failure must never itself fail loudly.
  });
}
```

- [ ] **Step 4: Implement `src/app/ErrorBoundary.tsx`**

```tsx
import React from 'react';
import { reportClientError } from '../services/clientErrorApi';

interface Props { children: React.ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportClientError(error, { route: window.location.pathname });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="p-6 text-center">
        <p className="text-gm-body text-label">Something went wrong on this screen.</p>
        <button
          type="button"
          onClick={() => this.setState({ hasError: false })}
          className="mt-4 rounded-nested bg-sys-blue px-5 py-2 text-gm-body font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }
}
```

- [ ] **Step 5: Wrap each tab screen and register the global handler**

In `src/app/routes.tsx`, wrap each tab element: `<ErrorBoundary><DashboardScreen /></ErrorBoundary>`, and likewise for the other three. Per-screen, not per-app — one card throwing must not white-screen the whole session.

In `src/index.tsx`:

```tsx
window.addEventListener('unhandledrejection', (e) => {
  const error = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
  reportClientError(error, { route: window.location.pathname });
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/services/__tests__/clientErrorApi.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add client error capture with health-data redaction

Transport is behind REACT_APP_ENABLE_ERROR_REPORTING (default off) until
POST /api/client-errors exists in glucose-monitor-be."
```

---

### Task 22: Offline and stale-data safety net

**Files:**
- Create: `src/ui/OfflineBanner.tsx`
- Modify: `src/features/dashboard/DashboardScreen.tsx`, `src/state/GlucoseStore.tsx`
- Test: `src/features/dashboard/__tests__/staleness.test.tsx`

**Interfaces:**
- Consumes: `isStale`, `STALE_THRESHOLD_MS` (Task 8).
- Produces: `<OfflineBanner />`. Connectivity is read from `navigator.onLine` inside the
  banner rather than mirrored into `GlucoseState` — nothing else needs to branch on it,
  and duplicating browser state into a reducer invites the two drifting apart.

This closes acceptance criterion 10. `CompactGlucoseCard` already switches to stale treatment (Task 10); this task proves it under a cache-restored reading and adds the offline signal.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompactGlucoseCard } from '../cards/CompactGlucoseCard';

const staleReading = {
  value: 8.7,
  timestamp: new Date(Date.now() - 20 * 60 * 1000), // 20 min > 15 min threshold
  trend: 0, trendArrow: '↘', status: 'normal' as const, unit: 'mmol/L',
};

vi.mock('../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    currentReading: staleReading,
    calculations: { activeCarbsOnBoard: 25, activeInsulinOnBoard: 3.69, twoHourPrediction: 7.4 },
  }),
}));

describe('stale data safety', () => {
  it('a cached reading past the threshold renders as stale, never as current', () => {
    render(<MemoryRouter><CompactGlucoseCard /></MemoryRouter>);
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.queryByText('Normal')).not.toBeInTheDocument();
  });

  it('still shows the value and its age so the user can judge it', () => {
    render(<MemoryRouter><CompactGlucoseCard /></MemoryRouter>);
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByText(/Updated 20 min/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails or passes**

Run: `npx vitest run src/features/dashboard/__tests__/staleness.test.tsx`
Expected: PASS if Task 10 was implemented correctly. **If it passes immediately, do not skip the task** — the test is the deliverable, because it pins a safety property that must not silently regress. If it fails, fix `CompactGlucoseCard`.

- [ ] **Step 3: Implement `OfflineBanner`**

```tsx
import React, { useEffect, useState } from 'react';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="rounded-nested bg-orange-100 px-3 py-2 text-center">
      <p className="text-gm-caption font-semibold text-sys-orange">
        Offline — showing last known values
      </p>
    </div>
  );
};
```

- [ ] **Step 4: Mount it at the top of the dashboard scroll**

In `DashboardScreen.tsx`, render `<OfflineBanner />` as the first child of the card column, above `<IsfSuggestionCard />`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/features/dashboard/__tests__/staleness.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Verify offline behavior by hand**

Run `npm run dev`, load the dashboard, then switch the browser to offline in devtools. Expected: the banner appears, the last reading stays visible, and once it crosses 15 minutes the status pill reads `Stale`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add offline banner and pin the stale-reading safety property"
```

---

### Task 23: Remove EnhancedDashboard and verify acceptance

**Files:**
- Delete: `src/components/EnhancedDashboard.tsx`
- Modify: whatever still imports it
- Test: full suite

**Interfaces:**
- Consumes: everything above.
- Produces: the finished slice.

- [ ] **Step 1: Confirm nothing imports it**

```bash
cd src && grep -rn "EnhancedDashboard" . | grep -v node_modules
```

Expected: no results. If `routes.tsx` still references it, Task 15 Step 4 was skipped.

- [ ] **Step 2: Delete it**

```bash
git rm src/components/EnhancedDashboard.tsx
```

`CombinedGlucoseChart.tsx` and `NoteInputModal.tsx` become unreferenced at this point — their replacements are `ForecastChartCard` and `NoteEditorSheet`. Re-run the Task 2 Step 1 reachability check over both and delete any that are now dead. Do **not** delete `AIInsightPanel`, `NutritionAnalyzerModal`, `VersionInfo`, `DataSourceConfigModal`, `COBSettings`, `InsulinPreferencesSettings`, `LibreLinkUpTest`, `JwtLoginForm`, `NightscoutErrorBoundary` or `NightscoutFallbackUI` — all are still mounted.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: all tests pass. Record the count in the commit message.

- [ ] **Step 4: Verify the build and file-size rule**

```bash
npm run lint && npm run build
find src -name '*.tsx' -o -name '*.ts' | xargs wc -l | sort -rn | head -10
```

Expected: build succeeds and no file added by this slice exceeds 500 lines.

- [ ] **Step 5: Walk the acceptance criteria**

Serve the build over HTTPS and check each item from spec §15 on a real iPhone:

1. Installs to the home screen and launches chrome-free.
2. Four tabs render; Dashboard complete, Notes/Experiments stubs, Settings hosts the four config components.
3. Data-source, COB and insulin-preference configuration still open and save.
4. Seven cards in iOS order with correct conditional visibility.
5. Scrolls, pull-to-refresh works, safe areas respected.
6. Floating-capsule chrome with content visibly scrolling under the tab bar; large titles on three tabs, none on Dashboard.
7. All nine sheet routes and `/bedside` open, close, and respond to Back.
8. Only `CompactGlucose` re-renders on the 1 Hz tick — verify with React DevTools' "Highlight updates".
9. Logging out with a refresh in flight does not repopulate the dashboard.
10. A reading past 15 minutes renders visibly stale.
11. Client errors carry no health data (unit-tested; transport still disabled).
12. `npm run build` produces `build/`; Docker and Render paths unchanged.
13. No new file over 500 lines; the 2,844 dead lines are gone.
14. Side-by-side against the reference screenshots, the dashboard is the same design.

Record any item that fails as a follow-up issue rather than silently passing it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove EnhancedDashboard, completing slice A+B

The mobile-first DashboardScreen fully replaces the 1035-line desktop
kiosk dashboard."
```

---

## Deferred and Out of Scope

Recorded so they are not mistaken for oversights:

- **`POST /api/client-errors`** in `glucose-monitor-be` — a separate repo. Until it exists, `REACT_APP_ENABLE_ERROR_REPORTING` stays unset and no error POST is made.
- **Camera capture** (`/dashboard/scan`) — slice F, using the existing `POST /api/nutrition/analyze-image`. There is no browser equivalent of the iOS LiDAR volume estimation, so portion size will be entered manually.
- **Sheet drag-to-dismiss** — Escape, Done and Back all close sheets, which covers every real path.
- **Orange point markers and insulin bars on the chart** — added in Task 11 only if the Task 23 comparison shows the gap matters.
- **Notes, Experiments and Settings rebuilds** — slices C, D and E. Their visual contracts are already recorded in spec §7.1.
- **Web Push and background refresh** — slice G. iOS Safari has no Periodic Background Sync, so alarms must be server-pushed.
- **Reference screenshots** for sheets, scan, bedside and the lower dashboard — not captured. Components built for those screens are unverified against the real app.
