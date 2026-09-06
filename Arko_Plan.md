# Faculty OS — Arko's Plan (Backend Core: Analyze + Runs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared Next.js + Supabase scaffold and the anonymous-auth-backed `/api/analyze` + `/api/runs` flow — Features #1/#5/#4 (Exam Quality Check, CLO Coverage Matrix, Dedup & Tagging) and #6 (Run History) — matching `plan.md`'s Frozen Contract exactly.

**Architecture:** Next.js App Router route handlers. Anonymous Supabase auth only: the frontend calls `supabase.auth.signInAnonymously()` once and sends `Authorization: Bearer <access_token>` on every request; each route handler verifies that token itself (no cookies, no `@supabase/ssr`, no login pages, no middleware-based redirects) and uses a per-request Supabase client that forwards the same bearer token to PostgREST, so `auth.uid()` resolves correctly under RLS. Exactly one Anthropic call per analyze request. Pure parsing/prompt/response-parsing logic lives in CommonJS files unit-tested with `node:test`; route handlers import them with ESM `import` (Next's bundler resolves CJS named exports via `cjs-module-lexer`).

**Tech Stack:** Next.js (App Router) + Tailwind + shadcn/ui scaffold, Supabase (Postgres + anonymous Auth + RLS), `@supabase/supabase-js` only (no `@supabase/ssr` — there is no cookie session to manage), Vercel deploy, `node:test`, native `fetch` for the Anthropic call. Model id `claude-sonnet-5`.

**Spec:** `plan.md` and `DESIGN.md` at the project root, plus this plan.

## Global Constraints

- Anonymous Supabase auth only. `supabase.auth.signInAnonymously()` fires client-side once (Shads' code); every `/api/analyze` and `/api/runs` request carries `Authorization: Bearer <access_token>`. No login/signup pages, no email/password, no `@supabase/ssr`, no cookie session, no middleware-based redirects. This supersedes the real-email-auth design in the older, now-stale `2026-09-06-faculty-os-backend.md`.
- Must enable "Allow anonymous sign-ins" in the Supabase dashboard (Authentication → Settings) — it is off by default and `signInAnonymously()` fails silently against a fresh project otherwise.
- Exactly one Anthropic call per analyze request. Model id `claude-sonnet-5`. No embeddings, no vector search, no multi-call orchestration.
- RLS is the only trust boundary: `own_rows_only` policy, `auth.uid() = user_id`, `select`/`insert` only — no `update`/`delete` (immutable history).
- Never use `SUPABASE_SERVICE_ROLE_KEY` in app code, even though it's a provisioned env var in `plan.md` — the anon key plus the per-request bearer token is the correct and sufficient boundary.
- Zero added npm dependencies beyond the Next.js/Tailwind/shadcn scaffold and `@supabase/supabase-js`. No test framework beyond `node:test`, no Anthropic SDK.
- Text-paste input only. No file upload.
- File ownership — you touch **only**: `app/api/analyze/**`, `app/api/runs/**`, `supabase/**`, `lib/types.ts`, `lib/analyze.js`, `lib/supabase/**`, `scripts/smoke-test.mjs`, and (Task 0 only, if you're the one who runs it) the scaffold's `package.json`/`next.config.js`/Tailwind+shadcn config. **Never touch `app/page.js` or `app/layout.js` after Task 0** — those are Shads' from the moment the scaffold lands (her Task 1 replaces both). Never touch `app/(app)/**`, `components/**` (Shads), or `app/api/overlap/**`, `app/api/grader-consistency/**`, `app/api/grade/**`, `fixtures/**` (Hrittika).
- Deploy checkpoint: a live URL must exist by the end of Task 1, before any feature logic is written.
- **middleware.js is intentionally not created by this plan.** Anonymous auth needs no page-level redirects (there's nothing to sign in *to* — every visitor is already "signed in" once the client-side anonymous call succeeds), and API auth is a per-route bearer-token check, not a middleware concern. `plan.md` lists `middleware.js` as an Arko-owned file only for the scenario where the 3 secondary routes later need auth-gating added — if that happens, it's a new small task, not a retrofit of this one.

---

## File Structure

- `package.json`, `next.config.js`, `app/layout.js`, `app/page.js` — Next.js/Tailwind/shadcn scaffold output, committed as-is (Shads' plan replaces the page content; you only ship the stock scaffold).
- `lib/types.ts` — shared TypeScript types matching the Frozen Contract (`CLO`, `Question`, `QuestionAnalysis`, `SimilarityMatch`, `AnalysisResult`). Read-only reference for Shads/Hrittika — per `plan.md`'s shared-file-risk note, they keep their own local copies rather than importing it, so this file has exactly one owner: you.
- `lib/analyze.js` — pure functions: `parseCLOs`, `parseNumberedQuestions`, `parsePastExams`, `buildPrompt`, `parseModelJSON`. CommonJS, unit-tested directly.
- `lib/supabase/serverClient.js` — `parseAuthHeader(headerValue)` (pure, unit-tested) and `requireUser(req)` (thin glue: verifies the bearer token via `supabase.auth.getUser`, returns a request-scoped client that forwards that token to PostgREST for RLS).
- `supabase/migrations/0001_init.sql` — `analysis_runs` table + RLS policies.
- `app/api/analyze/route.js` — `POST`: parse inputs, call Anthropic, insert the run, return the result.
- `app/api/runs/route.js` — `GET`: list the caller's own runs (RLS-scoped).
- `test/analyze.test.js`, `test/auth.test.js` — `node:test` suites.
- `scripts/smoke-test.mjs` — end-to-end verification script against a deployed URL; self-contained, needs no UI.

---

### Task 0: Shared scaffold (skip if it's already in the repo)

**Files:**
- Create (only if missing): `package.json`, `next.config.js`, `app/layout.js`, `app/page.js`, Tailwind + shadcn config files.

**Interfaces:**
- Produces: a runnable Next.js App Router project at repo root — the ground every other task (yours, Shads', Hrittika's) is built on.

- [ ] **Step 1: Check whether the scaffold already exists**

```bash
cd /c/Users/hritt/faculty-os
git status
```

If `package.json` already exists and has a `next` dependency, someone (Shads or Hrittika) beat you to it — run `git pull` and skip to Task 1. Otherwise continue below.

- [ ] **Step 2: Init git and scaffold Next.js + Tailwind + shadcn**

```bash
git init
npx create-next-app@latest . --js --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
npx shadcn@latest init -d
```

- [ ] **Step 3: Commit immediately so Shads/Hrittika can pull it**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + shadcn"
```

If your `git push` races with someone else's identical scaffold commit, keep theirs and `git reset --hard origin/main` locally — the generated output is deterministic, nothing of yours is lost.

---

### Task 1: Shared types + Supabase schema + deploy skeleton

**Files:**
- Create: `lib/types.ts`
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: the `CLO`, `Question`, `QuestionAnalysis`, `SimilarityMatch`, `AnalysisResult` types other tasks (yours and, informally, Shads'/Hrittika's own local copies) are built against; the `analysis_runs` table Task 5/6 read and write.

- [ ] **Step 1: Write the shared types file**

`lib/types.ts`:
```ts
export type CLO = { id: string; text: string };
export type Question = { number: number; text: string };
export type PastExamYear = { year: string; questions: string[] };
export type SimilarityMatch = { year: string; matchedQuestion: string; percent: number; reason: string };
export type QuestionAnalysis = {
  questionNumber: number;
  coveredCLOs: string[];
  topic: string;
  bloom: string;
  similarity: SimilarityMatch | null;
};
export type AnalysisResult = { clos: CLO[]; questions: Question[]; analysis: QuestionAnalysis[] };
```

- [ ] **Step 2: Write the Supabase migration**

`supabase/migrations/0001_init.sql`:
```sql
create table if not exists analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  clos_text text not null,
  exam_text text not null,
  past_exams_text text not null default '',
  result jsonb not null
);

alter table analysis_runs enable row level security;

create policy own_rows_only_select on analysis_runs
  for select using (auth.uid() = user_id);

create policy own_rows_only_insert on analysis_runs
  for insert with check (auth.uid() = user_id);
```

- [ ] **Step 3: Create/link the Supabase project and apply the migration**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then in the Supabase dashboard: **Authentication → Settings → Enable anonymous sign-ins** (toggle on — it's off by default). Expected: `analysis_runs` exists in the Table Editor with RLS enabled, and anonymous sign-ins are allowed.

- [ ] **Step 4: Deploy the skeleton to Vercel**

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add ANTHROPIC_API_KEY production
npx vercel --prod --yes
```

No `SUPABASE_SERVICE_ROLE_KEY` — the app never uses it. Also add the same three vars to a local `.env.local` (gitignored) so Task 7's smoke test can run from your machine. Expected: a live URL serving the default Next.js/shadcn placeholder page.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts supabase/
git commit -m "feat: add shared types and Supabase schema/RLS, deploy skeleton"
```

---

### Task 2: Input parsers (CLOs, exam questions, past exams)

**Files:**
- Create: `lib/analyze.js`
- Create: `test/analyze.test.js`

**Interfaces:**
- Produces: `parseCLOs(text) -> CLO[]`, `parseNumberedQuestions(text) -> Question[]` (note: `{number, text}`, matching the Frozen Contract — not `{id, text}`), `parsePastExams(text) -> PastExamYear[]`. Consumed by Task 3 (same file) and Task 5 (`app/api/analyze/route.js`).

- [ ] **Step 1: Write the failing tests**

`test/analyze.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { parseCLOs, parseNumberedQuestions, parsePastExams } = require('../lib/analyze');

test('parseCLOs extracts explicit CLO ids', () => {
  const result = parseCLOs('CLO1: Explain time complexity\nCLO2: Implement recursion');
  assert.deepStrictEqual(result, [
    { id: 'CLO1', text: 'Explain time complexity' },
    { id: 'CLO2', text: 'Implement recursion' },
  ]);
});

test('parseCLOs auto-numbers lines with no CLO prefix', () => {
  const result = parseCLOs('Explain time complexity\nImplement recursion');
  assert.deepStrictEqual(result, [
    { id: 'CLO1', text: 'Explain time complexity' },
    { id: 'CLO2', text: 'Implement recursion' },
  ]);
});

test('parseNumberedQuestions strips numbering and uses "number" as the key', () => {
  const result = parseNumberedQuestions('1. What is Big-O?\n2) Define recursion');
  assert.deepStrictEqual(result, [
    { number: 1, text: 'What is Big-O?' },
    { number: 2, text: 'Define recursion' },
  ]);
});

test('parsePastExams groups questions under year headers', () => {
  const result = parsePastExams('2024\n1. Old question A\n2. Old question B\n\n2022\n1. Older question');
  assert.deepStrictEqual(result, [
    { year: '2024', questions: ['Old question A', 'Old question B'] },
    { year: '2022', questions: ['Older question'] },
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../lib/analyze'`

- [ ] **Step 3: Write the minimal implementation**

`lib/analyze.js`:
```js
function parseCLOs(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^(CLO\s*\d+)\s*[:\-]\s*(.+)$/i);
      return m
        ? { id: m[1].replace(/\s+/g, '').toUpperCase(), text: m[2] }
        : { id: `CLO${i + 1}`, text: line };
    });
}

function parseNumberedQuestions(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^\d+[\.\)]\s*(.+)$/);
      return { number: i + 1, text: m ? m[1] : line };
    });
}

function parsePastExams(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const years = [];
  let current = null;
  for (const line of lines) {
    if (!line) continue;
    const yearMatch = line.match(/^(\d{4})$/);
    if (yearMatch) {
      current = { year: yearMatch[1], questions: [] };
      years.push(current);
      continue;
    }
    const qMatch = line.match(/^\d+[\.\)]\s*(.+)$/);
    if (current) current.questions.push(qMatch ? qMatch[1] : line);
  }
  return years;
}

module.exports = { parseCLOs, parseNumberedQuestions, parsePastExams };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/analyze.js test/analyze.test.js
git commit -m "feat: add CLO/question/past-exam parsers"
```

---

### Task 3: Prompt builder + model-response parser

**Files:**
- Modify: `lib/analyze.js`
- Modify: `test/analyze.test.js`

**Interfaces:**
- Consumes: the three parse functions from Task 2 (same file).
- Produces: `buildPrompt({clos, questions, pastExams}) -> string`, `parseModelJSON(rawText) -> {questions: QuestionAnalysis[]}`. Consumed by Task 5.

- [ ] **Step 1: Append the failing tests**

Append to `test/analyze.test.js`:
```js
const { buildPrompt, parseModelJSON } = require('../lib/analyze');

test('buildPrompt embeds CLOs, questions (by number), and past exams', () => {
  const prompt = buildPrompt({
    clos: [{ id: 'CLO1', text: 'Explain recursion' }],
    questions: [{ number: 1, text: 'Define recursion' }],
    pastExams: [{ year: '2024', questions: ['Define recursion in your own words'] }],
  });
  assert.match(prompt, /CLO1: Explain recursion/);
  assert.match(prompt, /Q1: Define recursion/);
  assert.match(prompt, /Year 2024:/);
  assert.match(prompt, /Respond with ONLY valid JSON/);
});

test('buildPrompt handles no past exams', () => {
  const prompt = buildPrompt({ clos: [], questions: [], pastExams: [] });
  assert.match(prompt, /\(none provided\)/);
});

test('parseModelJSON parses raw JSON using questionNumber/coveredCLOs keys', () => {
  const result = parseModelJSON('{"questions":[{"questionNumber":1,"coveredCLOs":["CLO1"],"bloom":"Apply","topic":"Recursion"}]}');
  assert.strictEqual(result.questions.length, 1);
  assert.strictEqual(result.questions[0].questionNumber, 1);
  assert.deepStrictEqual(result.questions[0].coveredCLOs, ['CLO1']);
});

test('parseModelJSON normalizes a missing similarity to null and missing coveredCLOs to []', () => {
  const result = parseModelJSON('{"questions":[{"questionNumber":1,"bloom":"Apply","topic":"t"}]}');
  assert.strictEqual(result.questions[0].similarity, null);
  assert.deepStrictEqual(result.questions[0].coveredCLOs, []);
});

test('parseModelJSON strips markdown code fences', () => {
  const result = parseModelJSON('```json\n{"questions":[]}\n```');
  assert.deepStrictEqual(result.questions, []);
});

test('parseModelJSON throws on missing questions array', () => {
  assert.throws(() => parseModelJSON('{"foo":1}'), /missing "questions" array/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `buildPrompt is not a function`

- [ ] **Step 3: Write the minimal implementation**

Append to `lib/analyze.js` (before `module.exports`):
```js
function buildPrompt({ clos, questions, pastExams }) {
  const cloList = clos.map((c) => `${c.id}: ${c.text}`).join('\n');
  const questionList = questions.map((q) => `Q${q.number}: ${q.text}`).join('\n');
  const pastList = pastExams
    .map((y) => `Year ${y.year}:\n${y.questions.map((q, i) => `Q${i + 1}: ${q}`).join('\n')}`)
    .join('\n\n');

  return `You are auditing a university exam before it is published.

COURSE LEARNING OUTCOMES:
${cloList}

DRAFT EXAM (this year):
${questionList}

PAST EXAMS (for recycling check):
${pastList || '(none provided)'}

For each draft-exam question, determine:
1. Which CLO id(s) it tests (use the exact ids given above; empty array if none apply)
2. Its Bloom's Taxonomy level: one of Remember, Understand, Apply, Analyze, Evaluate, Create
3. A short topic tag (2-4 words)
4. Whether it closely matches any past-exam question. If yes, report the matched year, the matched question number, an estimated similarity percent (0-100, where 100 = identical meaning even if reworded), and a one-sentence reason. If no close match, omit this field.

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "questions": [
    {
      "questionNumber": <question number>,
      "coveredCLOs": ["CLO1"],
      "bloom": "Apply",
      "topic": "short tag",
      "similarity": { "year": "2024", "matchedQuestion": "Q7", "percent": 92, "reason": "..." }
    }
  ]
}
Omit the "similarity" key entirely for questions with no notable past match (below 60%).`;
}

function parseModelJSON(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error('Model response missing "questions" array');
  }
  const questions = parsed.questions.map((q) => ({
    questionNumber: q.questionNumber,
    coveredCLOs: q.coveredCLOs || [],
    topic: q.topic,
    bloom: q.bloom,
    similarity: q.similarity || null,
  }));
  return { questions };
}
```

Update the export line:
```js
module.exports = { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/analyze.js test/analyze.test.js
git commit -m "feat: add prompt builder and model-response parser"
```

---

### Task 4: Bearer-token auth helper

**Files:**
- Create: `lib/supabase/serverClient.js`
- Create: `test/auth.test.js`

**Interfaces:**
- Produces: `parseAuthHeader(headerValue) -> string | null` (pure, unit-tested), `requireUser(req) -> Promise<{user, supabase, error}>` (thin glue over `@supabase/supabase-js` — not unit tested, verified in Task 7). Consumed by Task 5 and Task 6.

- [ ] **Step 1: Write the failing tests for the pure part**

`test/auth.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { parseAuthHeader } = require('../lib/supabase/serverClient');

test('parseAuthHeader extracts the token from a Bearer header', () => {
  assert.strictEqual(parseAuthHeader('Bearer abc123'), 'abc123');
});

test('parseAuthHeader is case-insensitive on the Bearer keyword', () => {
  assert.strictEqual(parseAuthHeader('bearer xyz'), 'xyz');
});

test('parseAuthHeader returns null for a missing or malformed header', () => {
  assert.strictEqual(parseAuthHeader(null), null);
  assert.strictEqual(parseAuthHeader(undefined), null);
  assert.strictEqual(parseAuthHeader('Basic abc123'), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../lib/supabase/serverClient'`

- [ ] **Step 3: Write the implementation**

```bash
npm install @supabase/supabase-js
```

`lib/supabase/serverClient.js`:
```js
const { createClient } = require('@supabase/supabase-js');

function parseAuthHeader(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function requireUser(req) {
  const token = parseAuthHeader(req.headers.get('authorization'));
  if (!token) {
    return { user: null, supabase: null, error: 'Missing Authorization: Bearer token' };
  }

  // This client forwards the caller's own access token to PostgREST (not the anon
  // key alone), so auth.uid() resolves to this user inside RLS policies.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, supabase: null, error: error?.message || 'Invalid session' };
  }
  return { user: data.user, supabase, error: null };
}

module.exports = { parseAuthHeader, requireUser };
```

`ponytail:` `requireUser` is thin glue over one external verification call — mocking `@supabase/supabase-js` purely to unit-test it isn't proportionate for a 4.5h build. Verified for real in Task 7's smoke test.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (3 tests; 13 total)

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/serverClient.js test/auth.test.js package.json package-lock.json
git commit -m "feat: add bearer-token auth helper"
```

---

### Task 5: `/api/analyze` route handler

**Files:**
- Create: `app/api/analyze/route.js`

**Interfaces:**
- Consumes: `lib/analyze.js` (Tasks 2-3), `lib/supabase/serverClient.js` (Task 4).
- Produces: `POST /api/analyze` — header `Authorization: Bearer <token>`, body `{clos, exam, pastExams}` (strings), response `{clos, questions, analysis}` on 200, `{error}` on 4xx/5xx. Saves the run as a side effect. Matches `plan.md`'s Frozen Contract.

- [ ] **Step 1: Write the handler**

`app/api/analyze/route.js`:
```js
import { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON } from '../../../lib/analyze';
import { requireUser } from '../../../lib/supabase/serverClient';

export async function POST(req) {
  const { user, supabase, error: authError } = await requireUser(req);
  if (!user) {
    return Response.json({ error: authError }, { status: 401 });
  }

  const { clos = '', exam = '', pastExams = '' } = await req.json();
  if (!clos.trim() || !exam.trim()) {
    return Response.json({ error: 'CLOs and exam text are required' }, { status: 400 });
  }

  const parsedClos = parseCLOs(clos);
  const parsedQuestions = parseNumberedQuestions(exam);
  const parsedPastExams = parsePastExams(pastExams);
  const prompt = buildPrompt({ clos: parsedClos, questions: parsedQuestions, pastExams: parsedPastExams });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (e) {
    return Response.json({ error: `Anthropic API request failed: ${e.message}` }, { status: 502 });
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    return Response.json({ error: `Anthropic API error: ${errText}` }, { status: 502 });
  }

  const data = await anthropicRes.json();
  const rawText = data.content?.[0]?.text || '';

  let parsed;
  try {
    parsed = parseModelJSON(rawText);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }

  const result = { clos: parsedClos, questions: parsedQuestions, analysis: parsed.questions };

  const { error: insertError } = await supabase
    .from('analysis_runs')
    .insert({ user_id: user.id, clos_text: clos, exam_text: exam, past_exams_text: pastExams, result });

  if (insertError) {
    return Response.json({ ...result, warning: `Saved result but failed to persist run: ${insertError.message}` }, { status: 200 });
  }

  return Response.json(result);
}
```

- [ ] **Step 2: Manual verification (deferred to Task 7)**

`ponytail:` this file is thin glue over already-tested pure functions plus two external calls (Anthropic, Supabase) — mocking both purely to unit-test glue code isn't proportionate here. Verified for real in Task 7 against the deployed endpoint.

- [ ] **Step 3: Commit**

```bash
git add app/api/analyze/route.js
git commit -m "feat: add POST /api/analyze route handler"
```

---

### Task 6: `/api/runs` route handler

**Files:**
- Create: `app/api/runs/route.js`

**Interfaces:**
- Consumes: `lib/supabase/serverClient.js` (Task 4).
- Produces: `GET /api/runs` — header `Authorization: Bearer <token>`, response `{runs: {id, created_at, result}[]}`, RLS-scoped to the caller's own rows.

- [ ] **Step 1: Write the handler**

`app/api/runs/route.js`:
```js
import { requireUser } from '../../../lib/supabase/serverClient';

export async function GET(req) {
  const { user, supabase, error: authError } = await requireUser(req);
  if (!user) {
    return Response.json({ error: authError }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('analysis_runs')
    .select('id, created_at, result')
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ runs: data });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/runs/route.js
git commit -m "feat: add GET /api/runs route handler"
```

---

### Task 7: Deploy + end-to-end smoke test

**Files:**
- Create: `scripts/smoke-test.mjs`

**Interfaces:**
- Consumes: the full backend (Tasks 0-6), deployed. Self-contained — does not require Shads' UI or Hrittika's routes to exist.

- [ ] **Step 1: Write the smoke-test script**

`scripts/smoke-test.mjs`:
```js
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.SMOKE_TEST_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!BASE_URL || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Usage: SMOKE_TEST_URL=... NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... node scripts/smoke-test.mjs');
  process.exit(1);
}

async function signInAnon() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`signInAnonymously failed: ${error.message}`);
  return data.session.access_token;
}

async function main() {
  const tokenA = await signInAnon();

  const analyzeRes = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      clos: 'CLO1: Explain Big-O time complexity\nCLO2: Implement recursive algorithms\nCLO3: Analyze sorting algorithm tradeoffs\nCLO4: Design a hash table from scratch',
      exam: '1. What is the time complexity of binary search, and why?\n2. Write a recursive function to compute the nth Fibonacci number.\n3. Compare the average-case and worst-case time complexity of quicksort vs mergesort.',
      pastExams: '2024\n1. Write a recursive function that returns the nth Fibonacci number using memoization.',
    }),
  });
  const analyzeData = await analyzeRes.json();
  if (!analyzeRes.ok) throw new Error(`POST /api/analyze failed: ${JSON.stringify(analyzeData)}`);
  console.log('POST /api/analyze OK —', analyzeData.analysis.length, 'questions analyzed');

  const runsRes = await fetch(`${BASE_URL}/api/runs`, { headers: { authorization: `Bearer ${tokenA}` } });
  const runsData = await runsRes.json();
  if (!runsRes.ok) throw new Error(`GET /api/runs failed: ${JSON.stringify(runsData)}`);
  if (runsData.runs.length < 1) throw new Error('Expected at least 1 run for session A, got 0');
  console.log('GET /api/runs OK —', runsData.runs.length, 'run(s) for session A');

  const tokenB = await signInAnon();
  const runsResB = await fetch(`${BASE_URL}/api/runs`, { headers: { authorization: `Bearer ${tokenB}` } });
  const runsDataB = await runsResB.json();
  if (runsDataB.runs.length !== 0) {
    throw new Error(`Expected 0 runs for a brand-new session B, got ${runsDataB.runs.length} — RLS isolation broken`);
  }
  console.log('RLS isolation OK — session B sees 0 runs');

  console.log('\nAll smoke tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Redeploy and run it**

```bash
npx vercel --prod --yes
SMOKE_TEST_URL=https://<your-deployment>.vercel.app node scripts/smoke-test.mjs
```

Expected output ends with `All smoke tests passed.` This is also the exact data that produces the wow-moment flags (CLO4 untested, Q2 ≥80% match to 2024 Q1) once Shads' UI renders it.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-test.mjs
git commit -m "test: add end-to-end smoke test script for analyze+runs"
```
