# The 5.5-Hour Hackathon Playbook — Team of 3
**Claude Code (×1 teammate) + Antigravity (×2 teammates) | Build → Test → Deploy | No presentation**

Merged from both research passes. Tonight's prep is unclocked — the 5.5h clock starts at kickoff.

---

## TONIGHT (unclocked prep — this is where hackathons are actually won)

**1. Fix firecrawl now, not at the hackathon:** get a free API key at firecrawl.dev (1000 free credits) — your IP is currently flagged on the keyless tier and you don't want to discover that at hour 3.

**2. Install skills** (works for both Claude Code and Antigravity via `npx skills add <owner/repo>`):

| Skill | Repo | Used for |
|---|---|---|
| frontend-design | anthropics/skills | Base design-slop guardrails |
| vercel-react-best-practices, web-design-guidelines | vercel-labs/agent-skills | Next.js/Vercel-correct patterns |
| supabase, supabase-postgres-best-practices | supabase/agent-skills | DB schema + auth done right the first time |
| webapp-testing | anthropics/skills | Headless Playwright sweep in QA phase |
| tdd, to-prd, diagnose | mattpocock/skills | Fast spec-writing, test discipline, debugging |
| emil-design-eng | emilkowalski/skills | Micro-interaction / motion polish |

Plus what you already have: **superpowers, ui-ux-pro-max, impeccable, ponytail** + MCPs **context7, design-inspiration, firecrawl**.

Don't install anything beyond this list — skill bloat degrades agent focus and slows down skill-selection at runtime.

**3. Lock the stack:** Next.js + Vercel + Supabase. All free, all under your own accounts = real ownership regardless of who/what wrote the code.

**4. Scaffold + deploy hello-world tonight**, repo on your own GitHub. A proven deploy pipeline before the clock starts kills the #1 hackathon failure mode (broken deploy at hour 5:25).

**Tonight's prompt (whoever's on Claude Code runs this):**
```
Scaffold a new Next.js (App Router) + Tailwind + shadcn/ui project.
Connect it to Supabase (empty schema for now) and deploy it to Vercel
under my account. I want a live URL with a "Hello World" page working
end to end before I close my laptop tonight. Push to a new repo on my
GitHub. Confirm the live URL back to me and tell me exactly which env
vars are set in Vercel vs which I need to add manually.
```

---

## The 5.5-hour timeline

| Time | Phase | Length |
|---|---|---|
| 0:00–0:15 | Ideate + scope lock | 15 min |
| 0:15–0:40 | Spec + design system | 25 min |
| 0:40–2:40 | Core build (parallel) | 2h |
| 2:40–4:00 | Wow feature + real data | 1h20 |
| 4:00–4:40 | QA (P0 fixes only) | 40 min |
| 4:40–5:30 | Deploy, verify, own | 50 min |

Deploy checkpoint: **first real deploy at 2:40**, not at 5:30. Re-deploy at every milestone after that.

---

## Phase-by-phase prompts

### Phase 1 — Ideate + scope lock (0:00–0:15)
One person drives this (whoever's fastest typer), everyone else watches/talks out loud — don't fork agents yet, there's nothing to divide.

**Prompt (Claude Code):**
```
/superpowers:brainstorm

We have 5.5 hours total to build, test, and deploy a hackathon project —
no presentation, the live app has to speak for itself. Help me lock:
1. One sentence: what it does and for whom
2. Exactly 3 core features — no more
3. One explicit "wow moment" — the single interaction a judge would screenshot
4. An explicit cut list of things we are NOT building (settings, admin panel,
   full OAuth, etc.)

Before finalizing, use firecrawl to search "similar apps to <my rough idea>"
and give me a 5-bullet competitor recon so we don't build the obvious version
everyone else in the room is building.
```

Apply `ponytail` scope-guard rules the entire day from here — if a feature isn't on the 3-feature list, it doesn't get built, full stop.

---

### Phase 2 — Spec + design system (0:15–0:40)
Still one driver; this output gets shared with the whole team before anyone forks off.

**Prompt (Claude Code):**
```
/to-prd

Turn our locked idea into a fast, lightweight PRD: user flow, data model,
the 3 core features broken into buildable chunks, and the wow-moment
feature specced separately. Keep it to one page — we have 5.5 hours,
not 5.5 days.

Then run /superpowers:writing-plans against this PRD and split it into
two independent workstreams that touch DISJOINT files/routes:
(A) backend: API routes, DB schema, auth
(B) frontend: pages, components, styling
Flag anywhere these two would need to touch the same file, and suggest
how to avoid that.
```

**Prompt (design-inspiration MCP + ui-ux-pro-max, run on whichever agent has these):**
```
Use design-inspiration's get_design_brief and generate_design_tokens for
a product that is "<one-line product description + vibe, e.g. fintech
dashboard, minimal, trustworthy>". Then run ui-ux-pro-max's
--design-system --persist search against the same description and merge
both outputs into a single DESIGN.md at the project root: colors,
typography, spacing scale, and 3 named UI reference styles to imitate.
Every teammate's agent should read this file before writing any UI code.
```

---

### Phase 3 — Core build, parallel (0:40–2:40)
This is where the team forks. See **team division options** below before starting — pick one, then give each teammate their own prompt.

**Backend prompt (Claude Code teammate):**
```
Following plan.md and DESIGN.md, build the backend for workstream (A):
API routes, Supabase schema + RLS policies, auth. Use the supabase and
supabase-postgres-best-practices skills for schema/auth correctness.
Use context7 for docs on any library before writing integration code —
don't guess at API syntax. Apply tdd for anything with real logic
(validation, calculations, state transitions) — write the test first.
Apply ponytail rules throughout: minimum code that works, no
unrequested abstractions. Deploy to Vercel at the 2-hour mark
regardless of completeness — I want a live URL even if features are
partial. Only touch files under /app/api, /lib, /supabase — do not
touch anything under /app/(marketing) or /components/ui, that's the
frontend workstream.
```

**Frontend prompt (Antigravity teammate — screens/components):**
```
Following plan.md and DESIGN.md, build the frontend for workstream (B):
pages and components for our 3 core features. Use vercel-react-best-
practices and web-design-guidelines skills. Use context7 for any
library docs. Apply ponytail rules: no premature abstraction, no state
library we don't need. Only touch files under /app/(app), /components —
do not touch /app/api, /lib, /supabase, that's the backend workstream.
Deploy is on the backend teammate's Vercel project; push commits
regularly so their redeploys pick up your changes.
```

**Second Antigravity teammate** — see division options below (either mirrors frontend on a second feature slice, or starts early on wow-feature/data prep so phase 4 isn't a cold start).

---

### Phase 4 — Wow feature + real data (2:40–4:00)
This is the stand-out block. Two moves: real seed data (not lorem ipsum), and motion polish on the hero flow only.

**Real-data prompt (whoever isn't mid-feature — ideally the teammate freed up from phase 3):**
```
Use firecrawl to scrape/search real content relevant to "<your product's
domain>" and transform it into seed data matching our Supabase schema.
I want the app to open with real, populated content — not lorem ipsum,
not 3 fake rows. Write a seed script that inserts this into Supabase and
run it against our dev + prod databases.
```

**Wow-feature/polish prompt:**
```
Build the wow-moment feature we specced in the PRD. Use design-
inspiration's get_animation_library for a stagger-reveal or counter-
roll-up pattern that fits our DESIGN.md, and emil-design-eng for the
actual micro-interaction implementation (easing, timing, spring
physics — not CSS defaults). Apply impeccable's polish pass, but ONLY
on the hero section and this core flow — do not spend time polishing
secondary screens, we don't have time.
```

Redeploy at the end of this phase.

---

### Phase 5 — QA, P0 fixes only (4:00–4:40)
Whole team back together, one shared list.

**Prompt (Claude Code):**
```
Run webapp-testing for a full headless Playwright sweep of every core
user flow, including empty inputs, slow network simulation, and
no-data states. Run /superpowers:verification-before-completion against
each of our 3 core features + the wow feature — actually walk through
them end to end, don't just claim they work. For anything broken, use
/superpowers:systematic-debugging to root-cause it, not patch symptoms.

Rule: it works > it's perfect. Only fix crashes and broken flows.
Explicitly ignore and log (don't fix) any purely cosmetic issues —
list them at the end so we know what we knowingly shipped with.
```

---

### Phase 6 — Deploy, verify, own (4:40–5:30)
**Prompt (Claude Code):**
```
Run /security-review against the full diff before final deploy — check
specifically for committed secrets/API keys and confirm .env is in
.gitignore. Then do the final deploy to Vercel under my account. After
it's live:
1. Open the URL fresh in an incognito window and confirm signup/core
   flow works with zero reliance on my local session
2. Confirm zero console errors on the deployed URL
3. Confirm real seed data renders, not placeholder content
4. List every env var currently set in Vercel and flag any that look
   missing based on our .env.example
Give me the final live URL and a one-line confirmation each of the 4
checks passed.
```

Open the URL on a phone too — judges do.

---

## Team division: options for a 3-person team (1 Claude Code, 2 Antigravity)

Pick one before Phase 3 starts. None of these are "correct" — pick based on your team's actual strengths.

### Option A — By layer
- **Claude Code:** backend, API, DB schema, auth, deploy ops (owns the Vercel/Supabase project throughout)
- **Antigravity #1:** frontend UI/components for the 3 core features
- **Antigravity #2:** real-data pipeline (firecrawl) early, then wow-feature/motion polish, then joins QA

*Best if:* your Claude Code person is strongest at backend logic and you want one clear owner of the deploy pipeline the whole day.

### Option B — By vertical feature slice
- **Claude Code:** owns Feature 1 end-to-end (frontend + backend)
- **Antigravity #1:** owns Feature 2 end-to-end
- **Antigravity #2:** owns the wow-feature + real data end-to-end

*Best if:* your 3 core features are naturally independent (different routes/pages) — minimizes merge conflicts since each person's files barely overlap, and each person can demo/verify their own slice without waiting on anyone else.

### Option C — Pipeline / stage ownership
- **Claude Code:** infra + deploy pipeline + backend, active all day as the integration point
- **Antigravity #1:** builds core features against the plan
- **Antigravity #2:** owns design system + polish + QA continuously (not just at the end) — reviewing/fixing as features land rather than in one batch at hour 4

*Best if:* your features are interdependent and can't be cleanly split into slices — this trades parallelism for a tighter, more continuously-integrated build.

### Option D — Antigravity multi-agent leverage
- **Claude Code:** backend/auth, the one place you want tight single-threaded control
- **Antigravity #1:** runs 2 parallel agents in Manager view (e.g. one on components, one on tests-as-you-go)
- **Antigravity #2:** runs 2 parallel agents in Manager view (e.g. one on the wow feature, one on real-data/seeding)

*Best if:* your two Antigravity teammates are comfortable supervising multiple agents at once and want to squeeze more raw parallelism out of the 2-hour build block — higher throughput, but needs someone watching for agents stepping on each other's files.

**Whichever you pick:** the golden rule from Phase 3 stands — no two agents (human-driven or otherwise) touch the same files at the same time. Assign file/route ownership explicitly in the kickoff prompt, not implicitly.

---

## Why this wins
- **Live URL from hour 2:40**, not hour 5:30 — most teams deploy last-minute and something breaks. Yours has been live and iterating for hours.
- **Real data** (firecrawl-seeded) — instant credibility gap versus every team shipping lorem ipsum.
- **Motion polish on exactly one flow** — the differentiator between two working apps in a judge's 3-minute look, without wasting time polishing screens nobody will linger on.
- **Ownership** — repo on your GitHub, deploy on your Vercel/Supabase, the app is yours regardless of which agent wrote which line.

## Guardrails
- **Behind schedule at 3:40:** cut a feature, never cut QA or the security pass.
- **An agent rabbit-holes:** invoke ponytail explicitly — "apply ponytail rules, what's the minimum here."
- **Deploy breaks near the end:** roll back to the last known-good Vercel deployment (one click) instead of live-debugging in the final 15 minutes.
- **Skip:** Lark skills, Azure skills, hyperframes, or anything not in this doc — noise for this context.
