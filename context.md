# Faculty OS — Project Context

**Read this first, before any plan file.** It tells you which doc to trust when two disagree, and what's actually true about the repo right now (as opposed to what the plans assumed would be true).

## What this is

Faculty paste Course Learning Outcomes + a draft exam + past exams (plus, on three extra screens, rubrics/syllabi/answers) and get back an AI report: untested outcomes, recycled questions, syllabus overlap, and grading-consistency flags. Built in a 5.5-hour hackathon window by a 3-person team (2 humans + agentic coding tools). No presentation — the live app has to speak for itself.

One sentence, one team, three parallel workstreams, zero shared files by design.

## Source-of-truth hierarchy (read in this order when docs conflict)

1. **`plan.md`** — the PRD. User flow, data model, the Frozen Contract (routes/request/response shapes), the workstream file-ownership split. This is the spec everything else implements.
2. **`DESIGN.md`** — colors, typography, spacing, motion tokens. Every UI task reads this before writing UI code. (It references a `design-system/faculty-os/MASTER.md` as the deeper source of truth — that file was never generated; `DESIGN.md` itself is authoritative in its absence.)
3. **`Master_Tasklist.md`** — written *after* `plan.md`, adds three things the other docs don't have: the full tech-stack table, the **Gemini API migration** (overrides every Anthropic reference below), and a task list tagged by real teammate name. **Its Gemini decision overrides plan.md/DESIGN.md/all three per-person plans wherever they still say Anthropic** — see "LLM provider" below.
4. **`Arko_Plan.md` / `Shads_Plan.md` / `Hrittika_Plan.md`** — the actual step-by-step TDD execution plans, one per teammate, each self-contained (goal, architecture, file ownership, task-by-task code). These are what an agent actually executes, task by task, via `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
5. **`Backend_Plan.md`** — **SUPERSEDED, do not execute.** Kept only for reference. It designed real email+password auth (`@supabase/ssr`, login/signup pages, `middleware.js` redirects) and only ever covered `/api/analyze`+`/api/runs`. `plan.md`'s "Auth decision" section explicitly overrode this in favor of **anonymous** Supabase auth — no login screens at all. If you see login/signup/middleware code being planned or written, stop: that's the dead design.
6. **`hackathon-5.5hr-team-playbook.md`** — the meta-process doc (phase timing, prompts, team-division options, skills list). Useful for schedule/process context, not for feature specifics.

## LLM provider: Gemini, not Anthropic — read this before writing any route handler

Every one of the three per-person plans (`Arko_Plan.md`, `Hrittika_Plan.md`, and the superseded `Backend_Plan.md`) writes its route-handler code samples against the **Anthropic** API (`api.anthropic.com`, `x-api-key`, `ANTHROPIC_API_KEY`, model `claude-sonnet-5`). The team decision recorded in `Master_Tasklist.md` §2 (2026-09-06) **replaced this entirely with Google Gemini** before any of the LLM-calling code had actually been written. Practical upshot: **write the Gemini version directly — do not write the Anthropic block from a plan and then migrate it.**

| | Value |
|---|---|
| Model | `gemini-2.5-flash` (bump to `gemini-2.5-pro` if quality looks weak in QA — one-line model-id swap only) |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |
| Auth header | `x-goog-api-key: <GEMINI_API_KEY>` |
| Env var | `GEMINI_API_KEY` (replaces `ANTHROPIC_API_KEY` everywhere, including `plan.md`'s Frozen Contract env-var line and any Vercel env config) |
| Request | `{ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 } }` — `maxOutputTokens` is 4096 for `/api/analyze`, 2048 for the 3 secondary routes |
| Response | extract text via `data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''` |

The exact before/after code block for all 4 call sites is in `Master_Tasklist.md` §2 — copy the "After (Gemini)" block, not the "Before (Anthropic)" one shown for context. Parsing, prompt-building, and error-shape logic around that block are provider-agnostic and unchanged from what each plan already wrote.

## Auth: anonymous only

`supabase.auth.signInAnonymously()` fires once on page load, client-side, no visible UI. No login/signup pages, no `@supabase/ssr`, no cookie session, no `middleware.js`. Every `/api/analyze` and `/api/runs` request carries `Authorization: Bearer <access_token>`; the other three routes (`/api/overlap`, `/api/grader-consistency`, `/api/grade`) need no auth header at all. "Allow anonymous sign-ins" must be toggled on in the Supabase dashboard (Authentication → Settings) — off by default, fails silently otherwise.

## Data

One table, `analysis_runs` (Exam Quality's report only — the other 3 features are stateless single-shot, no table). RLS policy `own_rows_only`: `auth.uid() = user_id`, `select`/`insert` only, no `update`/`delete`. `SUPABASE_SERVICE_ROLE_KEY` is a provisioned env var but **must never appear in app code** — the anon key plus the per-request bearer token plus RLS is the entire trust boundary.

## ⚠️ Known deviation: the actual scaffold doesn't match what the plans assume

All three per-person plans (and the superseded one) were written assuming a scaffold created with `create-next-app --no-src-dir` and plain JavaScript. The scaffold actually committed (`e2d05d3`) used the **`src/` layout with TypeScript** instead — Next.js 16.3.4, React 19.2, Tailwind 4, shadcn/ui, `@/*` aliased to `./src/*` (see `tsconfig.json`). This wasn't corrected before the plans were written, so every file path inside them needs a small mental adjustment as you execute:

- **`app/**` → create under `src/app/**`.** Next's App Router only looks inside `src/app` in this project. `app/api/analyze/route.js` from Arko's plan becomes `src/app/api/analyze/route.js`; `app/(app)/exam-quality/page.js` from Shads' plan becomes `src/app/(app)/exam-quality/page.js`. Same for `app/page.js`, `app/layout.js`.
- **`components/**` → create under `src/components/**`**, as a sibling of the shadcn output already there (`src/components/ui/button.tsx`). Don't create a second, separate root-level `components/` — it'll just be confusing next to `src/components/ui/`.
- **Relative imports inside every moved `app/`/`components/` file need one extra `../`.** A plan's `route.js` importing `../../../lib/analyze` (3 levels up from an assumed-root `app/`) is now 4 levels deep (`app` → `src` → root), so it becomes `../../../../lib/analyze`. Same +1 correction for every page/component's relative import into `components/` or `lib/`. Alternative, arguably cleaner: use the existing `@/*` alias for anything you moved under `src/` (e.g. `@/components/reportTransforms`), and keep plain relative paths only for crossing out to the root-level `lib/`/`test/`/`fixtures/` below.
- **`lib/`, `test/`, `fixtures/`, `supabase/`, `scripts/` stay exactly where each plan puts them — at repo root, outside `src/`.** These aren't part of Next's router/bundler resolution (the pure-logic `lib/*.js` files are `require()`d directly by bare `node --test test/`, independent of Next entirely), so nothing about the `src/` layout affects them. Do **not** move `lib/analyze.js`, `lib/overlap.js`, etc. under `src/`.
- **JS/JSX files alongside the TS scaffold are fine, don't "fix" this.** `tsconfig.json` has `allowJs: true`; Next.js resolves `.js`/`.jsx` route/page files next to `.tsx` ones without issue. Writing each plan's files exactly as `.js`/`.jsx`/CommonJS as specified is correct — porting them to TypeScript mid-hackathon is scope nobody asked for.
- **`src/lib/supabase.ts`** (already committed — a browser Supabase client using the anon key) is unrelated to Arko's planned `lib/supabase/serverClient.js` (a server-side bearer-token verifier, at repo root per the point above). Both coexist; don't merge or confuse them.

If in doubt about a specific file's real location, this rule resolves it: **"does Next.js's router/bundler need to find this file?" → yes → under `src/`. no (tests, migrations, fixtures, scripts) → repo root, exactly as written.**

## Team & file ownership (from `plan.md`'s workstream split + `Master_Tasklist.md`'s real-name assignment)

| Person | Owns | Plan | Depends on anyone? |
|---|---|---|---|
| **Arko** | Backend core: anon auth, DB, `/api/analyze` + `/api/runs` | `Arko_Plan.md` | No — builds straight from `plan.md` |
| **Shads** | All 4 screens' UI | `Shads_Plan.md` | No — builds against his own mocks matching the Frozen Contract, swaps in real `fetch` calls last (his Task 9) |
| **Hrittika** | The 3 secondary routes (`/api/overlap`, `/api/grader-consistency`, `/api/grade`) + fixtures + QA | `Hrittika_Plan.md` | No — these 3 routes are stateless/unauthenticated by design |

No two people's files overlap. The one thing that crosses the split mid-build: if the 3 secondary routes ever need auth-gating, that's Arko editing an eventual `middleware.js`, not Hrittika touching her route files.

## Env vars

`GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (provisioned, server-only, unused in app code — see Data section above).

## Guardrails (from `hackathon-5.5hr-team-playbook.md` / `Master_Tasklist.md` §4)

- Cut-list priority if behind schedule: P2 features first (Grader Consistency, AI-Anchored Grading), then P1 (Syllabus Overlap). Never touch the P0 four (Exam Quality Check, CLO Coverage Matrix, Dedup & Tagging, Run History), never cut QA or the security pass.
- If Gemini output quality looks worse than expected on any one route during QA, the fix is a model-id bump to `gemini-2.5-pro` on that route only — not a rollback to Anthropic.
- `ponytail` scope-guard applies all day: minimum code that works, no unrequested abstractions, no dependency not already named in a plan.

## Picking up work

1. Read `plan.md` + `DESIGN.md` (the spec), then this file, then `Master_Tasklist.md` (tech stack + Gemini override), then your own person's `*_Plan.md`.
2. Apply the `src/` path correction above as you create each file — the plan's own path is still the right *relative structure*, just nested one level deeper.
3. Write the Gemini call from the start; ignore the Anthropic sample code in your plan except as a reference for what stays unchanged around it (parsing, error shapes).
4. Execute your plan task-by-task with `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` — both skills work directly off the checkbox (`- [ ]`) steps already in each plan file. See `AGENTS.md` for conventions and `CLAUDE.md` for Claude-Code-specific execution notes.
