# Faculty OS — PRD (one page, 4.5h build)

## One-liner
Faculty paste Course Learning Outcomes + a draft exam + past exams (plus, on three extra screens, rubrics/syllabi/answers) and get back an AI report: untested outcomes, recycled questions, syllabus overlap, and grading-consistency flags. Competitor recon → [docs/competitor-recon.md](docs/competitor-recon.md).

## Auth decision (reversed 2026-09-06 — restoring real auth, overriding the anonymous-auth draft below)
**Real Supabase email+password auth**, via `@supabase/ssr` — login/signup screens, cookie-based session, `middleware.js` redirecting signed-out visitors to `/login`. This restores `Backend_Plan.md`'s original design, which is no longer superseded — see that file for the concrete implementation (SSR clients, middleware, login/signup pages, `getServerSupabase()`-based route handlers instead of bearer-token verification). Every run is saved under the signed-in faculty member's real `auth.uid()`.

~~Anonymous Supabase auth, no login/signup screens.~~ ~~`supabase.auth.signInAnonymously()` fires once on page load; every run is saved under that anonymous `auth.uid()`. A real email/password flow was speced earlier but never built and costs time we don't have in 4.5h — dropped in favor of what `TEAM_PROMPTS.md` already assumed.~~ *(superseded by the decision above — kept struck through, not deleted, so the history of the flip-flop is visible rather than silently rewritten.)*

## User Flow
0. App loads → silent `signInAnonymously()` (no visible auth UI). Faculty lands on a 4-screen nav — none is the "main" screen, each is a full feature:

| Screen | Features | Faculty pastes | Clicks | Gets back |
|---|---|---|---|---|
| Exam Quality | #1 Exam Quality Check, #5 CLO Coverage Matrix, #4 Dedup & Tagging | CLOs, draft exam, past exams | Analyze → `POST /api/analyze` (one call covers all 3) | Coverage matrix (blank row = untested CLO), recycled-question list (match % + source), Bloom-level tag chips per question. Auto-saves to History |
| Syllabus Overlap | #3 Syllabus/Curriculum Overlap | Proposed syllabus, existing course syllabi | Compare → `POST /api/overlap` | Topic-by-topic overlap % against each existing course, plus a gap list (curriculum topics the proposed syllabus never touches) |
| Grader Consistency | #2 Multi-Grader Consistency Check | Rubric, student answers, 2+ graders' own scores for the same answers | Check → `POST /api/grader-consistency` | Flagged answer pairs that are equivalent but scored differently across graders — purely comparative, no AI-asserted "correct" score |
| AI-Anchored Grading | #8 AI-Anchored Rubric Scoring | Rubric, model answer, student answers, optional one grader's scores | Score → `POST /api/grade` | Per-answer AI anchor score, delta vs the human score if given, sorted by biggest disagreement |

Exam Quality's report is the only one that persists (see Data Model) — the other three are single-shot, no save/history, by design (#3/#2/#8 don't need a re-visitable trail the way an exam draft does).

## Data Model (Supabase)
Table `analysis_runs` — the only table:
| Column | Type | Notes |
|---|---|---|
| id | uuid | pk, `default gen_random_uuid()` |
| user_id | uuid | not null, `auth.uid()` (anonymous user) |
| created_at | timestamptz | `default now()` |
| clos_text, exam_text, past_exams_text | text | raw pasted input |
| result | jsonb | `{clos, questions, analysis}` from `/api/analyze` |

RLS: `own_rows_only` — `using (auth.uid() = user_id)` for `select`/`insert`. No update/delete (immutable history). Features #3/#2/#8 are stateless — nothing to persist, no table needed.

## Frozen Contract (write this down once, everyone builds against the doc — nobody waits on anybody's commit)
**Routes:**
| Route | Auth | Request | Response |
|---|---|---|---|
| `POST /api/analyze` | Signed-in session (cookie, via `@supabase/ssr`) | `{clos, exam, pastExams}` (strings) | `{clos: CLO[], questions: Question[], analysis: QuestionAnalysis[]}`; saves the run as a side effect |
| `GET /api/runs` | Signed-in session (cookie, via `@supabase/ssr`) | — | `{runs: {id, created_at, result}[]}` |
| `POST /api/overlap` | none | `{proposedSyllabus, existingSyllabi}` | `{overlaps: OverlapItem[], gaps: string[]}` |
| `POST /api/grader-consistency` | none | `{rubric, studentAnswers, graderScores}` | `{flags: ConsistencyFlag[]}` |
| `POST /api/grade` | none | `{rubric, modelAnswer, studentAnswers, humanScores?}` | `{results: GradeResult[]}` |

**Shapes** (each workstream defines its own copy of these — see "no shared file" below):
```
CLO { id, text }
Question { number, text }
QuestionAnalysis { questionNumber, coveredCLOs: string[], topic, bloom, similarity: SimilarityMatch | null }
SimilarityMatch { year, matchedQuestion, percent, reason }
OverlapItem { topic, overlapPercent, existingCourse }
ConsistencyFlag { answerA, answerB, scoreA, scoreB, grader }
GradeResult { answer, humanScore: number | null, aiScore, delta, reason }
```
**Env vars:** `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).

## Features → Buildable Chunks (all 6 committed, equal standing — same lib/prompt/route/component shape per feature)
| # | Feature | Input → Output | Route | Component | Persists? |
|---|---|---|---|---|---|
| 1 | Exam Quality Check | CLOs + draft exam + past exams → coverage gaps, recycled/duplicate questions, Bloom-level spread | `/api/analyze` | `<CoverageMatrix/>` (shares call w/ #5, #4) | yes → History |
| 5 | CLO Coverage Matrix | Same input as #1 → matrix mapping each question to outcomes; blank row = untested CLO | `/api/analyze` | `<CoverageMatrix/>` | yes → History |
| 4 | Question Bank Dedup & Tagging | Same input as #1 → per-question similarity vs past exams (match %, source year/question, reason) + topic/Bloom tags | `/api/analyze` | `<RecycledList/>`, `<TagChips/>` | yes → History |
| 3 | Syllabus/Curriculum Overlap | Proposed syllabus + existing syllabi → overlap % per course + gap list | `/api/overlap` | `<OverlapReport/>` | no |
| 2 | Multi-Grader Consistency | Rubric + student answers + 2+ graders' scores → flagged divergent-score pairs on equivalent answers | `/api/grader-consistency` | `<GraderConsistencyTable/>` | no |
| 8 | AI-Anchored Rubric Scoring | Rubric + model answer + student answers + optional human score → AI anchor score + delta, sorted by disagreement | `/api/grade` | `<GradingTable/>` | no |

#1/#5/#4 share one LLM call because they're one user-visible flow, not because they outrank #3/#2/#8 — those three are exactly as much "the plan" as the first three, they just don't share a call since their inputs are unrelated (syllabi vs. rubrics vs. graded answers). If 4.5h gets tight, simplify prompt/edge-case handling on whichever feature is least far along — no feature is pre-designated to be cut or left half-built.

## Wow-Moment Feature Spec (one deliberately singled-out demo beat, not a ranking of the features)
This is the single screenshot moment the demo opens on — it lives on the Exam Quality screen because that's where #1/#5/#4 converge into one visual, not because the other three screens matter less. Each of #3/#2/#8 still needs to fully work and be demoed; they just don't need their own choreographed "moment" the way a blank-row-plus-badge shot does.
- Trigger: the Analyze click on the Exam Quality screen — no separate mode.
- Layout: Coverage Matrix + Recycled Questions cards both visible without scrolling at 1440×900, immediately on render.
- Content: a CLO row glowing red (**"CLO4 — never tested"**) beside a recycled-question badge (**"92% match to 2024 Q7"**), both above the fold within ~10s of one click.
- Motion: one stagger-reveal (fade + 12px rise, 0.35s power1.out, `prefers-reduced-motion`-safe) on just those two rows — spec lives in `DESIGN.md`.

## Cut List (unchanged — text-paste only, no file upload, no charting lib, no real-time/i18n/mobile, no report export)

## Workstream Split — 2 layers → 3 people, zero cross-dependency

**Two disjoint layers by file path:**
| Workstream | Files |
|---|---|
| A — Backend | `/app/api/**`, `middleware.js`, `/supabase/**`, `lib/types.ts` |
| B — Frontend | `/app/(app)/**`, `/components/**` |

**Shared-file risk, found and closed:** the only file A and B would both want to touch is a shared `lib/types.ts` (B importing A's response types). Fix: B never imports A's file — B keeps its own local copy of the same shapes from the Frozen Contract above. A few duplicated lines beat a merge conflict on a file two people edit under time pressure. With that, A and B touch zero common files and B never blocks on A's commits — B builds against mock JSON matching the Frozen Contract and swaps in the real fetch URL once A's route is live (a one-line change in B's own file).

**3-person split (A splits further since it has 4 independent routes; B stays one person):**
| Person | Slice | Files | Depends on anyone? |
|---|---|---|---|
| **Arko** | Backend core: auth, DB, the shared `/api/analyze`+`/api/runs` flow | `/app/api/analyze/**`, `/app/api/runs/**`, `middleware.js`, `/supabase/**`, `lib/types.ts` | No — builds straight from this doc |
| **Shads** | All 4 screens' UI | `/app/(app)/**`, `/components/**` | No — mocks every route's response per the Frozen Contract, swaps in real URLs at integration |
| **Hrittika** | The 3 secondary routes + fixtures + QA | `/app/api/overlap/route.js`, `/app/api/grader-consistency/route.js`, `/app/api/grade/route.js`, `/fixtures/**` | No — these 3 routes are intentionally stateless and unauthenticated, so they need none of Arko's auth/DB work to exist first |

Names are swappable; the file ownership is what matters. Only one thing crosses this split mid-build: if #3/#2/#8 ever need auth-gating added, that's Arko editing `middleware.js`'s matcher, not Hrittika touching her route files — flag it, don't silently couple the two.
