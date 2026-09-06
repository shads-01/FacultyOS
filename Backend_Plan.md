# Faculty OS — Backend (Workstream A) Implementation Plan

> **SUPERSEDED:** `plan.md`'s "Auth decision" section locked **anonymous** Supabase auth (`signInAnonymously()`, no login/signup screens) — the opposite of the real email+password design this file implements. This file also only ever covered `/api/analyze` + `/api/runs`, never the 3 secondary routes. Use the 3 per-person plans instead: `2026-09-06-faculty-os-arko.md` (scaffold + analyze/runs, anonymous auth), `2026-09-06-faculty-os-shads.md` (all 4 screens' UI), `2026-09-06-faculty-os-hrittika.md` (`/api/overlap`, `/api/grader-consistency`, `/api/grade` + fixtures). Kept for reference only — do not execute it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Changelog:** faculty now get real email+password accounts (Supabase Auth via `@supabase/ssr`), replacing the earlier anonymous-session design. This removes `SUPABASE_SERVICE_ROLE_KEY` entirely — Postgres RLS + the cookie-based session are the trust boundary, route handlers no longer hand-verify bearer tokens. Also fixed: earlier drafts of the API routes used `module.exports = { POST }`, which Next.js Route Handlers do not reliably recognize — corrected to ESM `export async function POST(req)`.

**Goal:** Build Workstream A only — the backend half of the Faculty OS: Next.js API routes, Supabase schema/RLS/real email+password auth, and the pure analysis/report logic — while Workstream B (frontend, Antigravity #1) and Workstream C (real data + wow polish + QA, Antigravity #2) build against the same `plan.md`/`DESIGN.md` in parallel on disjoint files.

**Architecture:** Next.js (App Router) Route Handlers call a single Anthropic API request built from pasted CLOs/exam/past-exams, persist each run to Supabase under the signed-in faculty member's id (RLS-enforced), and expose a small history API. Auth is real Supabase email+password, session held in cookies via `@supabase/ssr`, refreshed by `middleware.js`, which also redirects signed-out visitors to `/login`. Pure parsing/prompt/report-transform logic lives in plain `.js` (CommonJS) files so it can be unit-tested with Node's built-in test runner with zero test dependencies; Next.js app code imports those same files with ESM `import` (Next's bundler resolves CJS named exports via `cjs-module-lexer`, so no dual-export gymnastics are needed).

**Tech Stack:** Next.js (App Router) + Tailwind + shadcn/ui (scaffold only, most component work is Workstream B), Supabase (Postgres + email/password Auth + RLS via `@supabase/ssr`), Vercel deploy. `node:test` for backend unit tests — no Jest/Vitest. Native `fetch` for the Anthropic call — no SDK dependency. Model id: `claude-sonnet-5`.

**Spec:** `plan.md` and `DESIGN.md` at the project root. This plan implements Feature 1 (CLO Coverage Matrix) and Feature 2 (Recycled Question Detector)'s backend half, all of Feature 3 (Run History), and real faculty authentication.

## Global Constraints

- Do not touch `/app/(app)/**` or `/components/**` (post-login screens/components) — that's Workstream B. Backend owns `/app/(auth)/**` (login/signup), `/app/api/**`, `/lib/**`, `/supabase/**`, `middleware.js`, and root config.
- `lib/types.ts` is the one file Workstream B also reads. Create it first (Task 1), treat it as frozen after that commit.
- Exactly one LLM call per analysis request. Model id `claude-sonnet-5`. No embeddings, no vector search.
- Auth: real email+password via Supabase Auth. No password-reset flow, no email verification requirement, no profile/settings page — `ponytail:` cut, add if the demo actually needs it. Email confirmation is disabled in the Supabase dashboard so signup logs the user in immediately.
- No `SUPABASE_SERVICE_ROLE_KEY` anywhere in app code — RLS (`auth.uid() = user_id`) plus the cookie session is the only trust boundary needed, and it's the correct one.
- Zero added npm dependencies beyond the Next.js/Supabase/Tailwind/shadcn scaffold, `@supabase/ssr`, and `@supabase/supabase-js` — no test framework, no Anthropic SDK.
- Text-paste input only. No file upload.
- Deploy checkpoint: a live URL must exist by the end of Task 1, before any feature logic is written.

---

## File Structure

- `lib/types.ts` — shared TS types (`CLO`, `Question`, `PastExamYear`, `SimilarityMatch`, `QuestionAnalysis`, `AnalysisResult`). Types only, no runtime code. Read by Workstream B.
- `lib/analyze.js` — pure functions: parse CLOs/questions/past-exams, build the Anthropic prompt, parse its JSON response. CommonJS, unit-tested directly with `node:test`.
- `lib/report.js` — pure functions turning an `AnalysisResult` into render-ready shapes. CommonJS, imported by Workstream B's components via ESM `import` (bundler interop).
- `lib/supabase/client.js` — browser Supabase client (`@supabase/ssr`'s `createBrowserClient`). ESM, used by login/signup pages and by Workstream B.
- `lib/supabase/server.js` — server Supabase client for Route Handlers and Server Components (`@supabase/ssr`'s `createServerClient`, reading Next's cookie store). ESM.
- `middleware.js` — refreshes the session cookie every request; redirects signed-out visitors to `/login`, signed-in visitors away from `/login`/`/signup`.
- `app/(auth)/login/page.js`, `app/(auth)/signup/page.js` — email+password forms.
- `supabase/migrations/0001_init.sql` — `analysis_runs` table + RLS policy (keyed to `auth.uid()`, works identically whether that uid came from anonymous or real auth — no schema change from the earlier draft).
- `app/api/analyze/route.js` — POST: parse inputs, call Anthropic, save run, return result.
- `app/api/runs/route.js` — GET: list the signed-in faculty member's past runs; GET one by id via `?id=`.
- `test/analyze.test.js`, `test/report.test.js` — `node:test` suites.

---

### Task 1: Scaffold Next.js + Supabase + shared types + deploy skeleton

**Files:**
- Create: Next.js project scaffold (package.json, next.config, app/layout.js, app/page.js placeholder)
- Create: `lib/types.ts`
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: TypeScript types in `lib/types.ts` —
  ```ts
  export type CLO = { id: string; text: string };
  export type Question = { id: number; text: string };
  export type PastExamYear = { year: string; questions: string[] };
  export type SimilarityMatch = { year: string; matchedQuestion: string; percent: number; reason: string };
  export type QuestionAnalysis = { id: number; clos: string[]; bloom: string; topic: string; similarity?: SimilarityMatch };
  export type AnalysisResult = { clos: CLO[]; questions: Question[]; analysis: QuestionAnalysis[] };
  ```
  Consumed by Workstream B's components (read-only).

- [ ] **Step 1: Scaffold the Next.js project**

```bash
cd /c/Users/hritt/faculty-os
npx create-next-app@latest . --js --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
npx shadcn@latest init -d
```
This overwrites the earlier static-site files — superseded, see the note at the top of `docs/superpowers/plans/2026-09-06-faculty-os.md`.

- [ ] **Step 2: Add the shared types file**

`lib/types.ts` — content as in Interfaces above.

- [ ] **Step 3: Write the Supabase migration**

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

- [ ] **Step 4: Link Supabase and apply the migration**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
Expected: `analysis_runs` table exists in the Supabase dashboard's Table Editor, RLS enabled. Email+password auth is on by default — nothing to enable for that; Task 4 turns off email confirmation.

- [ ] **Step 5: Deploy the skeleton to Vercel now**

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add ANTHROPIC_API_KEY production
npx vercel --prod --yes
```
No `SUPABASE_SERVICE_ROLE_KEY` — the app never uses it. Expected: a live URL serving the default Next.js/shadcn placeholder page before any feature work starts.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + shadcn + Supabase migration, deploy skeleton"
```

---

### Task 2: Input parsers (CLOs, exam questions, past exams)

**Files:**
- Create: `lib/analyze.js`
- Create: `test/analyze.test.js`

**Interfaces:**
- Produces: `parseCLOs(text) -> CLO[]`, `parseNumberedQuestions(text) -> Question[]`, `parsePastExams(text) -> PastExamYear[]` — consumed by Task 3 (same file) and Task 5 (`app/api/analyze/route.js`).

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

test('parseNumberedQuestions strips numbering', () => {
  const result = parseNumberedQuestions('1. What is Big-O?\n2) Define recursion');
  assert.deepStrictEqual(result, [
    { id: 1, text: 'What is Big-O?' },
    { id: 2, text: 'Define recursion' },
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
      return { id: i + 1, text: m ? m[1] : line };
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
- Produces: `buildPrompt({clos, questions, pastExams}) -> string`, `parseModelJSON(rawText) -> {questions: QuestionAnalysis[]}` — consumed by Task 5.

- [ ] **Step 1: Append the failing tests**

Append to `test/analyze.test.js`:
```js
const { buildPrompt, parseModelJSON } = require('../lib/analyze');

test('buildPrompt embeds CLOs, questions, and past exams', () => {
  const prompt = buildPrompt({
    clos: [{ id: 'CLO1', text: 'Explain recursion' }],
    questions: [{ id: 1, text: 'Define recursion' }],
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

test('parseModelJSON parses raw JSON', () => {
  const result = parseModelJSON('{"questions":[{"id":1,"clos":["CLO1"],"bloom":"Apply","topic":"Recursion"}]}');
  assert.strictEqual(result.questions.length, 1);
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
  const questionList = questions.map((q) => `Q${q.id}: ${q.text}`).join('\n');
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
      "id": <question id number>,
      "clos": ["CLO1"],
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
  return parsed;
}
```

Update the export line:
```js
module.exports = { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/analyze.js test/analyze.test.js
git commit -m "feat: add prompt builder and model-response parser"
```

---

### Task 4: Faculty auth — Supabase SSR clients, middleware, login/signup

**Files:**
- Create: `lib/supabase/client.js`
- Create: `lib/supabase/server.js`
- Create: `middleware.js`
- Create: `app/(auth)/login/page.js`
- Create: `app/(auth)/signup/page.js`

**Interfaces:**
- Produces: `getBrowserSupabase() -> SupabaseClient` (browser, cookie-aware — also used by Workstream B if it needs the signed-in user's email), `getServerSupabase() -> Promise<SupabaseClient>` (server, reads/writes cookies via `next/headers`) — consumed by Task 5's route handlers.

- [ ] **Step 1: Install the Supabase SSR + JS client**

```bash
npm install @supabase/ssr @supabase/supabase-js
```
`ponytail:` these are the two dependencies actually worth adding — hand-rolling cookie-based session refresh for Next.js App Router would be far more code, and far easier to get wrong on a trust boundary, than using Supabase's own SSR helper.

- [ ] **Step 2: Browser client**

`lib/supabase/client.js`:
```js
import { createBrowserClient } from '@supabase/ssr';

export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
```

- [ ] **Step 3: Server client**

`lib/supabase/server.js`:
```js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component render path — middleware.js refreshes the session instead
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Middleware — refresh session, protect app routes**

`middleware.js` (project root):
```js
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup');
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
```

- [ ] **Step 5: Login page**

`app/(auth)/login/page.js`:
```jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../../lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Faculty Login</h1>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
      <a href="/signup">Need an account? Sign up</a>
    </form>
  );
}
```

- [ ] **Step 6: Signup page**

`app/(auth)/signup/page.js`:
```jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../../lib/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Faculty Sign Up</h1>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign up</button>
      <a href="/login">Already have an account? Log in</a>
    </form>
  );
}
```

- [ ] **Step 7: Disable email confirmation for the demo**

Supabase dashboard → Authentication → Providers → Email → turn off "Confirm email". Without this, `signUp` leaves the user unconfirmed and unable to use the session immediately — the wow-moment demo can't afford an email round-trip. `ponytail:` no password-reset flow, no profile page, no email verification — cut list; add if the live demo actually needs one.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: real faculty auth (Supabase SSR, email+password, login/signup, middleware)"
```

---

### Task 5: `/api/analyze` and `/api/runs` route handlers

**Files:**
- Create: `app/api/analyze/route.js`
- Create: `app/api/runs/route.js`

**Interfaces:**
- Consumes: `lib/analyze.js` (Tasks 2-3), `lib/supabase/server.js` (Task 4).
- Produces: `POST /api/analyze` — body `{clos, exam, pastExams}`, reads the session from cookies automatically, returns `AnalysisResult` plus the saved row's `id`. `GET /api/runs` — same cookie session, returns `{runs: [...]}` for the signed-in faculty member only (enforced by RLS). `GET /api/runs?id=<uuid>` — one run.

- [ ] **Step 1: Write the analyze route**

`app/api/analyze/route.js`:
```js
import { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON } from '../../../lib/analyze';
import { getServerSupabase } from '../../../lib/supabase/server';

export async function POST(req) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
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

  const { data: row, error: insertError } = await supabase
    .from('analysis_runs')
    .insert({ user_id: user.id, clos_text: clos, exam_text: exam, past_exams_text: pastExams, result })
    .select('id')
    .single();

  if (insertError) {
    return Response.json({ error: `Saved result but failed to persist run: ${insertError.message}`, ...result }, { status: 200 });
  }

  return Response.json({ id: row.id, ...result });
}
```

- [ ] **Step 2: Write the runs route**

`app/api/runs/route.js`:
```js
import { getServerSupabase } from '../../../lib/supabase/server';

export async function GET(req) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // ponytail: no explicit .eq('user_id', user.id) filter here — RLS (auth.uid() = user_id)
  // already restricts every row this connection can see, so re-filtering client-side would
  // be redundant, not defense-in-depth. RLS is the actual trust boundary.
  let query = supabase.from('analysis_runs').select('*');
  query = id ? query.eq('id', id) : query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ runs: data });
}
```

- [ ] **Step 3: Manual verification (no mocked-fetch unit test — see note)**

`ponytail:` these two handlers are glue over already-tested pure functions (Task 2-3) plus two external calls (Anthropic, Supabase) — mocking both purely to unit-test glue code isn't proportionate here. Verified for real in Task 6's end-to-end smoke test. Upgrade path: extract branching into a pure function if this file grows real conditional logic beyond request validation.

- [ ] **Step 4: Commit**

```bash
git add app/api/analyze/route.js app/api/runs/route.js
git commit -m "feat: add /api/analyze and /api/runs route handlers"
```

---

### Task 6: Report transforms + deploy + end-to-end smoke test

**Files:**
- Create: `lib/report.js`
- Create: `test/report.test.js`

**Interfaces:**
- Consumes: the `AnalysisResult` shape from `/api/analyze` (Task 5).
- Produces: `buildCoverageMatrix(clos, questions, analysis) -> [{clo, covered: boolean[], isBlank: boolean}]`, `buildRecycledList(questions, analysis) -> [{question, similarity}]` (sorted desc by `similarity.percent`, filtered to `>= 60`), `buildBloomDistribution(analysis) -> [{level, count}]` — consumed by Workstream B's components.

- [ ] **Step 1: Write the failing tests**

`test/report.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { buildCoverageMatrix, buildRecycledList, buildBloomDistribution } = require('../lib/report');

test('buildCoverageMatrix flags a CLO with zero covering questions as blank', () => {
  const clos = [{ id: 'CLO1', text: 'a' }, { id: 'CLO2', text: 'b' }];
  const questions = [{ id: 1, text: 'q1' }, { id: 2, text: 'q2' }];
  const analysis = [
    { id: 1, clos: ['CLO1'], bloom: 'Apply', topic: 't' },
    { id: 2, clos: ['CLO1'], bloom: 'Apply', topic: 't' },
  ];
  const matrix = buildCoverageMatrix(clos, questions, analysis);
  assert.strictEqual(matrix[0].isBlank, false);
  assert.strictEqual(matrix[1].isBlank, true);
});

test('buildRecycledList sorts by similarity percent descending and drops low matches', () => {
  const questions = [{ id: 1, text: 'q1' }, { id: 2, text: 'q2' }, { id: 3, text: 'q3' }];
  const analysis = [
    { id: 1, similarity: { year: '2024', matchedQuestion: 'Q1', percent: 65, reason: 'r' } },
    { id: 2, similarity: { year: '2024', matchedQuestion: 'Q2', percent: 92, reason: 'r' } },
    { id: 3, similarity: null },
  ];
  const result = buildRecycledList(questions, analysis);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].question.id, 2);
});

test('buildBloomDistribution counts every level including zero counts', () => {
  const analysis = [{ id: 1, bloom: 'Apply' }, { id: 2, bloom: 'Apply' }, { id: 3, bloom: 'Remember' }];
  const dist = buildBloomDistribution(analysis);
  const apply = dist.find((d) => d.level === 'Apply');
  const create = dist.find((d) => d.level === 'Create');
  assert.strictEqual(apply.count, 2);
  assert.strictEqual(create.count, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../lib/report'`

- [ ] **Step 3: Write the minimal implementation**

`lib/report.js`:
```js
function buildCoverageMatrix(clos, questions, analysis) {
  const analysisById = new Map(analysis.map((a) => [a.id, a]));
  return clos.map((clo) => {
    const covered = questions.map((q) => {
      const a = analysisById.get(q.id);
      return !!(a && a.clos && a.clos.includes(clo.id));
    });
    return { clo, covered, isBlank: covered.every((c) => !c) };
  });
}

function buildRecycledList(questions, analysis) {
  const analysisById = new Map(analysis.map((a) => [a.id, a]));
  return questions
    .map((q) => ({ question: q, similarity: analysisById.get(q.id)?.similarity || null }))
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

module.exports = { buildCoverageMatrix, buildRecycledList, buildBloomDistribution };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (3 tests; 16 total across both test files)

- [ ] **Step 5: Commit**

```bash
git add lib/report.js test/report.test.js
git commit -m "feat: add report transform functions (coverage, recycled, bloom)"
```

- [ ] **Step 6: Redeploy**

```bash
npx vercel --prod --yes
```

- [ ] **Step 7: End-to-end smoke test against the deployed URL**

`ponytail:` real cookie-based sessions behind `middleware.js` are awkward to script with bare `curl` (cookie jar + Next's specific cookie names) for marginal benefit over just using the browser — verified manually instead:

1. Open the deployed URL in an incognito window → confirm it redirects to `/login`.
2. Click through to `/signup`, create a test faculty account (e.g. `demo1@test.edu` / a 6+ char password) → confirm it redirects to `/` signed in (no email-confirmation wait, since Task 4 Step 7 disabled that).
3. Paste this exact demo data (engineered to trigger both wow-moment flags) and click Analyze:

CLOs:
```
CLO1: Explain Big-O time complexity
CLO2: Implement recursive algorithms
CLO3: Analyze sorting algorithm tradeoffs
CLO4: Design a hash table from scratch
```

Draft Exam (this year):
```
1. What is the time complexity of binary search, and why?
2. Write a recursive function to compute the nth Fibonacci number.
3. Compare the average-case and worst-case time complexity of quicksort vs mergesort.
```

Past Exams:
```
2024
1. Write a recursive function that returns the nth Fibonacci number using memoization.
```

Expected: **CLO4 highlighted red ("— not tested")** and **Q2 shown with a ≥80% match to 2024 Q1**.

4. Open a second incognito window, sign up a second test account (`demo2@test.edu`) → confirm its History panel is empty (RLS isolation — this account cannot see `demo1`'s run).
5. Log back in as `demo1` → confirm the earlier run is still in History and reloads without calling the model again.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: verify backend end-to-end against deployed URL" --allow-empty
```
