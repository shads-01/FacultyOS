# Faculty OS v3 — One-Journey Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the frontend as one judged journey — Dashboard (3-stage lifecycle map), wizard-ized heavy screens, next-action recommendations, demo mode, brutalist hover motion, favicon, mobile-first.

**Architecture:** One shared data layer (`src/lib/api.js`) routes every feature call either to mocks (demo mode) or real Frozen-Contract routes. One shared `Wizard` component serves screens with >2 fields. One `NextActions` pure module derives recommendations from any report shape. Existing report components (`CoverageMatrix`, `RecycledList`, `TagChips`, `OverlapReport`, `GraderConsistencyTable`, `GradingTable`) are reused unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4 + `fz-*` brutalist utility classes in `globals.css`, GSAP (existing wow-reveal only), `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-06-faculty-os-v3-design.md` (read together with this plan).

## Global Constraints

- Theme: paper `#FAF8F3`, ink `#111111`, red `#E11D1D` (flags only), yellow `#FFD23F` (CTA only), green `#86EFAC` (covered cells only). 2–3px solid `#111` borders, hard offset shadows, `border-radius: 0` everywhere.
- Fonts already wired: Archivo Black (`--font-display`), Space Grotesk (`--font-sans`), JetBrains Mono (`--font-mono`).
- Motion: hover transitions 150–200ms only; the single GSAP reveal (blank CLO row + top recycled row, `{opacity:0, y:12, duration:0.35, ease:'power1.out'}`) stays. `prefers-reduced-motion: reduce` kills everything.
- Mobile-first: base = single column; desktop ≥768px via `min-width`/`auto-fit` only; body ≥16px mobile; targets ≥44px; AA contrast.
- No new npm dependencies. No auth screens, no settings page, no backend routes in this plan.
- Commit after every task with the given message. Never touch `src/components/ui/**`.

---

### Task 1: Motion layer + favicon + root redirect

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/app/icon.svg`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `.fz-lift` (card hover), row-hover rule, themed selection/scrollbar. `src/app/page.tsx` redirects to `/dashboard`.

- [ ] **Step 1: Add hover/motion + browser chrome to `globals.css`**

Append to the `@layer components` block:

```css
  .fz-lift {
    transition: transform 150ms, box-shadow 150ms;
  }
  .fz-lift:hover { transform: translate(-2px, -2px); box-shadow: 9px 9px 0 #111; }
  .fz-table tbody tr { transition: background 150ms; }
  .fz-table tbody tr:hover { background: #F0EDE4; }
  .fz-table tbody tr:hover.fz-flag-row { background: #FECACA; }
  ::selection { background: #FFD23F; color: #111; }
  * { scrollbar-color: #111 #F0EDE4; }
  @media (prefers-reduced-motion: reduce) {
    .fz-lift, .fz-btn, .fz-table tbody tr { transition: none; }
  }
```

- [ ] **Step 2: Create `src/app/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="9" y="9" width="46" height="46" fill="#E11D1D"/>
  <rect x="4" y="4" width="46" height="46" fill="#FFD23F" stroke="#111111" stroke-width="5"/>
  <text x="14" y="40" font-family="Arial Black, sans-serif" font-size="30" font-weight="900" fill="#111111">F.</text>
</svg>
```

- [ ] **Step 3: Root redirect to dashboard** — replace `src/app/page.tsx` body with `redirect('/dashboard');` (import from `next/navigation`).

- [ ] **Step 4: Verify** — `npm run build` passes.
- [ ] **Step 5: Commit** — `feat: hover motion layer, favicon, dashboard redirect`

---

### Task 2: Demo-mode data layer (TDD)

**Files:**
- Create: `src/lib/api.js` (CommonJS + ESM guard, like `reportTransforms.js`)
- Test: `test/api.test.js`

**Interfaces:**
- Produces: `runFeature(screen, payload, mode)` → Promise resolving to the mock response for `screen` (one of `'analyze'|'overlap'|'grader-consistency'|'grade'`) after ~400ms when `mode === 'demo'`, else throws `'DEMO_OFF'` (real fetch is wired at integration, outside this plan).
- Consumes: `mockResponses.js` exports.

- [ ] **Step 1: Failing tests** (`test/api.test.js`):

```js
/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { runFeature } = require('../src/lib/api');

test('runFeature resolves the analyze mock in demo mode', async () => {
  const result = await runFeature('analyze', {}, 'demo');
  assert.ok(Array.isArray(result.clos));
});
test('runFeature routes each screen to its mock', async () => {
  const overlap = await runFeature('overlap', {}, 'demo');
  assert.ok(Array.isArray(overlap.overlaps));
  const grade = await runFeature('grade', {}, 'demo');
  assert.ok(Array.isArray(grade.results));
});
test('runFeature throws in live mode (no backend wired yet)', async () => {
  await assert.rejects(() => runFeature('analyze', {}, 'live'), /live mode not wired/);
});
test('runFeature rejects unknown screens', async () => {
  await assert.rejects(() => runFeature('nope', {}, 'demo'), /unknown screen/);
});
```

- [ ] **Step 2: Run** `node --test test/api.test.js` → FAIL (module missing).
- [ ] **Step 3: Implement** `src/lib/api.js`:

```js
const MOCKS = {
  analyze: () => import('./mockResponses').then((m) => m.analyzeResponse),
  overlap: () => import('./mockResponses').then((m) => m.overlapResponse),
  'grader-consistency': () => import('./mockResponses').then((m) => m.consistencyResponse),
  grade: () => import('./mockResponses').then((m) => m.gradeResponse),
};

export function isDemoMode() {
  return typeof window === 'undefined' || localStorage.getItem('fz-demo') !== 'off';
}

export async function runFeature(screen, payload, mode) {
  const resolvedMode = mode || (isDemoMode() ? 'demo' : 'live');
  const mock = MOCKS[screen];
  if (!mock) throw new Error(`unknown screen: ${screen}`);
  if (resolvedMode !== 'demo') throw new Error('live mode not wired — backend routes pending');
  await new Promise((r) => setTimeout(r, 400));
  return mock();
}
```

(ESM-only is fine here — it is bundler-only, never required by `node:test` directly... verify: `test/api.test.js` uses `require`. Apply the same dual-export guard used in `reportTransforms.js`: define functions with `function`, then `if (typeof module !== 'undefined') module.exports = { runFeature, isDemoMode };` — and write the mock map with a plain object of thunks importing statically at top instead of dynamic imports. Keep it CJS-compatible exactly like `reportTransforms.js`.)

- [ ] **Step 4: Run tests** → PASS (4).
- [ ] **Step 5: Commit** — `feat: demo-mode data layer with per-screen mocks`

---

### Task 3: NextActions recommendation rules (TDD)

**Files:**
- Create: `src/lib/nextActions.js`
- Test: `test/nextActions.test.js`
- Create: `src/components/NextActions.jsx`

**Interfaces:**
- Produces: `buildNextActions(screen, report) -> string[]` — pure; `screen ∈ analyze|overlap|grader-consistency|grade`.
  - analyze: per blank CLO row → `CLO{n} untested — add a question at Analyze level`; per similarity ≥80% → `rewrite Q{n} or retire it — {percent}% match to {year} {matchedQuestion}`.
  - overlap: per overlap ≥80% → `differentiate or drop {topic} — {percent}% overlap with {existingCourse}`; per gap → `gap: {gap} not covered — add or justify`.
  - grader-consistency: ≥1 flag → `{flags} divergent pairs — recalibrate with the grader`; 0 → `graders are aligned`.
  - grade: per |delta| ≥3 → `align rubric wording on A{n}` (parse leading answer id from `answer`); none → `grader and AI agree`.
- `NextActions.jsx` renders `<div className="fz-card"><h3 className="fz-label">WHAT TO DO NEXT</h3><ol>…` with 2px-bordered rows; hidden if list is empty.

- [ ] **Step 1: Failing tests** — cover: blank CLO produces its action; 92% similarity produces rewrite action; overlap ≥80% + gap produce actions; consistency 2 flags produces count action; grade delta ≥3 produces rubric action; clean reports produce empty/positive arrays as specified above.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** pure module (CJS-compatible export guard). **Step 4: Run** → PASS. **Step 5: Commit** — `feat: next-action recommendation rules + strip`

---

### Task 4: Wizard + IdentityChip components

**Files:**
- Create: `src/components/Wizard.jsx`
- Create: `src/components/IdentityChip.jsx`

**Interfaces:**
- `Wizard({ steps, onFinish })` — `steps: [{ title, fields: [{id, label, hint, placeholder, required, example}], review(report-fields) }]` … concretely: each screen passes `steps = [{title:'PASTE', content: <jsx>}, {title:'REVIEW', content}, {title:'REPORT', content}]`; Wizard owns `step` state (0-based), renders `STEP {n+1}/{total}` label in `.fz-label`, Back/Next `.fz-btn` row (Next hidden on last step), sticky bottom action bar on mobile (`position: sticky; bottom: 0; background: #FAF8F3; border-top: 3px solid #111; padding: 12px 0`). Ctrl+Enter calls `next()` when allowed.
- `IdentityChip` — nav chip; click prompts inline (small popover-less bordered input) for a name, stores `localStorage.fz-identity`; after set, shows `WHO'S GRADING: {NAME}`; click again to edit. 44px target.

- [ ] **Step 1:** Implement both components per above (no test — thin UI glue over state).
- [ ] **Step 2:** `npm run build` passes. **Step 3: Commit** — `feat: shared wizard stepper + identity chip`

---

### Task 5: Nav rework + Dashboard page

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboard/page.js`

**Interfaces:**
- Nav: tabs = Dashboard, Exam Quality, Syllabus Overlap, Grader Consistency, AI Grading, History — plus `IdentityChip` and `DEMO` chip (toggle: `localStorage.fz-demo` = `'off'|'on'`, default demo; label `DEMO: ON`/`LIVE`, red border when OFF... default ON, yellow). Single row desktop; `overflow-x: auto` chip row mobile; active tab inverted.
- Dashboard: `<h1 className="fz-display">` + 3 `.fz-card.fz-lift` stage cards (JOURNEY 01/02/03… no — spec bans section numbers as decoration; use stage names as headings): `DESIGN COURSE → /syllabus-overlap`, `BUILD THE EXAM → /exam-quality`, `GRADE FAIRLY → /grader-consistency` and `/ai-grading` (4 cards in the same 3-stage row: stage 3 holds two links). Each card: name, one-line "what it catches", input needed, arrow. Below: `RECENT RUNS` list (reuse `runsResponse.runs` via demo mode; click → `/history`). Empty state: "No runs yet — start at DESIGN COURSE."

- [ ] **Step 1:** Implement. **Step 2:** `npm run build` + browser check `/` → dashboard renders, cards hover-lift. **Step 3: Commit** — `feat: journey dashboard + nav rework`

---

### Task 4b (before Task 6): demo example inputs

**Files:**
- Modify: `src/components/mockResponses.js`

**Interfaces:**
- Produces: `export const demoInputs = { examQuality: { clos, exam, pastExams }, overlap: { proposedSyllabus, existingSyllabi }, consistency: { rubric, studentAnswers, graderScores }, grade: { rubric, modelAnswer, studentAnswers, humanScores } }` — realistic strings (the Arko demo dataset: CLO1–4, 3 questions, 2024 Fibonacci past block; consistency: 4 numbered answers + `Alex,1,8\nAlex,3,6\nJordan,1,10\nJordan,3,10`; grade mirrors grading mock with `1,9` human scores).

- [ ] **Step 1:** Add `demoInputs`. **Step 2: Commit** — `chore: demo input examples for load-example buttons`

---

### Task 6–9: The four feature screens (parallelizable — disjoint files)

Each screen keeps its existing report components; swaps its ad-hoc form for the Wizard/Load-example flow; routes submission through `runFeature`; appends `<NextActions/>`; applies `.fz-lift` to cards.

**Task 6 — Exam Quality** (`src/app/(app)/exam-quality/page.js`)
- Wizard 3 steps: PASTE (3 fields + demoInputs.examQuality load) → REVIEW (parsed counts) → REPORT (existing `ExamQualityReport` + `<NextActions screen="analyze" report={report}/>`). `runFeature('analyze', {clos, exam, pastExams})`. Keep GSAP reveal + History section on the report step. Demo-run link: `NEXT: GRADE FAIRLY →` footer link to `/grader-consistency`.

**Task 7 — Syllabus Overlap** (`src/app/(app)/syllabus-overlap/page.js`)
- Single step (2 fields + Load example) → `runFeature('overlap', …)` → existing `OverlapReport` + `<NextActions screen="overlap" …/>`. Footer link: `NEXT: BUILD THE EXAM →`.

**Task 8 — Grader Consistency** (`src/app/(app)/grader-consistency/page.js`)
- Single step (3 fields + Load example) → `runFeature('grader-consistency', …)` → existing table + `<NextActions screen="grader-consistency" …/>`. Footer link: `NEXT: AI ANCHOR →`.

**Task 9 — AI Grading** (`src/app/(app)/ai-grading/page.js`)
- Wizard 3 steps (4 fields + Load example) → `runFeature('grade', …)` → existing `GradingTable` + `<NextActions screen="grade" …/>`.

Each: **Step 1** implement, **Step 2** `npm run build` + click-through (Load example → submit → report → recommendations visible), **Step 3** commit (`feat: <screen> as one-journey flow`).

---

### Task 10: History page

**Files:**
- Create: `src/app/(app)/history/page.js`

**Interfaces:**
- `runFeature`-independent: reads runs list (demo mode → `runsResponse.runs`; live → GET /api/runs TODO comment). Rows: timestamp + "3 questions · 4 CLOs" summary (derived from `result`); click expands/reveals full `ExamQualityReport` inline (import it from a shared location — extract `ExamQualityReport` from exam-quality page into `src/components/ExamQualityReport.jsx` during Task 6 so both import it).

- [ ] **Step 1:** Extract `ExamQualityReport` into `src/components/ExamQualityReport.jsx` (props: `report`, `blankRowRef?`, `topRecycledRef?`), re-import in exam-quality page. **Step 2:** Build history page. **Step 3:** Verify + **Commit** — `feat: history page with report replay`

---

### Task 11: End-to-end verify

- [ ] `npm run lint` → clean; `npm run build` → clean; `node --test test/reportTransforms.test.js test/api.test.js test/nextActions.test.js` → all pass.
- [ ] Browser: full demo path (Dashboard → Exam Quality → Load example → Analyze → flags + recommendations → History → replay → Grader Consistency → Load example → Check → flags). Mobile viewport 390px: nav scrolls, sticky CTA present, no overflow. Reduced-motion: no animations.
- [ ] Commit any fixes — `chore: v3 end-to-end verification pass`
