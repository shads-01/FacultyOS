# AGENTS.md — Faculty OS

Instructions for any coding agent (Claude Code, Antigravity, Codex, Cursor, or otherwise) working in this repo. Tool-specific notes live in `CLAUDE.md`; this file is the shared contract all of them follow.

**Read `context.md` first.** It resolves conflicts between the plan docs below and documents a real deviation between what those plans assume about the file layout and what's actually in the repo. Do not start editing files from a `*_Plan.md` without having read it — the plan's own file paths are one level off from where they need to go.

## What this repo is

Faculty OS: a hackathon app (3-person team, 5.5h build). Faculty paste CLOs/exam/rubrics/syllabi text and get back AI-generated audit reports across 4 screens. Full spec: `plan.md` + `DESIGN.md`. Tech stack + the Gemini-provider decision: `Master_Tasklist.md`. Per-person execution plans: `Arko_Plan.md`, `Shads_Plan.md`, `Hrittika_Plan.md`. `Backend_Plan.md` was superseded, then **reinstated 2026-09-06** for its auth design (real email+password) — see `context.md`'s "Auth" section and source-of-truth hierarchy before assuming it's dead.

## Stack & commands

- Next.js 16 (App Router, `src/` layout), React 19, TypeScript + plain JS/JSX mixed (both are fine — see `context.md`'s deviation note), Tailwind 4, shadcn/ui ("New York" style).
- Supabase: Postgres + real email/password Auth (`@supabase/ssr`, cookie-based session, `middleware.js`, login/signup pages) — reinstated 2026-09-06, see `context.md`'s "Auth" section. RLS is still the trust boundary underneath the session.
- LLM: **Google Gemini** (`gemini-2.5-flash`) via native `fetch` — no SDK. Not Anthropic; see `context.md`'s "LLM provider" section before writing any route handler.
- Tests: Node's built-in `node:test` for pure logic (`node --test test/`) — no Jest/Vitest, zero test-framework dependencies.
- Deploy: Vercel, zero-config.

```bash
npm run dev      # local dev server
npm run build    # production build
npm run lint     # eslint
node --test test/   # run the node:test suite (pure-logic files only — lib/, not app/)
```

No new npm dependency beyond what a plan already names. If a task seems to need one, that's a signal to stop and re-check the plan rather than add it.

## File ownership — do not cross these lines

Three people build in parallel on deliberately disjoint files. An agent picking up "Arko's plan," "Shads' plan," or "Hrittika's plan" touches **only** the files that plan's Global Constraints section lists as owned, remapped under `src/` per `context.md`. Concretely:

| Owner | Files (repo-root-relative unless noted) |
|---|---|
| Arko | `src/app/api/analyze/**`, `src/app/api/runs/**`, `src/app/(auth)/**` (login/signup), `src/middleware.js`, `supabase/**`, `lib/types.ts`, `lib/analyze.js`, `lib/supabase/client.js`, `lib/supabase/server.js`, `scripts/smoke-test.mjs`, `test/analyze.test.js`, `test/auth.test.js` |
| Shads | `src/app/page.js` (root redirect only, once, at his Task 1), `src/app/layout.tsx` (font/tokens only), `src/app/(app)/**`, `src/components/**` (excluding `src/components/ui/**`, which is shadcn's own output — leave that alone) |
| Hrittika | `src/app/api/overlap/route.js`, `src/app/api/grader-consistency/route.js`, `src/app/api/grade/route.js`, `lib/overlap.js`, `lib/graderConsistency.js`, `lib/grade.js`, `fixtures/**`, `test/overlap.test.js`, `test/graderConsistency.test.js`, `test/grade.test.js` |

If you're not sure whose file you're about to touch, check the three `*_Plan.md` Global Constraints sections — each states explicitly what it must never touch. When two plans would touch the same file, stop and flag it rather than resolve it unilaterally; `plan.md`'s "Shared-file risk" section already worked through the one known case (`lib/types.ts` — Shads/Hrittika keep their own local copies of its shapes rather than importing it).

## Conventions to follow inside a task

- **Pure logic first, thin glue second.** Every plan's odd/even task split (parse+prompt+parse-response vs. the route handler that calls the API) exists so the testable part is CommonJS + `node:test`-covered, and the untestable part (one external fetch) stays thin and is verified manually or via the smoke test, never mocked just to hit a coverage number.
- **TDD is the default rhythm**: write the failing test from the plan, run it, confirm the failure reason matches what the plan says, implement the minimal code, run again, confirm pass, commit. Don't skip the "confirm it fails first" step even though it feels slow — it's what catches a typo'd import path before it's mistaken for a passing feature.
- **`ponytail:` comments in the plans are deliberate, not lazy shortcuts** — minimum code proportionate to a 5.5-hour build. Don't "improve" past what a plan specifies (extra validation layers, abstracted shared modules, defensive code for cases the plan explicitly cut) unless the user asks.
- **Error-response shape is a contract, not a suggestion**: every route returns `{error: string}` with the exact status codes each plan specifies (400 missing input, 401 bad/missing auth, 500 missing API key, 502 upstream/parse failure). Keep that shape when doing the Gemini swap — only the error *text* changes from "Anthropic API ..." to "Gemini API ...".
- **Commit after every task**, using the commit message given in that task's Step — small, frequent commits are what let three people's parallel work merge without drama.

## Where to look for X

- Route/response shapes, table schema: `plan.md`'s "Frozen Contract" and "Data Model" sections.
- Colors/type/spacing/motion: `DESIGN.md`.
- Which env var, which model, which endpoint: `Master_Tasklist.md` §1-2, and `context.md`'s summary of it.
- Step-by-step code for a specific file: the owning person's `*_Plan.md`.
- Whether a scaffold step has already run: `git log`/`git status` — plans' own Task 0 already tells you to check and skip if so.
