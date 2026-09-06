# CLAUDE.md — Faculty OS

@AGENTS.md
@context.md

The two files above are the actual contract for this repo — read them before touching code. This file only adds notes specific to running Claude Code (or a Claude Agent SDK subagent) against this project.

## Executing a per-person plan

`Arko_Plan.md`, `Shads_Plan.md`, `Hrittika_Plan.md` are already superpowers-plan-shaped (checkbox `- [ ]` steps, Task/Files/Interfaces headers) — they just live at the repo root instead of `docs/superpowers/plans/`, since they predate this session and were written directly there. Don't move them; `superpowers:executing-plans` and `superpowers:subagent-driven-development` both work from a plan file at any path, they don't require the default location.

- **Recommended:** `superpowers:subagent-driven-development` — dispatch a fresh subagent per task in one of the three plans, review between tasks. Good fit here since the three plans are already independent workstreams with non-overlapping files.
- **Alternative:** `superpowers:executing-plans` for batch execution in the current session with checkpoints, if you'd rather stay in one thread than fork subagents.

Either way, apply the `src/`-path correction from `context.md` as each task's files get created — the plans' own paths are one directory level off from where Next.js will actually find them.

## Skill order for this repo

- `superpowers:brainstorming` — already done; the spec is locked in `plan.md`. Don't re-brainstorm scope unless the user explicitly reopens it.
- `superpowers:test-driven-development` / `tdd` — the rhythm every task in every plan already follows; don't skip the "run and confirm it fails" step even when it feels obvious.
- `supabase` / `supabase-postgres-best-practices` — load before touching `supabase/migrations/**` or any RLS policy (Arko's Task 1).
- `ponytail` — invoke explicitly ("apply ponytail rules") if a task starts growing beyond what its plan specifies.
- `superpowers:verification-before-completion` — before claiming any task done: run the test command the task names, or the curl/manual-verification step it specifies, and show the actual output. Several tasks are explicitly "not unit tested, verify manually" (`ponytail:`-flagged thin glue over an external call) — for those, the manual command in that task's own Step is the verification, not a claim without running it.
- `security-review` — before final deploy: confirm no secrets committed, `.env*` gitignored, and the env-var list matches `context.md` exactly (`GEMINI_API_KEY`, not `ANTHROPIC_API_KEY`).

## The one thing worth over-stating

Every Anthropic code sample inside `Arko_Plan.md` and `Hrittika_Plan.md` is dead code as written — the team moved to Gemini in `Master_Tasklist.md` after those plans were already written. If you're executing one of Arko's or Hrittika's route-handler tasks and the plan's own "Step" shows an Anthropic fetch block, replace it with the Gemini block from `Master_Tasklist.md` §2 inline, in the same task, rather than writing the Anthropic version first and circling back. `context.md`'s "LLM provider" section has the full before/after.
