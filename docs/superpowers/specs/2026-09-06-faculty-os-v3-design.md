# Faculty OS v3 — "One Journey" Overhaul (Spec)

**Date:** 2026-09-06 · **Status:** approved design, pre-implementation
**Problem statement alignment:** judges reward *one convincing working flow*, penalize breadth-without-depth. v3 cuts all judge-zero screens (auth/profile/settings) and spends every build minute on the judged journey.

## Product truth

- Faculty pastes documents → AI audits them → flagged report + next-action recommendations. We never generate content; we generate *judgment support* (compare, discover, evaluate, recommend).
- Theme: **Brutalist Academic** (sample 04, approved) — paper `#FAF8F3`, ink `#111`, 2–3px solid borders, hard offset shadows, Archivo Black display / Space Grotesk body / JetBrains Mono data. Zero border-radius.
- Demo safety: **Demo mode** returns mock Frozen-Contract data through one shared API layer, so the app demos fully before backend routes exist.

## IA — 7 routes

| Route | Purpose | Wizard? |
|---|---|---|
| `/` | **Dashboard** — the journey map: 3 stage cards (Design course → Build exam → Grade fairly), each with "what it catches · input needed", recent runs, demo-mode chip | — |
| `/syllabus-overlap` | Proposed vs existing syllabi → overlap % + gaps + next-actions | no (2 fields) |
| `/exam-quality` | CLOs + draft + past exams → coverage matrix, recycled list, tags, next-actions | yes (3 fields) |
| `/grader-consistency` | Rubric + answers + scores → flagged pairs + next-actions | no (3 fields, single step) |
| `/ai-grading` | Rubric + model answer + answers (+optional human scores) → delta table + next-actions | yes (4 fields) |
| `/history` | Saved exam-quality runs, click → full report | — |
| *(auth/profile/settings)* | **Cut** — replaced by a `WHO'S GRADING` identity chip in the nav (localStorage name). Auth returns as P3 if time remains | — |

## Mechanics

- **Wizard** (`components/Wizard.jsx`): shared ~60-line stepper — `STEP n/N` brutalist progress label, Back/Next, per-field `.fz-textarea` + `.fz-label` + format hint, **Load example** autofill per screen, Ctrl+Enter advances. Step 2 = review summary (parsed counts) before the LLM call; Step 3 = report. Only used on screens with >2 fields.
- **Data layer** (`lib/api.js`): `runFeature(screen, payload)` — demo mode ON → resolve mock after ~400ms; OFF → real `fetch` to the Frozen-Contract route. One integration swap point, forever.
- **Recommendations strip** (`components/NextActions.jsx`): pure client-side rules from report data — untested CLO → "add a Q at [bloom] level"; overlap ≥80% → "differentiate or drop"; |delta| ≥3 → "align rubric wording"; flag count → "recalibrate with grader". Rendered as `WHAT TO DO NEXT` bordered list under every report.
- **Nav**: 4 tool tabs + History + demo chip + identity chip; single-row on desktop, horizontally scrollable on mobile.

## Motion & hover (new this pass)

One authored moment stays: the GSAP wow-reveal (blank CLO row + top recycled badge), `prefers-reduced-motion`-gated. All other motion is hover feedback, 150–200ms:
- `.fz-card:hover` — offset shadow grows (6px→9px) while card translates (-2px,-2px); rests back on leave
- `.fz-btn` — hover bg shift; `:active` translate+shadow-collapse (existing); disabled dims
- `.fz-table tbody tr:hover` — row tint `#F0EDE4`
- Nav tabs — hover invert preview (bg ink at 8%)
- Focus states: 3px ink outline everywhere (keyboard parity)
- `prefers-reduced-motion: reduce` kills all transitions + the reveal

## Favicon & browser chrome

- `src/app/icon.svg` — brutalist mark: yellow square, 3px ink border, red offset shadow, ink "F." glyph (Next auto-serves as favicon + og)
- `selection` color, focus ring, and scrollbar themed from the palette (craft-floor browser-surfaces rule)

## Mobile-first (glmshadsuxpeak floor)

- Base CSS = mobile (~360–430px): single column, nav becomes horizontal-scroll chip row, sticky bottom action bar with the submit CTA on input steps
- Desktop (≥768px) via `min-width` media queries only; grids already intrinsic (`auto-fit, minmax`)
- Floors: AA contrast (ink on paper = 16:1; red-on-paper ≥4.5 for 12px+ text), targets ≥44px, body ≥16px on mobile, visible focus, semantic HTML

## Files

New: `src/app/(app)/dashboard/page.js`, `(app)/history/page.js`, `components/Wizard.jsx`, `components/NextActions.jsx`, `components/IdentityChip.jsx`, `src/lib/api.js`, `src/app/icon.svg`
Modified: `src/app/page.tsx` (redirect `/`→`/dashboard`), `(app)/layout.tsx` (nav rework), 4 feature pages, `mockResponses.js` (+ demo input examples + example-input text), `globals.css` (hover/motion/selection/scrollbar tokens)

## Testing & verify

- `node:test`: pure logic stays green (`reportTransforms`); add `test/nextActions.test.js` (recommendation rules) + `test/api.test.js` (demo-mode routing) — TDD, small.
- `npm run build` + `npm run lint` + browser smoke on dev server.
- Demo rehearsal path: Dashboard → Exam Quality → Load example → Analyze → flags + recommendations → History. Then Grader Consistency → Load example → Check.

## Non-goals (v3)

Login/signup/profile/settings screens, report export, file upload, charting libs, new backend routes, charting, i18n, dark mode.
