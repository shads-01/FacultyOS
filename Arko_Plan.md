# Faculty OS — Arko's Plan (Backend Core: Analyze + Runs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared Next.js + Supabase scaffold and the real-auth-backed `/api/analyze` + `/api/runs` flow — Features #1/#5/#4 (Exam Quality Check, CLO Coverage Matrix, Dedup & Tagging) and #6 (Run History) — matching `plan.md`'s Frozen Contract exactly.

> **Reversed 2026-09-06:** this plan originally used anonymous Supabase auth (bearer-token verification, no login pages). `plan.md`'s Auth decision flipped back to **real email+password auth** — see `context.md`'s "Auth" section. Tasks 1, 4, 5, 6, 7 below are rewritten for that; Tasks 0, 2, 3 (scaffold, parsers, prompt builder) are auth-agnostic and unchanged.

**Architecture:** Next.js App Router route handlers. Real Supabase email+password auth via `@supabase/ssr`: faculty sign in/up on `/login`/`/signup`, the session lives in an HTTP-only cookie, `middleware.js` refreshes that cookie every request and redirects signed-out visitors to `/login`. Route handlers read the session server-side via `getServerSupabase()` (no bearer token, no manual JWT verification) and use that same session-scoped client for all Postgres access, so `auth.uid()` resolves correctly under RLS. Exactly one Gemini call per analyze request. Pure parsing/prompt/response-parsing logic lives in CommonJS files unit-tested with `node:test`; route handlers import them with ESM `import` (Next's bundler resolves CJS named exports via `cjs-module-lexer`).

**Tech Stack:** Next.js (App Router) + Tailwind + shadcn/ui scaffold, Supabase (Postgres + email/password Auth + RLS), `@supabase/ssr` + `@supabase/supabase-js`, Vercel deploy, `node:test`, native `fetch` for the Gemini call (see `context.md`'s "LLM provider" section — every Anthropic sample below is dead code, write Gemini directly). Model id `gemini-2.5-flash`.

**Spec:** `plan.md` and `DESIGN.md` at the project root, plus this plan.

## Global Constraints

- Real Supabase email+password auth via `@supabase/ssr`. Faculty sign up/log in on `/login`/`/signup`; the session lives in a cookie managed by `@supabase/ssr`'s `createBrowserClient`/`createServerClient`; `middleware.js` refreshes that cookie on every request and redirects signed-out visitors to `/login` (and signed-in visitors away from `/login`/`/signup`). No bearer tokens, no manual JWT verification in route handlers — `getServerSupabase()` reads the cookie session directly. This reinstates `Backend_Plan.md`'s original design; see `context.md`'s "Auth" section for why the anonymous-auth version of this plan was reverted.
- In the Supabase dashboard: **Authentication → Providers → Email → turn off "Confirm email"** — without this, `signUp` leaves the user unconfirmed and unable to use the session immediately, which the demo can't afford. (No "enable anonymous sign-ins" toggle needed — that was the reverted design.)
- Exactly one Gemini call per analyze request. Model id `gemini-2.5-flash`. No embeddings, no vector search, no multi-call orchestration.
- RLS is the only trust boundary underneath the session: `own_rows_only` policy, `auth.uid() = user_id`, `select`/`insert` only — no `update`/`delete` (immutable history).
- Never use `SUPABASE_SERVICE_ROLE_KEY` in app code, even though it's a provisioned env var in `plan.md` — the cookie session plus RLS is the correct and sufficient boundary.
- Zero added npm dependencies beyond the Next.js/Tailwind/shadcn scaffold, `@supabase/supabase-js`, and `@supabase/ssr`. No test framework beyond `node:test`, no LLM SDK (native `fetch` to Gemini).
- Text-paste input only. No file upload.
- File ownership — you touch **only**: `src/app/api/analyze/**`, `src/app/api/runs/**`, `src/app/(auth)/**` (login/signup), `src/middleware.js`, `supabase/**`, `lib/types.ts`, `lib/analyze.js`, `lib/supabase/client.js`, `lib/supabase/server.js`, `scripts/smoke-test.mjs`, and (Task 0 only, if you're the one who runs it) the scaffold's `package.json`/`next.config.js`/Tailwind+shadcn config. **Never touch `src/app/page.js` or `src/app/layout.tsx` after Task 0** — those are Shads' from the moment the scaffold lands (his Task 1 touches the redirect only). Never touch `src/app/(app)/**`, `src/components/**` (Shads), or `src/app/api/overlap/**`, `src/app/api/grader-consistency/**`, `src/app/api/grade/**`, `fixtures/**` (Hrittika).
- Deploy checkpoint: a live URL must exist by the end of Task 1, before any feature logic is written.
- **`src/middleware.js` is now required** (reversing this plan's earlier "intentionally not created" call) — real auth needs page-level redirects for signed-out visitors, which anonymous auth never did. Note the `src/` layout puts it at `src/middleware.js`, not repo root (`context.md`'s deviation note).

---

## File Structure

- `package.json`, `next.config.js`, `src/app/layout.tsx`, `src/app/page.tsx` — Next.js/Tailwind/shadcn scaffold output, committed as-is (Shads' plan touches the redirect/fonts; you only ship the stock scaffold).
- `lib/types.ts` — shared TypeScript types matching the Frozen Contract (`CLO`, `Question`, `QuestionAnalysis`, `SimilarityMatch`, `AnalysisResult`). Read-only reference for Shads/Hrittika — per `plan.md`'s shared-file-risk note, they keep their own local copies rather than importing it, so this file has exactly one owner: you.
- `lib/analyze.js` — pure functions: `parseCLOs`, `parseNumberedQuestions`, `parsePastExams`, `buildPrompt`, `parseModelJSON`. CommonJS, unit-tested directly.
- `lib/supabase/client.js` — `getBrowserSupabase()`, the `@supabase/ssr` browser client (cookie-aware). Used by the login/signup pages.
- `lib/supabase/server.js` — `getServerSupabase()`, the `@supabase/ssr` server client for Route Handlers (reads/writes the session cookie via `next/headers`). Thin glue over one external call, not unit-tested — verified in Task 7.
- `src/middleware.js` — refreshes the session cookie every request; redirects signed-out visitors to `/login`, signed-in visitors away from `/login`/`/signup`.
- `src/app/(auth)/login/page.js`, `src/app/(auth)/signup/page.js` — email+password forms.
- `supabase/migrations/0001_init.sql` — `analysis_runs` table + RLS policies.
- `src/app/api/analyze/route.js` — `POST`: parse inputs, call Gemini, insert the run, return the result.
- `src/app/api/runs/route.js` — `GET`: list the caller's own runs (RLS-scoped).
- `test/analyze.test.js` — `node:test` suite (parsers/prompt/parse only — the SSR clients and middleware are thin glue, verified manually per Task 7).
- `scripts/smoke-test.mjs` — **not used for auth verification** (cookie sessions don't script cleanly with bare `fetch`, see Task 7) — kept only if you still want an unauthenticated smoke check of something stateless; Task 7's real verification is manual, in-browser.

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

Expected: `analysis_runs` exists in the Table Editor with RLS enabled. Email+password auth is on by default — nothing to toggle here; Task 4 turns off email confirmation so the demo doesn't need an email round-trip.

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

### Task 4: Faculty auth — Supabase SSR clients, middleware, login/signup

**Files:**
- Create: `lib/supabase/client.js`
- Create: `lib/supabase/server.js`
- Create: `src/middleware.js`
- Create: `src/app/(auth)/login/page.js`
- Create: `src/app/(auth)/signup/page.js`

**Interfaces:**
- Produces: `getBrowserSupabase() -> SupabaseClient` (browser, cookie-aware), `getServerSupabase() -> Promise<SupabaseClient>` (server, reads/writes cookies via `next/headers`) — consumed by Task 5/6's route handlers.

This task is thin glue over `@supabase/ssr` (session cookie handling, auth redirects, two plain HTML forms) — no pure logic to TDD here, same reasoning `Backend_Plan.md` gives for its equivalent task. Verified manually in Task 7, not unit tested.

- [ ] **Step 1: Install the Supabase SSR client**

```bash
npm install @supabase/ssr
```
(`@supabase/supabase-js` is already a dependency.) `ponytail:` `@supabase/ssr` is the one dependency worth adding here — hand-rolling cookie-based session refresh for the App Router would be far more code, and far easier to get wrong on a trust boundary, than using Supabase's own SSR helper.

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

`src/middleware.js` (inside `src/` because this scaffold uses the `src/` layout — `context.md`'s deviation note):
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

`src/app/(auth)/login/page.js`:
```jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../../../lib/supabase/client';

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

`src/app/(auth)/signup/page.js`:
```jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../../../lib/supabase/client';

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

### Task 5: `/api/analyze` route handler

**Files:**
- Create: `src/app/api/analyze/route.js`

**Interfaces:**
- Consumes: `lib/analyze.js` (Tasks 2-3), `lib/supabase/server.js` (Task 4).
- Produces: `POST /api/analyze` — no header needed, session read from cookies automatically, body `{clos, exam, pastExams}` (strings), response `{clos, questions, analysis}` on 200, `{error}` on 4xx/5xx. Saves the run as a side effect. Matches `plan.md`'s Frozen Contract.

- [ ] **Step 1: Write the handler**

`src/app/api/analyze/route.js`:
```js
import { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON } from '../../../../lib/analyze';
import { getServerSupabase } from '../../../../lib/supabase/server';

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

`ponytail:` this file is thin glue over already-tested pure functions plus two external calls (Gemini, Supabase) — mocking both purely to unit-test glue code isn't proportionate here. Verified for real in Task 7 against the deployed endpoint.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/analyze/route.js
git commit -m "feat: add POST /api/analyze route handler"
```

---

### Task 6: `/api/runs` route handler

**Files:**
- Create: `src/app/api/runs/route.js`

**Interfaces:**
- Consumes: `lib/supabase/server.js` (Task 4).
- Produces: `GET /api/runs` — no header needed, session read from cookies, response `{runs: {id, created_at, result}[]}`, RLS-scoped to the caller's own rows.

- [ ] **Step 1: Write the handler**

`src/app/api/runs/route.js`:
```js
import { getServerSupabase } from '../../../../lib/supabase/server';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  // ponytail: no explicit .eq('user_id', user.id) filter here — RLS (auth.uid() = user_id)
  // already restricts every row this connection can see, so re-filtering client-side would
  // be redundant, not defense-in-depth. RLS is the actual trust boundary.
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
git add src/app/api/runs/route.js
git commit -m "feat: add GET /api/runs route handler"
```

---

### Task 7: Deploy + end-to-end manual verification

**Files:** none (verification-only task).

**Interfaces:**
- Consumes: the full backend (Tasks 0-6), deployed. Self-contained — does not require Shads' UI or Hrittika's routes to exist, beyond using the browser to reach `/login`.

`ponytail:` real cookie-based sessions behind `src/middleware.js` are awkward to script with bare `fetch`/`curl` (cookie jar + Next's specific cookie names) for marginal benefit over just using the browser — the anonymous-auth version of this plan used a scripted smoke test with `signInAnonymously()`; that no longer applies now that signing in requires a real account. Verified manually instead, same as `Backend_Plan.md`'s equivalent step.

- [ ] **Step 1: Redeploy**

```bash
npx vercel --prod --yes
```

- [ ] **Step 2: Manual end-to-end check against the deployed URL**

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

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: verify backend end-to-end against deployed URL" --allow-empty
```
