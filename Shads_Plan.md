# Faculty OS — Shads' Plan (Frontend, All 4 Screens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the UI for all 4 screens — Exam Quality (+History), Syllabus Overlap, Grader Consistency, AI-Anchored Grading — entirely against your own mock data matching `plan.md`'s Frozen Contract, so none of your work is blocked on Arko's or Hrittika's routes existing yet.

**Architecture:** Next.js App Router pages under `app/(app)/**`, one per screen, each a client component using `useState`/`useEffect` only (no state library). Every screen is built and demoable against a local mock-response module first; swapping to the real route is a one-line `fetch` URL change per screen, done last (Task 9), once the backend is deployed. Report-rendering logic (coverage matrix, recycled list, Bloom distribution) is your own copy of pure functions — not imported from Arko's `lib/`, per `plan.md`'s shared-file-risk fix, so you never wait on his commits.

**Tech Stack:** Next.js (App Router), Tailwind, shadcn/ui ("New York" style per `DESIGN.md`), GSAP (for the one wow-moment reveal only), Plus Jakarta Sans font. No Supabase client dependency needed in this plan at all — real auth (`@supabase/ssr`) is entirely Arko's files (login/signup pages, middleware); your pages just call `fetch` and the browser sends the session cookie automatically, same-origin. *(Reversed 2026-09-06 from an earlier anonymous-auth design that had you calling `signInAnonymously()` client-side — see `context.md`'s "Auth" section.)*

**Spec:** `plan.md` and `DESIGN.md` at the project root, plus this plan.

## Global Constraints

- File ownership — you touch **only**: `app/page.js` (root redirect, replacing the scaffold default — coordinate with Arko: he ships the stock scaffold in his Task 1 and never edits `app/page.js` again), `app/(app)/**`, `components/**`. Never touch `app/api/**`, `app/(auth)/**` (Arko's login/signup), `lib/analyze.js`, `lib/types.ts`, `lib/overlap.js`, `lib/graderConsistency.js`, `lib/grade.js`, `lib/supabase/client.js`, `lib/supabase/server.js`, `src/middleware.js`, `supabase/**`, `fixtures/**`.
- No shared `lib/types.ts` import — keep your own local copy of the response shapes in `components/mockResponses.js` (duplication is intentional, per `plan.md`).
- Auth is not your concern at all (reversed 2026-09-06 — was anonymous auth requiring a client-side `signInAnonymously()` call and manual `Bearer` header; now real auth, entirely Arko's `middleware.js` + login/signup pages). `src/app/(app)/**` only renders for a signed-in visitor in the first place — `middleware.js` redirects anyone else to `/login` before your code runs. Plain `fetch('/api/analyze', ...)` and `fetch('/api/runs')` send the session cookie automatically since it's same-origin — no auth header, no token, no Supabase client import needed in your files.
- Density: input areas use 24px gaps; the report view underneath switches to dense mode (`--grid-gap: 8px`, `--card-padding: 12px`, `--font-size-small: 12px`, `--table-row-height: 36px`) per `DESIGN.md`.
- Colors, typography, and motion exactly per `DESIGN.md`'s tokens — no invented palette, no extra animation.
- No state management library, no premature abstraction — `useState`/`useEffect` is enough for 4 screens.
- Only the wow-moment reveal animates: GSAP, `{ opacity: 0, y: 12, duration: 0.35, ease: 'power1.out' }`, applied once on first render after Analyze succeeds, to exactly two elements (the blank CLO row, the top recycled-question row). Nothing else animates. Respect `prefers-reduced-motion`.
- Text-paste input only, no file upload, no charting library.
- The wow-moment layout requirement is load-bearing: at 1440×900, the Coverage Matrix and Recycled Questions cards must both be visible without scrolling as soon as the Exam Quality report renders.
- **Input conventions** (bake these into placeholder text so faculty type what the backend parsers expect — identical wording to Hrittika's plan, since you're both targeting the same 3 secondary routes):
  - **Syllabus Overlap** — Proposed syllabus: one topic per line. Existing syllabi: repeated blocks, each a bare course-name line followed by its topics (one per line), a blank line separating courses.
  - **Grader Consistency** — Rubric: free text. Student answers: one numbered answer per line (`1. ...`). Grader scores: one line per triple, `GraderName,answerNumber,score` — e.g. `Alex,1,8`.
  - **AI-Anchored Grading** — Rubric: free text. Model answer: free text. Student answers: one numbered answer per line (`1. ...`). Human scores (optional): one line per answer, `answerNumber,score` — e.g. `1,8`.
  - **Exam Quality** — CLOs: one per line, optionally prefixed `CLOn:` (auto-numbered if not). Exam questions / past-exam questions: one per numbered line (`1. ...` or `1) ...`). Past exams: a bare 4-digit year on its own line starts a new year's block.

---

## File Structure

- `app/page.js` — redirects to `/exam-quality` (there is no "home" screen — `plan.md` is explicit that none of the 4 screens is "the main one").
- `app/(app)/layout.js` — 4-tab nav shell, Plus Jakarta Sans, DESIGN.md color tokens as CSS variables.
- `app/(app)/exam-quality/page.js` — Feature #1/#5/#4 + #6 (History).
- `app/(app)/syllabus-overlap/page.js` — Feature #3.
- `app/(app)/grader-consistency/page.js` — Feature #2.
- `app/(app)/ai-grading/page.js` — Feature #8.
- `components/reportTransforms.js` — `buildCoverageMatrix`, `buildRecycledList`, `buildBloomDistribution` (your own pure copy).
- `components/mockResponses.js` — mock JSON matching all 5 routes' response shapes.
- `components/CoverageMatrix.jsx`, `components/RecycledList.jsx`, `components/TagChips.jsx` — Exam Quality screen pieces.
- `components/OverlapReport.jsx` — Syllabus Overlap screen.
- `components/GraderConsistencyTable.jsx` — Grader Consistency screen.
- `components/GradingTable.jsx` — AI-Anchored Grading screen.
- `test/reportTransforms.test.js` — `node:test` suite for the one pure-logic file.

---

### Task 0: Shared scaffold (skip if it's already in the repo)

**Files:**
- Create (only if missing): `package.json`, `next.config.js`, `app/layout.js`, `app/page.js`, Tailwind + shadcn config files.

**Interfaces:**
- Produces: a runnable Next.js App Router project at repo root.

- [ ] **Step 1: Check whether the scaffold already exists**

```bash
cd /c/Users/hritt/faculty-os
git status
```

If `package.json` already exists with a `next` dependency, Arko or Hrittika beat you to it — run `git pull` and skip to Task 1.

- [ ] **Step 2: Init git and scaffold Next.js + Tailwind + shadcn**

```bash
git init
npx create-next-app@latest . --js --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
npx shadcn@latest init -d
npx shadcn@latest add card table button textarea tabs badge
```

- [ ] **Step 3: Commit immediately**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + shadcn"
```

If this races with someone else's identical scaffold commit, keep theirs (`git reset --hard origin/main`) — the output is deterministic, nothing of yours is lost.

---

### Task 1: App shell — 4-tab nav + design tokens

**Files:**
- Create: `app/page.js`
- Create: `app/(app)/layout.js`
- Create: `app/(app)/exam-quality/page.js`, `app/(app)/syllabus-overlap/page.js`, `app/(app)/grader-consistency/page.js`, `app/(app)/ai-grading/page.js` (placeholders)
- Modify: `app/layout.js` (font + CSS variables)

**Interfaces:**
- Produces: the nav shell every later screen task renders inside.

- [ ] **Step 1: Root redirect**

`app/page.js`:
```jsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/exam-quality');
}
```

- [ ] **Step 2: Add Plus Jakarta Sans + color tokens to the root layout**

Modify `app/layout.js` — add the font link and CSS variables from `DESIGN.md`:
```jsx
export const metadata = { title: 'Faculty OS' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <style>{`
          :root {
            --color-primary: #0D9488;
            --color-on-primary: #000000;
            --color-secondary: #14B8A6;
            --color-on-secondary: #0F172A;
            --color-accent: #EA580C;
            --color-on-accent: #000000;
            --color-background: #F0FDFA;
            --color-foreground: #134E4A;
            --color-card: #FFFFFF;
            --color-card-foreground: #134E4A;
            --color-muted: #E8F1F4;
            --color-muted-foreground: #475569;
            --color-border: #99F6E4;
            --color-destructive: #DC2626;
            --color-on-destructive: #FFFFFF;
            --color-ring: #0D9488;
          }
          body { background: var(--color-background); color: var(--color-foreground); margin: 0; }
        `}</style>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 4-tab nav shell**

`app/(app)/layout.js`:
```jsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/exam-quality', label: 'Exam Quality' },
  { href: '/syllabus-overlap', label: 'Syllabus Overlap' },
  { href: '/grader-consistency', label: 'Grader Consistency' },
  { href: '/ai-grading', label: 'AI-Anchored Grading' },
];

export default function AppLayout({ children }) {
  const pathname = usePathname();
  return (
    <div>
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', padding: '0 24px', background: 'var(--color-card)' }}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="cursor-pointer"
            style={{
              padding: '14px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: pathname === tab.href ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
              borderBottom: pathname === tab.href ? '2px solid var(--color-primary)' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 200ms',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Placeholder pages for the 3 screens built later**

`app/(app)/syllabus-overlap/page.js`, `app/(app)/grader-consistency/page.js`, `app/(app)/ai-grading/page.js` — each:
```jsx
export default function PlaceholderPage() {
  return <p style={{ color: 'var(--color-muted-foreground)' }}>Coming in a later task.</p>;
}
```
(Copy this into all 3 files, changing nothing — Tasks 6-8 replace each one.)

`app/(app)/exam-quality/page.js` — same placeholder for now; Task 3 replaces it.

- [ ] **Step 5: Manual verification**

```bash
npm run dev
```
Open `http://localhost:3000` → confirm it redirects to `/exam-quality`, all 4 tabs are visible and clickable, active tab is highlighted teal, font is Plus Jakarta Sans (check devtools).

- [ ] **Step 6: Commit**

```bash
git add app/page.js app/layout.js "app/(app)"
git commit -m "feat: add 4-tab nav shell and design tokens"
```

---

### Task 2: Report transform functions

**Files:**
- Create: `components/reportTransforms.js`
- Create: `test/reportTransforms.test.js`

**Interfaces:**
- Produces: `buildCoverageMatrix(clos, questions, analysis) -> [{clo, covered: boolean[], isBlank: boolean}]`, `buildRecycledList(questions, analysis) -> [{question, similarity}]` (sorted desc by `similarity.percent`, filtered to `>= 60`), `buildBloomDistribution(analysis) -> [{level, count}]`. Uses the Frozen Contract's field names: `Question = {number, text}`, `QuestionAnalysis = {questionNumber, coveredCLOs, topic, bloom, similarity}`. Consumed by Task 3's `CoverageMatrix`/`RecycledList`/`TagChips` components.

- [ ] **Step 1: Write the failing tests**

`test/reportTransforms.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { buildCoverageMatrix, buildRecycledList, buildBloomDistribution } = require('../components/reportTransforms');

test('buildCoverageMatrix flags a CLO with zero covering questions as blank', () => {
  const clos = [{ id: 'CLO1', text: 'a' }, { id: 'CLO2', text: 'b' }];
  const questions = [{ number: 1, text: 'q1' }, { number: 2, text: 'q2' }];
  const analysis = [
    { questionNumber: 1, coveredCLOs: ['CLO1'], bloom: 'Apply', topic: 't', similarity: null },
    { questionNumber: 2, coveredCLOs: ['CLO1'], bloom: 'Apply', topic: 't', similarity: null },
  ];
  const matrix = buildCoverageMatrix(clos, questions, analysis);
  assert.strictEqual(matrix[0].isBlank, false);
  assert.strictEqual(matrix[1].isBlank, true);
});

test('buildRecycledList sorts by similarity percent descending and drops low matches', () => {
  const questions = [{ number: 1, text: 'q1' }, { number: 2, text: 'q2' }, { number: 3, text: 'q3' }];
  const analysis = [
    { questionNumber: 1, similarity: { year: '2024', matchedQuestion: 'Q1', percent: 65, reason: 'r' } },
    { questionNumber: 2, similarity: { year: '2024', matchedQuestion: 'Q2', percent: 92, reason: 'r' } },
    { questionNumber: 3, similarity: null },
  ];
  const result = buildRecycledList(questions, analysis);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].question.number, 2);
});

test('buildBloomDistribution counts every level including zero counts', () => {
  const analysis = [
    { questionNumber: 1, bloom: 'Apply' },
    { questionNumber: 2, bloom: 'Apply' },
    { questionNumber: 3, bloom: 'Remember' },
  ];
  const dist = buildBloomDistribution(analysis);
  const apply = dist.find((d) => d.level === 'Apply');
  const create = dist.find((d) => d.level === 'Create');
  assert.strictEqual(apply.count, 2);
  assert.strictEqual(create.count, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../components/reportTransforms'`

- [ ] **Step 3: Write the minimal implementation**

`components/reportTransforms.js`:
```js
function buildCoverageMatrix(clos, questions, analysis) {
  const analysisByNumber = new Map(analysis.map((a) => [a.questionNumber, a]));
  return clos.map((clo) => {
    const covered = questions.map((q) => {
      const a = analysisByNumber.get(q.number);
      return !!(a && a.coveredCLOs && a.coveredCLOs.includes(clo.id));
    });
    return { clo, covered, isBlank: covered.every((c) => !c) };
  });
}

function buildRecycledList(questions, analysis) {
  const analysisByNumber = new Map(analysis.map((a) => [a.questionNumber, a]));
  return questions
    .map((q) => ({ question: q, similarity: analysisByNumber.get(q.number)?.similarity || null }))
    .filter((item) => item.similarity && item.similarity.percent >= 60)
    .sort((a, b) => b.similarity.percent - a.similarity.percent);
}

function buildBloomDistribution(analysis) {
  const levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const counts = Object.fromEntries(levels.map((l) => [l, 0]));
  for (const a of analysis) {
    if (counts[a.bloom] !== undefined) counts[a.bloom]++;
  }
  return levels.map((level) => ({ level, count: counts[level] }));
}

if (typeof module !== 'undefined') {
  module.exports = { buildCoverageMatrix, buildRecycledList, buildBloomDistribution };
}
```

(The `if (typeof module !== 'undefined')` guard lets this same file be both `require`d by `node:test` and `import`ed by your React components via Next's bundler.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/reportTransforms.js test/reportTransforms.test.js
git commit -m "feat: add report transform functions (coverage, recycled, bloom)"
```

---

### Task 3: Mock responses + Exam Quality screen (inputs, Analyze, report)

**Files:**
- Create: `components/mockResponses.js`
- Create: `components/CoverageMatrix.jsx`
- Create: `components/RecycledList.jsx`
- Create: `components/TagChips.jsx`
- Modify: `app/(app)/exam-quality/page.js`

**Interfaces:**
- Consumes: `reportTransforms.js` (Task 2).
- Produces: the Exam Quality screen, wired to `mockResponses.analyzeResponse` (an `AnalysisResult`-shaped object: `{clos, questions, analysis}`) instead of a real `fetch` for now. Task 9 swaps in the real call.

- [ ] **Step 1: Write the mock responses file**

`components/mockResponses.js`:
```js
export const analyzeResponse = {
  clos: [
    { id: 'CLO1', text: 'Explain Big-O time complexity' },
    { id: 'CLO2', text: 'Implement recursive algorithms' },
    { id: 'CLO3', text: 'Analyze sorting algorithm tradeoffs' },
    { id: 'CLO4', text: 'Design a hash table from scratch' },
  ],
  questions: [
    { number: 1, text: 'What is the time complexity of binary search, and why?' },
    { number: 2, text: 'Write a recursive function to compute the nth Fibonacci number.' },
    { number: 3, text: 'Compare the average-case and worst-case time complexity of quicksort vs mergesort.' },
  ],
  analysis: [
    { questionNumber: 1, coveredCLOs: ['CLO1'], bloom: 'Understand', topic: 'Binary search', similarity: null },
    {
      questionNumber: 2,
      coveredCLOs: ['CLO2'],
      bloom: 'Apply',
      topic: 'Recursion',
      similarity: { year: '2024', matchedQuestion: 'Q1', percent: 92, reason: 'Same Fibonacci-by-recursion task, reworded.' },
    },
    { questionNumber: 3, coveredCLOs: ['CLO3'], bloom: 'Analyze', topic: 'Sorting tradeoffs', similarity: null },
  ],
};

export const runsResponse = {
  runs: [
    { id: 'mock-run-1', created_at: new Date().toISOString(), result: analyzeResponse },
  ],
};

export const overlapResponse = {
  overlaps: [{ topic: 'Recursion', overlapPercent: 90, existingCourse: 'Intro to Algorithms' }],
  gaps: ['Hash tables'],
};

export const consistencyResponse = {
  flags: [{ answerA: 'A1', answerB: 'A3', scoreA: 10, scoreB: 6, grader: 'Alex' }],
};

export const gradeResponse = {
  results: [
    { answer: 'A3: Logarithmic.', humanScore: 10, aiScore: 6, delta: -4, reason: 'Correct but unjustified per rubric.' },
    { answer: 'A1: O(log n), because it halves the search space.', humanScore: 9, aiScore: 9, delta: 0, reason: 'Correct and justified.' },
  ],
};
```

- [ ] **Step 2: Coverage Matrix component**

`components/CoverageMatrix.jsx`:
```jsx
export default function CoverageMatrix({ matrix, questions, blankRowRef }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={cellStyle}>CLO</th>
            {questions.map((q) => (
              <th key={q.number} style={cellStyle}>Q{q.number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr
              key={row.clo.id}
              ref={row.isBlank ? blankRowRef : undefined}
              style={row.isBlank ? { background: '#FEF2F2' } : undefined}
            >
              <th style={{ ...cellStyle, textAlign: 'left', color: row.isBlank ? 'var(--color-destructive)' : undefined }}>
                {row.clo.id}{row.isBlank ? ' — never tested' : ''}
              </th>
              {row.covered.map((covered, j) => (
                <td key={j} style={{ ...cellStyle, background: covered ? '#DCFCE7' : undefined }}>
                  {covered ? '✓' : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle = { border: '1px solid var(--color-border)', padding: '6px 8px', textAlign: 'center', height: 36 };
```

- [ ] **Step 3: Recycled List component**

`components/RecycledList.jsx`:
```jsx
export default function RecycledList({ recycled, topRowRef }) {
  if (recycled.length === 0) {
    return <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>No recycled questions found (≥60% similarity).</p>;
  }
  return (
    <div>
      {recycled.map((item, i) => {
        const pct = item.similarity.percent;
        const high = pct >= 80;
        return (
          <div
            key={item.question.number}
            ref={i === 0 ? topRowRef : undefined}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}
          >
            <span>Q{item.question.number}: {item.question.text}</span>
            <span style={{ fontWeight: 700, color: high ? 'var(--color-destructive)' : '#D97706', whiteSpace: 'nowrap' }}>
              {pct}% match to {item.similarity.year} {item.similarity.matchedQuestion}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Tag Chips component**

`components/TagChips.jsx`:
```jsx
export default function TagChips({ questions, analysis }) {
  const byNumber = new Map(analysis.map((a) => [a.questionNumber, a]));
  return (
    <div>
      {questions.map((q) => {
        const a = byNumber.get(q.number);
        if (!a) return null;
        return (
          <div key={q.number} style={{ marginBottom: 8 }}>
            <b style={{ fontSize: 12 }}>Q{q.number}</b>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              <span style={chipStyle}>{a.topic}</span>
              <span style={chipStyle}>{a.bloom}</span>
              {a.coveredCLOs.map((c) => <span key={c} style={chipStyle}>{c}</span>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const chipStyle = { background: 'var(--color-muted)', borderRadius: 999, padding: '2px 10px', fontSize: 11 };
```

- [ ] **Step 5: Wire the Exam Quality page to the mock response**

`app/(app)/exam-quality/page.js`:
```jsx
'use client';
import { useState } from 'react';
import { analyzeResponse } from '../../../components/mockResponses';
import { buildCoverageMatrix, buildRecycledList, buildBloomDistribution } from '../../../components/reportTransforms';
import CoverageMatrix from '../../../components/CoverageMatrix';
import RecycledList from '../../../components/RecycledList';
import TagChips from '../../../components/TagChips';

export default function ExamQualityPage() {
  const [clos, setClos] = useState('');
  const [exam, setExam] = useState('');
  const [pastExams, setPastExams] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    // TODO(Task 9): replace with a real POST /api/analyze call (plain fetch — session cookie sent automatically).
    await new Promise((r) => setTimeout(r, 300));
    setReport(analyzeResponse);
    setLoading(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Exam Quality</h1>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13, marginBottom: 20 }}>
        Paste your Course Learning Outcomes, this year's draft exam, and past exams.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        <div>
          <label style={labelStyle}>Course Learning Outcomes</label>
          <textarea
            style={textareaStyle}
            value={clos}
            onChange={(e) => setClos(e.target.value)}
            placeholder={'CLO1: Explain time complexity\nCLO2: Implement recursive algorithms'}
          />
        </div>
        <div>
          <label style={labelStyle}>Draft Exam (this year)</label>
          <textarea
            style={textareaStyle}
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            placeholder={'1. Question text...\n2. Question text...'}
          />
        </div>
        <div>
          <label style={labelStyle}>Past Exams</label>
          <textarea
            style={textareaStyle}
            value={pastExams}
            onChange={(e) => setPastExams(e.target.value)}
            placeholder={'2024\n1. Question...\n2. Question...\n\n2022\n1. Question...'}
          />
        </div>
      </div>

      <button className="cursor-pointer" style={buttonStyle} onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>

      {report && <ExamQualityReport report={report} />}
    </div>
  );
}

function ExamQualityReport({ report }) {
  const matrix = buildCoverageMatrix(report.clos, report.questions, report.analysis);
  const recycled = buildRecycledList(report.questions, report.analysis);
  const bloom = buildBloomDistribution(report.analysis);
  const blankCount = matrix.filter((r) => r.isBlank).length;

  return (
    <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={cardStyle}>
        <h3 style={h3Style}>CLO Coverage Matrix ({blankCount} untested)</h3>
        <CoverageMatrix matrix={matrix} questions={report.questions} />
      </div>
      <div style={cardStyle}>
        <h3 style={h3Style}>Recycled Questions</h3>
        <RecycledList recycled={recycled} />
      </div>
      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <h3 style={h3Style}>Per-Question Tags</h3>
        <TagChips questions={report.questions} analysis={report.analysis} />
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 };
const textareaStyle = { width: '100%', height: 200, fontFamily: 'monospace', fontSize: 12, padding: 8, border: '1px solid var(--color-border)', borderRadius: 6, resize: 'vertical' };
const buttonStyle = { marginTop: 16, padding: '10px 20px', fontSize: 14, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 6 };
const cardStyle = { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12 };
const h3Style = { fontSize: 14, marginTop: 0, marginBottom: 8 };
```

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```
Open `/exam-quality`, click Analyze without typing anything (mock data doesn't depend on input yet) → confirm the Coverage Matrix (CLO4 blank/red), Recycled Questions (Q2 92% match), and Tag Chips all render, and at 1440×900 both cards are visible without scrolling.

- [ ] **Step 7: Commit**

```bash
git add components/mockResponses.js components/CoverageMatrix.jsx components/RecycledList.jsx components/TagChips.jsx "app/(app)/exam-quality/page.js"
git commit -m "feat: add Exam Quality screen wired to mock analyze response"
```

---

### Task 4: History panel

**Files:**
- Modify: `app/(app)/exam-quality/page.js`

**Interfaces:**
- Consumes: `mockResponses.runsResponse` (Task 3). Produces: a History panel that lists past runs and re-renders a report from a saved run's `result` field without calling Analyze again.

- [ ] **Step 1: Add History state and a fetch-on-mount effect**

Modify `app/(app)/exam-quality/page.js` — add near the top of the component:
```jsx
import { useEffect } from 'react';
import { runsResponse } from '../../../components/mockResponses';
```
Add state and an effect inside `ExamQualityPage`:
```jsx
const [runs, setRuns] = useState([]);

useEffect(() => {
  // TODO(Task 9): replace with a real GET /api/runs call (plain fetch — session cookie sent automatically).
  setRuns(runsResponse.runs);
}, []);
```

- [ ] **Step 2: Render the History panel and wire click-to-reload**

Add a History section below the Analyze button, and let clicking a row set `report` directly from the saved data (no re-fetch):
```jsx
<div style={{ marginTop: 20 }}>
  <h3 style={h3Style}>History</h3>
  {runs.length === 0 ? (
    <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>No past runs yet.</p>
  ) : (
    runs.map((run) => (
      <div
        key={run.id}
        className="cursor-pointer"
        style={{ padding: '6px 0', fontSize: 13, borderBottom: '1px solid var(--color-border)' }}
        onClick={() => setReport(run.result)}
      >
        {new Date(run.created_at).toLocaleString()}
      </div>
    ))
  )}
</div>
```
(Place this JSX right after the Analyze `<button>` and before `{report && <ExamQualityReport .../>}`.)

- [ ] **Step 3: Manual verification**

Reload `/exam-quality` → confirm one History row appears with a timestamp, before clicking Analyze. Click it → confirm the same report (CLO4 blank, Q2 92% match) renders without the "Analyzing..." loading state ever appearing (proof it didn't call Analyze).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/exam-quality/page.js"
git commit -m "feat: add History panel to Exam Quality screen"
```

---

### Task 5: Wow-moment stagger reveal

**Files:**
- Modify: `app/(app)/exam-quality/page.js`
- Modify: `components/CoverageMatrix.jsx`
- Modify: `components/RecycledList.jsx`

**Interfaces:**
- Consumes: the `blankRowRef`/`topRowRef` props already accepted (but unused) by `CoverageMatrix`/`RecycledList` since Task 3.

- [ ] **Step 1: Install GSAP**

```bash
npm install gsap
```

- [ ] **Step 2: Trigger the reveal once, after Analyze succeeds**

Modify `app/(app)/exam-quality/page.js`:
```jsx
import { useRef } from 'react';
import gsap from 'gsap';
```
Inside `ExamQualityPage`:
```jsx
const blankRowRef = useRef(null);
const topRecycledRef = useRef(null);

useEffect(() => {
  if (!report) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;
  const els = [blankRowRef.current, topRecycledRef.current].filter(Boolean);
  if (els.length) gsap.from(els, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out' });
}, [report]);
```
Pass the refs down: `<CoverageMatrix matrix={matrix} questions={report.questions} blankRowRef={blankRowRef} />` and `<RecycledList recycled={recycled} topRowRef={topRecycledRef} />`.

- [ ] **Step 3: Manual verification**

Reload `/exam-quality`, click Analyze → confirm the CLO4 row and the top Recycled Questions row fade+rise in; everything else appears instantly with no animation. In devtools, enable "prefers-reduced-motion: reduce" → reload and Analyze again → confirm no animation plays, content still appears immediately.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json "app/(app)/exam-quality/page.js" components/CoverageMatrix.jsx components/RecycledList.jsx
git commit -m "feat: add wow-moment stagger reveal (blank CLO row + top recycled item)"
```

---

### Task 6: Syllabus Overlap screen

**Files:**
- Create: `components/OverlapReport.jsx`
- Modify: `app/(app)/syllabus-overlap/page.js`

**Interfaces:**
- Consumes: `mockResponses.overlapResponse` (Task 3).
- Produces: the Syllabus Overlap screen (proposed + existing textareas, Compare button, overlap % list + gap list).

- [ ] **Step 1: Overlap report component**

`components/OverlapReport.jsx`:
```jsx
export default function OverlapReport({ overlaps, gaps }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12 }}>
        <h3 style={{ fontSize: 14, marginTop: 0 }}>Overlaps</h3>
        {overlaps.length === 0 ? (
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>No overlaps found.</p>
        ) : (
          overlaps.map((o, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span>{o.topic} — {o.existingCourse}</span>
              <b>{o.overlapPercent}%</b>
            </div>
          ))
        )}
      </div>
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12 }}>
        <h3 style={{ fontSize: 14, marginTop: 0 }}>Curriculum Gaps</h3>
        {gaps.length === 0 ? (
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>No gaps found.</p>
        ) : (
          gaps.map((g, i) => <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>{g}</div>)
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the page**

`app/(app)/syllabus-overlap/page.js`:
```jsx
'use client';
import { useState } from 'react';
import { overlapResponse } from '../../../components/mockResponses';
import OverlapReport from '../../../components/OverlapReport';

export default function SyllabusOverlapPage() {
  const [proposedSyllabus, setProposedSyllabus] = useState('');
  const [existingSyllabi, setExistingSyllabi] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCompare() {
    setLoading(true);
    // TODO(Task 9): replace with a real POST /api/overlap call — no auth header needed.
    await new Promise((r) => setTimeout(r, 300));
    setResult(overlapResponse);
    setLoading(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Syllabus Overlap</h1>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13, marginBottom: 20 }}>
        Proposed syllabus: one topic per line. Existing syllabi: a course-name line followed by its topics, blank line between courses.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Proposed Syllabus</label>
          <textarea
            style={{ width: '100%', height: 200, fontFamily: 'monospace', fontSize: 12, padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
            value={proposedSyllabus}
            onChange={(e) => setProposedSyllabus(e.target.value)}
            placeholder={'Big-O notation\nRecursion\nHash tables'}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Existing Course Syllabi</label>
          <textarea
            style={{ width: '100%', height: 200, fontFamily: 'monospace', fontSize: 12, padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}
            value={existingSyllabi}
            onChange={(e) => setExistingSyllabi(e.target.value)}
            placeholder={'Intro to Algorithms\nBig-O notation\nRecursion\n\nData Structures I\nArrays'}
          />
        </div>
      </div>
      <button className="cursor-pointer" style={{ marginTop: 16, padding: '10px 20px', fontSize: 14, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 6 }} onClick={handleCompare} disabled={loading}>
        {loading ? 'Comparing...' : 'Compare'}
      </button>
      {result && <div style={{ marginTop: 28 }}><OverlapReport overlaps={result.overlaps} gaps={result.gaps} /></div>}
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Open `/syllabus-overlap`, click Compare → confirm the Overlaps card shows "Recursion — Intro to Algorithms — 90%" and the Gaps card shows "Hash tables".

- [ ] **Step 4: Commit**

```bash
git add components/OverlapReport.jsx "app/(app)/syllabus-overlap/page.js"
git commit -m "feat: add Syllabus Overlap screen wired to mock response"
```

---

### Task 7: Grader Consistency screen

**Files:**
- Create: `components/GraderConsistencyTable.jsx`
- Modify: `app/(app)/grader-consistency/page.js`

**Interfaces:**
- Consumes: `mockResponses.consistencyResponse` (Task 3).
- Produces: the Grader Consistency screen (rubric + answers + scores textareas, Check button, flagged-pairs table).

- [ ] **Step 1: Table component**

`components/GraderConsistencyTable.jsx`:
```jsx
export default function GraderConsistencyTable({ flags }) {
  if (flags.length === 0) {
    return <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>No inconsistencies found.</p>;
  }
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
      <thead>
        <tr>
          {['Answer A', 'Score A', 'Answer B', 'Score B', 'Grader'].map((h) => (
            <th key={h} style={{ border: '1px solid var(--color-border)', padding: '6px 8px', textAlign: 'left' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {flags.map((f, i) => (
          <tr key={i}>
            <td style={cellStyle}>{f.answerA}</td>
            <td style={cellStyle}>{f.scoreA}</td>
            <td style={cellStyle}>{f.answerB}</td>
            <td style={cellStyle}>{f.scoreB}</td>
            <td style={cellStyle}>{f.grader}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cellStyle = { border: '1px solid var(--color-border)', padding: '6px 8px' };
```

- [ ] **Step 2: Wire the page**

`app/(app)/grader-consistency/page.js`:
```jsx
'use client';
import { useState } from 'react';
import { consistencyResponse } from '../../../components/mockResponses';
import GraderConsistencyTable from '../../../components/GraderConsistencyTable';

export default function GraderConsistencyPage() {
  const [rubric, setRubric] = useState('');
  const [studentAnswers, setStudentAnswers] = useState('');
  const [graderScores, setGraderScores] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    setLoading(true);
    // TODO(Task 9): replace with a real POST /api/grader-consistency call — no auth header needed.
    await new Promise((r) => setTimeout(r, 300));
    setResult(consistencyResponse);
    setLoading(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Grader Consistency</h1>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13, marginBottom: 20 }}>
        Student answers: one numbered answer per line. Grader scores: one line per triple, GraderName,answerNumber,score.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Rubric</label>
          <textarea style={taStyle} value={rubric} onChange={(e) => setRubric(e.target.value)} placeholder="Award full credit for..." />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Student Answers</label>
          <textarea style={taStyle} value={studentAnswers} onChange={(e) => setStudentAnswers(e.target.value)} placeholder={'1. Answer text...\n2. Answer text...'} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Grader Scores</label>
          <textarea style={taStyle} value={graderScores} onChange={(e) => setGraderScores(e.target.value)} placeholder={'Alex,1,8\nJordan,1,6'} />
        </div>
      </div>
      <button className="cursor-pointer" style={{ marginTop: 16, padding: '10px 20px', fontSize: 14, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 6 }} onClick={handleCheck} disabled={loading}>
        {loading ? 'Checking...' : 'Check'}
      </button>
      {result && <div style={{ marginTop: 28 }}><GraderConsistencyTable flags={result.flags} /></div>}
    </div>
  );
}

const taStyle = { width: '100%', height: 200, fontFamily: 'monospace', fontSize: 12, padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 };
```

- [ ] **Step 3: Manual verification**

Open `/grader-consistency`, click Check → confirm a table row: A1 (10) / A3 (6) / Alex.

- [ ] **Step 4: Commit**

```bash
git add components/GraderConsistencyTable.jsx "app/(app)/grader-consistency/page.js"
git commit -m "feat: add Grader Consistency screen wired to mock response"
```

---

### Task 8: AI-Anchored Grading screen

**Files:**
- Create: `components/GradingTable.jsx`
- Modify: `app/(app)/ai-grading/page.js`

**Interfaces:**
- Consumes: `mockResponses.gradeResponse` (Task 3).
- Produces: the AI-Anchored Grading screen (rubric + model answer + student answers + optional human scores, Score button, results table sorted by disagreement).

- [ ] **Step 1: Table component**

`components/GradingTable.jsx`:
```jsx
export default function GradingTable({ results }) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
      <thead>
        <tr>
          {['Answer', 'Human Score', 'AI Score', 'Delta', 'Reason'].map((h) => (
            <th key={h} style={{ border: '1px solid var(--color-border)', padding: '6px 8px', textAlign: 'left' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => (
          <tr key={i}>
            <td style={cellStyle}>{r.answer}</td>
            <td style={cellStyle}>{r.humanScore ?? '—'}</td>
            <td style={cellStyle}>{r.aiScore}</td>
            <td style={{ ...cellStyle, fontWeight: r.delta !== null && Math.abs(r.delta) >= 3 ? 700 : 400, color: r.delta !== null && Math.abs(r.delta) >= 3 ? 'var(--color-destructive)' : undefined }}>
              {r.delta ?? '—'}
            </td>
            <td style={cellStyle}>{r.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cellStyle = { border: '1px solid var(--color-border)', padding: '6px 8px' };
```

- [ ] **Step 2: Wire the page**

`app/(app)/ai-grading/page.js`:
```jsx
'use client';
import { useState } from 'react';
import { gradeResponse } from '../../../components/mockResponses';
import GradingTable from '../../../components/GradingTable';

export default function AiGradingPage() {
  const [rubric, setRubric] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [studentAnswers, setStudentAnswers] = useState('');
  const [humanScores, setHumanScores] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleScore() {
    setLoading(true);
    // TODO(Task 9): replace with a real POST /api/grade call — no auth header needed.
    await new Promise((r) => setTimeout(r, 300));
    setResult(gradeResponse);
    setLoading(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>AI-Anchored Grading</h1>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13, marginBottom: 20 }}>
        Human scores are optional: one line per answer, answerNumber,score. Leave blank if none exist yet.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 24 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Rubric</label>
          <textarea style={taStyle} value={rubric} onChange={(e) => setRubric(e.target.value)} placeholder="Full credit for..." />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Model Answer</label>
          <textarea style={taStyle} value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} placeholder="The ideal answer..." />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Student Answers</label>
          <textarea style={taStyle} value={studentAnswers} onChange={(e) => setStudentAnswers(e.target.value)} placeholder={'1. Answer...\n2. Answer...'} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Human Scores (optional)</label>
          <textarea style={taStyle} value={humanScores} onChange={(e) => setHumanScores(e.target.value)} placeholder={'1,8\n2,6'} />
        </div>
      </div>
      <button className="cursor-pointer" style={{ marginTop: 16, padding: '10px 20px', fontSize: 14, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 6 }} onClick={handleScore} disabled={loading}>
        {loading ? 'Scoring...' : 'Score'}
      </button>
      {result && <div style={{ marginTop: 28 }}><GradingTable results={result.results} /></div>}
    </div>
  );
}

const taStyle = { width: '100%', height: 200, fontFamily: 'monospace', fontSize: 12, padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 };
```

- [ ] **Step 3: Manual verification**

Open `/ai-grading`, click Score → confirm the table shows A3 first (delta -4, bolded/red) above A1 (delta 0).

- [ ] **Step 4: Commit**

```bash
git add components/GradingTable.jsx "app/(app)/ai-grading/page.js"
git commit -m "feat: add AI-Anchored Grading screen wired to mock response"
```

---

### Task 9: Swap mocks for real fetch calls

**Files:**
- Modify: `app/(app)/exam-quality/page.js`, `app/(app)/syllabus-overlap/page.js`, `app/(app)/grader-consistency/page.js`, `app/(app)/ai-grading/page.js`

**Interfaces:**
- Consumes: Arko's deployed `/api/analyze` + `/api/runs` (real session, cookie-based — no header needed on your end) and Hrittika's deployed `/api/overlap`, `/api/grader-consistency`, `/api/grade` (no auth) — the exact request/response shapes are unchanged from what the mocks already model, so each swap is a one-line `fetch` replacement per `handle*` function, not a rewrite.

> **Reversed 2026-09-06:** this task originally had you add a `components/supabaseClient.js` anonymous-auth helper and attach `Authorization: Bearer <token>` to the analyze/runs calls. Real auth removed that entirely — `src/app/(app)/**` only ever renders for an already-signed-in visitor (Arko's `middleware.js` redirects anyone else to `/login` first), and same-origin `fetch` sends the session cookie automatically. Step 1 below is just the plain-fetch swap, same shape as Step 2's secondary-route swap.

- [ ] **Step 1: Swap Exam Quality's Analyze and History calls**

In `app/(app)/exam-quality/page.js`, replace the mock body of `handleAnalyze`:
```jsx
async function handleAnalyze() {
  setLoading(true);
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clos, exam, pastExams }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Analyze failed');
    setReport(data);
  } finally {
    setLoading(false);
  }
}
```
And the History effect:
```jsx
useEffect(() => {
  (async () => {
    const res = await fetch('/api/runs');
    const data = await res.json();
    if (res.ok) setRuns(data.runs);
  })();
}, []);
```
Remove the now-unused `runsResponse`/`analyzeResponse` mock imports.

- [ ] **Step 2: Swap the 3 secondary screens' calls**

In each of `syllabus-overlap/page.js`, `grader-consistency/page.js`, `ai-grading/page.js`, replace the mock body of the respective `handle*` function with a plain `fetch` (no auth header):
```jsx
// syllabus-overlap:
const res = await fetch('/api/overlap', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ proposedSyllabus, existingSyllabi }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error || 'Compare failed');
setResult(data);
```
(and the analogous 3-line swap for `/api/grader-consistency` with `{rubric, studentAnswers, graderScores}`, and `/api/grade` with `{rubric, modelAnswer, studentAnswers, humanScores}`). Remove the now-unused mock imports in each file.

- [ ] **Step 3: Manual verification against the deployed backend**

Once Arko's and Hrittika's routes are live on the same Vercel deployment:
```bash
npm run dev
```
Log in (or sign up) at `/login` first — the app pages redirect there otherwise. Then open each of the 4 screens, submit real pasted text, confirm each returns real model output (not the mock's fixed values) and renders correctly. Re-run the wow-moment demo data from Arko's plan on `/exam-quality` and confirm CLO4 blank + Q2 ≥80% match still render with the real backend.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)"
git commit -m "feat: swap mock responses for real API calls across all 4 screens"
```
