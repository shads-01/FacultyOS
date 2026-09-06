# Faculty OS — Master Task List (Tech Stack + Gemini API Migration)

> **What this file is:** a companion reference, not a replacement. `plan.md` and `DESIGN.md` at the project root are still the spec; `2026-09-06-faculty-os-arko.md` / `-shads.md` / `-hrittika.md` are still the step-by-step TDD plans each person executes. This file adds the three things those docs don't have in one place: (1) the whole app's tech stack on one page, (2) a concrete **Gemini API** migration plan — every existing doc still calls Anthropic/Claude — and (3) a full task list tagged by which teammate owns it.
>
> **Team decision (2026-09-06):** replace Anthropic entirely with Gemini. One provider, everywhere — consistent with `plan.md`'s "exactly one LLM call per request" constraint. Team split stays the 3-person real-name split from `plan.md`: **Arko** (backend core), **Shads** (frontend, all 4 screens), **Hrittika** (3 secondary routes + fixtures + QA).
>
> **Auth note (2026-09-06, later same day):** the "anonymous Auth" row and "Bearer-token auth helper" task below are stale — `plan.md`'s Auth decision reversed back to real email+password auth (see `context.md`'s "Auth" section). `Arko_Plan.md` Tasks 1/4/5/6/7 carry the corrected version; treat this file's tech-stack row and Task 4 line below as historical, not executable.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js (App Router) | `--js --tailwind --eslint --app --no-src-dir` |
| Styling | Tailwind + shadcn/ui ("New York" style) | tokens in `DESIGN.md` |
| Motion | GSAP | wow-moment reveal only, 2 elements, per `DESIGN.md` |
| Font | Plus Jakarta Sans | Google Fonts |
| **LLM** | **Google Gemini API** (`gemini-2.5-flash`) | replaces Anthropic Claude — see §2 |
| Auth | Supabase anonymous Auth (`@supabase/supabase-js`) | no `@supabase/ssr`, no login/signup pages, no cookies |
| Database | Supabase Postgres, RLS-only trust boundary | `analysis_runs` table, `auth.uid() = user_id` |
| Backend | Next.js Route Handlers | native `fetch`, no LLM SDK dependency |
| Testing | Node built-in `node:test` | zero test-framework dependencies, no Jest/Vitest |
| Deploy | Vercel | zero-config, `/app/api/**` auto-detected |

No file-upload, no charting library, no state-management library, no embeddings/vector search — unchanged cut list from `plan.md`.

---

## 2. Gemini API Plan

### Why Gemini, and what changes
Every call site is currently identical in shape: build a prompt from parsed text, POST it to an LLM, parse JSON back out of the raw text response. Swapping providers only touches that one block per file — the parse functions, prompts, and route logic around it are untouched.

### Provider details
| | Value |
|---|---|
| Model id | `gemini-2.5-flash` (fast + cheap — right fit for 4 route types on a hackathon clock). If quality on the recycled-question or AI-anchored-grading tasks looks weak during QA, `gemini-2.5-pro` is a one-line model-id swap, same request/response shape. |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |
| Auth | `x-goog-api-key: <GEMINI_API_KEY>` header (not a URL query param — keeps the key out of logs/redirect chains) |
| Env var | `GEMINI_API_KEY` — replaces `ANTHROPIC_API_KEY` everywhere |

### Request shape
```json
{
  "contents": [{ "parts": [{ "text": "<the same prompt buildX() already produces>" }] }],
  "generationConfig": {
    "responseMimeType": "application/json",
    "maxOutputTokens": 4096
  }
}
```
`maxOutputTokens` matches each route's existing Anthropic `max_tokens` budget: **4096** for `/api/analyze`, **2048** for the 3 secondary routes.

`responseMimeType: "application/json"` is Gemini's native JSON mode — the model is constrained to emit valid JSON, no markdown fences. `ponytail:` every existing `parseXJSON` function still opens with a fence-strip regex (`replace(/^```(?:json)?/i, ...)`) — leave it in as defensive no-op insurance rather than removing it; it costs nothing at runtime when there are no fences to strip, and removing it to chase purity isn't worth a possible demo-day surprise if Gemini's JSON-mode guarantee ever slips.

### Response shape
```json
{ "candidates": [{ "content": { "parts": [{ "text": "<the JSON string>" }] } }] }
```
Extract with `data.candidates?.[0]?.content?.parts?.[0]?.text || ''` (was `data.content?.[0]?.text || ''` for Anthropic).

### Error-handling contract — unchanged
Every route keeps its existing 4xx/5xx shape: 500 if the key isn't configured, 502 on a fetch failure or non-2xx response, 502 if `parseXJSON` throws. Only the error-message text changes from "Anthropic API ..." to "Gemini API ...".

### The actual code delta (apply identically at all 4 call sites)
This is the one block that changes in `app/api/analyze/route.js` (Arko) and `app/api/overlap/route.js`, `app/api/grader-consistency/route.js`, `app/api/grade/route.js` (Hrittika). Everything before it (parsing inputs, building the prompt) and after it (`parseXJSON(rawText)` onward) stays exactly as already written in each person's plan.

Before (Anthropic):
```js
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
        max_tokens: 4096, // 2048 on the 3 secondary routes
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
```

After (Gemini):
```js
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  let geminiRes;
  try {
    geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 }, // 2048 on the 3 secondary routes
        }),
      },
    );
  } catch (e) {
    return Response.json({ error: `Gemini API request failed: ${e.message}` }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return Response.json({ error: `Gemini API error: ${errText}` }, { status: 502 });
  }

  const data = await geminiRes.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
```

No new npm dependency — this is native `fetch`, same as the Anthropic call it replaces.

---

## 3. Full Task List

### Arko — Backend core (auth, DB, `/api/analyze` + `/api/runs`)
Full step-by-step detail: `2026-09-06-faculty-os-arko.md`. All 7 tasks stand as written except Task 5.

| Task | What | Gemini-affected? |
|---|---|---|
| 0 | Shared Next.js/Tailwind/shadcn scaffold | no |
| 1 | Shared types (`lib/types.ts`) + Supabase migration + deploy skeleton | **yes — env var step** (see §Cross-cutting) |
| 2 | Input parsers (`parseCLOs`, `parseNumberedQuestions`, `parsePastExams`) | no |
| 3 | Prompt builder + `parseModelJSON` | no — prompt text and parse logic are provider-agnostic |
| 4 | Bearer-token auth helper (`requireUser`) | no |
| 5 | `/api/analyze` route handler | **yes** |
| 6 | `/api/runs` route handler | no |
| 7 | Deploy + end-to-end smoke test | no code change, but rerun after Task 5's swap |

- [ ] **Gemini task A1 (replaces Task 5's LLM-call block):** In `app/api/analyze/route.js`, swap the Anthropic fetch block for the Gemini block in §2 above (`maxOutputTokens: 4096`). Everything else in the handler (parsing, prompt build, Supabase insert) is untouched.
- [ ] **Gemini task A2:** Update `vercel env add` in Task 1/Task 7 from `ANTHROPIC_API_KEY` to `GEMINI_API_KEY` (production + local `.env.local`).
- [ ] **Gemini task A3:** Re-run `scripts/smoke-test.mjs` (Task 7) against the redeployed URL — no script changes needed, it only asserts on `/api/analyze`'s response shape, which is unchanged.

### Shads — Frontend (all 4 screens)
Full step-by-step detail: `2026-09-06-faculty-os-shads.md`. All 10 tasks (0–9) stand as written, **zero Gemini-migration tasks**. Her code only ever calls her own backend's routes over `fetch` — it never touches an LLM SDK, model id, or provider-specific header — so a provider swap on the backend is invisible to her files. Called out explicitly here so nothing gets silently assumed to be "someone else's problem" and skipped.

### Hrittika — Secondary routes + fixtures + QA (`/api/overlap`, `/api/grader-consistency`, `/api/grade`)
Full step-by-step detail: `2026-09-06-faculty-os-hrittika.md`. All 7 tasks stand as written except Tasks 2, 4, 6 (the three route handlers).

| Task | What | Gemini-affected? |
|---|---|---|
| 1 | Syllabus Overlap parsers/prompt/parse | no |
| 2 | `/api/overlap` route handler + fixture | **yes** |
| 3 | Grader Consistency parsers/prompt/parse | no |
| 4 | `/api/grader-consistency` route handler + fixture | **yes** |
| 5 | AI-Anchored Grading parsers/prompt/parse | no |
| 6 | `/api/grade` route handler + fixture | **yes** |
| 7 | Cross-route QA (edge-case tests) | no code change, but the deployed-route curl checks (Step 4) now hit Gemini-backed routes |

- [ ] **Gemini task H1:** In `app/api/overlap/route.js`, swap the Anthropic block for the Gemini block in §2 (`maxOutputTokens: 2048`).
- [ ] **Gemini task H2:** Same swap in `app/api/grader-consistency/route.js`.
- [ ] **Gemini task H3:** Same swap in `app/api/grade/route.js`.
- [ ] **Gemini task H4:** Task 7 Step 4's curl smoke checks need `GEMINI_API_KEY` set in the deployed environment (Arko's Task 1/7) before they'll return real 200s instead of 500 "not configured" — sequence after Arko's env var change, not before.

### Cross-cutting (whoever runs final deploy — Arko owns Vercel env per his plan; TEAM_PROMPTS.md's Phase 6 is Claude Code's deploy-and-verify pass if that role is still in play)
- [ ] Update `plan.md`'s **Frozen Contract → Env vars** line: `ANTHROPIC_API_KEY` → `GEMINI_API_KEY`.
- [ ] Update `TEAM_PROMPTS.md`'s **Phase 6** security-review checklist: it currently lists `ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY` as the secrets to confirm aren't committed and are set in Vercel — change the first to `GEMINI_API_KEY`.
- [ ] Vercel: remove `ANTHROPIC_API_KEY` from the project's env vars (all environments), add `GEMINI_API_KEY` to production (and preview if used), redeploy.
- [ ] Confirm `.env.local` / `.env` are still gitignored (unchanged — no new risk here, just re-verify after editing local env files).

---

## 4. Guardrails carried over from `TEAM_PROMPTS.md`
- Behind schedule: cut priority order is unchanged (P2 features first: Grader Consistency, AI-Anchored Grading; then P1 Syllabus Overlap; never touch the P0 four). The Gemini migration itself is small and mechanical — it should not be the thing that eats schedule risk.
- If Gemini's output quality on any one route looks worse than Claude's during QA, the fix is a model-id bump to `gemini-2.5-pro` on that route only (same request/response shape, no other code change) — not a rollback to Anthropic.
- Never touch the P0 four features, never cut QA or the security pass — unchanged from `TEAM_PROMPTS.md`.
