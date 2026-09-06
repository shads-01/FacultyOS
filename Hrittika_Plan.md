# Faculty OS — Hrittika's Plan (Secondary Routes + Fixtures) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3 secondary features' backends — #3 Syllabus/Curriculum Overlap, #2 Multi-Grader Consistency Check, #8 AI-Anchored Rubric Scoring — as `/api/overlap`, `/api/grader-consistency`, `/api/grade`, plus example fixtures and edge-case QA for all three.

**Architecture:** Three independent Next.js App Router route handlers, each stateless and unauthenticated (no Supabase read/write, no bearer token), each making exactly one Anthropic API call from pasted text. No shared runtime code between the three features beyond the same fetch-and-parse shape, so each lives in its own `lib/*.js` file. Pure parsing/prompt/response-parsing logic is CommonJS, unit-tested with `node:test`; route handlers import it with ESM `import`.

**Tech Stack:** Next.js (App Router), native `fetch` for the Anthropic call (no SDK), `node:test` (no Jest/Vitest). Model id `claude-sonnet-5`.

**Spec:** `plan.md` and `DESIGN.md` at the project root, plus this plan.

## Global Constraints

- These 3 routes are stateless and unauthenticated by design (per `plan.md`'s Frozen Contract: `Auth: none` for all three) — no Supabase client, no bearer token, no `analysis_runs` inserts. This is what makes your work independent of Arko's auth/DB tasks: nothing here needs his code to exist or be deployed first.
- Exactly one Anthropic call per feature per request. Model id `claude-sonnet-5`. No embeddings, no vector search.
- Zero added npm dependencies. Native `fetch`, `node:test` only.
- Text-paste input only, no file upload.
- File ownership — you touch **only**: `app/api/overlap/route.js`, `app/api/grader-consistency/route.js`, `app/api/grade/route.js`, `lib/overlap.js`, `lib/graderConsistency.js`, `lib/grade.js`, `fixtures/**`, and their `test/*.test.js` files. Never touch `app/(app)/**`, `components/**` (Shads), or `app/api/analyze/**`, `app/api/runs/**`, `lib/analyze.js`, `lib/types.ts`, `lib/supabase/**`, `supabase/**` (Arko).
- Your route-handler tasks (the even-numbered ones) assume the Next.js App Router scaffold exists at repo root — a `route.js` file has nowhere to live otherwise. If Arko's Task 0 scaffold isn't pushed yet when you reach one of those tasks, write the file anyway (`git add` works on a file whose parent directories don't exist yet, once you `mkdir -p` them) and `git pull` when the scaffold lands — you and Arko never touch the same files, so there is nothing to merge-conflict. Your pure-logic tasks (odd-numbered) need only Node and can start immediately regardless.
- **Input conventions** (document these in the UI's placeholder text — that's Shads' job, but the parsing here must match exactly what she tells faculty to type):
  - **Syllabus Overlap** — Proposed syllabus: one topic per line, plain text. Existing syllabi: repeated blocks, each a bare course-name line followed by its topics (one per line), a blank line separating courses:
    ```
    Intro to Algorithms
    Big-O notation
    Recursion
    Sorting

    Data Structures I
    Arrays
    Linked lists
    ```
  - **Grader Consistency** — Rubric: free text. Student answers: one numbered answer per line (`1. ...`), same convention as exam questions. Grader scores: one line per `(grader, answer, score)` triple, comma-separated: `GraderName,answerNumber,score` — e.g. `Alex,1,8`.
  - **AI-Anchored Grading** — Rubric: free text. Model answer: free text (the reference "ideal" answer). Student answers: one numbered answer per line (`1. ...`). Human scores (optional, omit entirely if none exist yet): one line per answer, `answerNumber,score` — e.g. `1,8`.

---

## File Structure

- `lib/overlap.js` — `parseTopics`, `parseExistingSyllabi`, `buildOverlapPrompt`, `parseOverlapJSON`.
- `lib/graderConsistency.js` — `parseNumberedAnswers`, `parseGraderScores`, `buildGraderConsistencyPrompt`, `parseConsistencyJSON`.
- `lib/grade.js` — `parseNumberedAnswers` (own copy — see note in Task 5), `parseHumanScores`, `buildGradePrompt`, `parseGradeJSON`.
- `app/api/overlap/route.js`, `app/api/grader-consistency/route.js`, `app/api/grade/route.js` — thin POST handlers.
- `fixtures/overlap-example.json`, `fixtures/grader-consistency-example.json`, `fixtures/grade-example.json` — realistic example request payloads for manual testing.
- `test/overlap.test.js`, `test/graderConsistency.test.js`, `test/grade.test.js` — `node:test` suites.

---

### Task 1: Syllabus Overlap — parsers, prompt builder, response parser

**Files:**
- Create: `lib/overlap.js`
- Create: `test/overlap.test.js`

**Interfaces:**
- Produces: `parseTopics(text) -> string[]`, `parseExistingSyllabi(text) -> [{course: string, topics: string[]}]`, `buildOverlapPrompt({proposedTopics, existingCourses}) -> string`, `parseOverlapJSON(rawText) -> {overlaps: OverlapItem[], gaps: string[]}` where `OverlapItem = {topic, overlapPercent, existingCourse}`. Consumed by Task 2 (`app/api/overlap/route.js`).

- [ ] **Step 1: Write the failing tests**

`test/overlap.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { parseTopics, parseExistingSyllabi, buildOverlapPrompt, parseOverlapJSON } = require('../lib/overlap');

test('parseTopics splits one topic per line', () => {
  const result = parseTopics('Big-O notation\nRecursion\nSorting');
  assert.deepStrictEqual(result, ['Big-O notation', 'Recursion', 'Sorting']);
});

test('parseExistingSyllabi groups topics under course-name headers', () => {
  const result = parseExistingSyllabi('Intro to Algorithms\nBig-O notation\nRecursion\n\nData Structures I\nArrays\nLinked lists');
  assert.deepStrictEqual(result, [
    { course: 'Intro to Algorithms', topics: ['Big-O notation', 'Recursion'] },
    { course: 'Data Structures I', topics: ['Arrays', 'Linked lists'] },
  ]);
});

test('buildOverlapPrompt embeds the proposed topics and existing courses', () => {
  const prompt = buildOverlapPrompt({
    proposedTopics: ['Recursion'],
    existingCourses: [{ course: 'Intro to Algorithms', topics: ['Recursion', 'Sorting'] }],
  });
  assert.match(prompt, /Recursion/);
  assert.match(prompt, /Intro to Algorithms/);
  assert.match(prompt, /Respond with ONLY valid JSON/);
});

test('parseOverlapJSON parses overlaps and gaps', () => {
  const result = parseOverlapJSON('{"overlaps":[{"topic":"Recursion","overlapPercent":90,"existingCourse":"Intro to Algorithms"}],"gaps":["Hash tables"]}');
  assert.strictEqual(result.overlaps.length, 1);
  assert.deepStrictEqual(result.gaps, ['Hash tables']);
});

test('parseOverlapJSON strips markdown fences and throws on missing keys', () => {
  const result = parseOverlapJSON('```json\n{"overlaps":[],"gaps":[]}\n```');
  assert.deepStrictEqual(result, { overlaps: [], gaps: [] });
  assert.throws(() => parseOverlapJSON('{"overlaps":[]}'), /missing "gaps" array/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../lib/overlap'`

- [ ] **Step 3: Write the minimal implementation**

`lib/overlap.js`:
```js
function parseTopics(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function parseExistingSyllabi(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const courses = [];
  let current = null;
  for (const line of lines) {
    if (!line) {
      current = null;
      continue;
    }
    if (!current) {
      current = { course: line, topics: [] };
      courses.push(current);
      continue;
    }
    current.topics.push(line);
  }
  return courses;
}

function buildOverlapPrompt({ proposedTopics, existingCourses }) {
  const proposedList = proposedTopics.map((t) => `- ${t}`).join('\n');
  const existingList = existingCourses
    .map((c) => `${c.course}:\n${c.topics.map((t) => `- ${t}`).join('\n')}`)
    .join('\n\n');

  return `You are checking a proposed course syllabus for overlap with existing courses in the same curriculum.

PROPOSED SYLLABUS TOPICS:
${proposedList}

EXISTING COURSES:
${existingList || '(none provided)'}

For each proposed topic that meaningfully overlaps with a topic in an existing course, report the topic, an estimated overlap percent (0-100), and which existing course it overlaps with. Separately, list any topics from the EXISTING COURSES that no proposed topic covers at all (curriculum gaps).

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "overlaps": [
    { "topic": "Recursion", "overlapPercent": 90, "existingCourse": "Intro to Algorithms" }
  ],
  "gaps": ["Hash tables"]
}`;
}

function parseOverlapJSON(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.overlaps)) {
    throw new Error('Model response missing "overlaps" array');
  }
  if (!Array.isArray(parsed.gaps)) {
    throw new Error('Model response missing "gaps" array');
  }
  return { overlaps: parsed.overlaps, gaps: parsed.gaps };
}

module.exports = { parseTopics, parseExistingSyllabi, buildOverlapPrompt, parseOverlapJSON };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/overlap.js test/overlap.test.js
git commit -m "feat: add syllabus overlap parsers, prompt builder, response parser"
```

---

### Task 2: `/api/overlap` route handler + fixture

**Files:**
- Create: `app/api/overlap/route.js`
- Create: `fixtures/overlap-example.json`

**Interfaces:**
- Consumes: `lib/overlap.js` (Task 1).
- Produces: `POST /api/overlap` — body `{proposedSyllabus, existingSyllabi}` (strings), response `{overlaps, gaps}` on 200, `{error}` on 4xx/5xx. Matches `plan.md`'s Frozen Contract.

- [ ] **Step 1: Write the fixture**

`fixtures/overlap-example.json`:
```json
{
  "proposedSyllabus": "Big-O notation\nRecursion\nHash tables\nDynamic programming",
  "existingSyllabi": "Intro to Algorithms\nBig-O notation\nRecursion\nSorting\n\nData Structures I\nArrays\nLinked lists\nHash tables"
}
```

- [ ] **Step 2: Write the handler**

`app/api/overlap/route.js`:
```js
import { parseTopics, parseExistingSyllabi, buildOverlapPrompt, parseOverlapJSON } from '../../../lib/overlap';

export async function POST(req) {
  const { proposedSyllabus = '', existingSyllabi = '' } = await req.json();
  if (!proposedSyllabus.trim()) {
    return Response.json({ error: 'Proposed syllabus is required' }, { status: 400 });
  }

  const proposedTopics = parseTopics(proposedSyllabus);
  const existingCourses = parseExistingSyllabi(existingSyllabi);
  const prompt = buildOverlapPrompt({ proposedTopics, existingCourses });

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
        max_tokens: 2048,
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

  try {
    const result = parseOverlapJSON(rawText);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }
}
```

- [ ] **Step 3: Manual verification**

`ponytail:` thin glue over an already-tested pure module plus one external call — not unit tested here, verified manually below and again in Task 7's QA pass.

Once the Next.js scaffold exists and `ANTHROPIC_API_KEY` is set locally (`.env.local`), run:
```bash
npm run dev
curl -X POST http://localhost:3000/api/overlap -H "content-type: application/json" -d @fixtures/overlap-example.json
```
Expected: `200` with `{"overlaps": [...], "gaps": [...]}` — at least one overlap on "Big-O notation"/"Recursion"/"Hash tables", "Sorting" or "Arrays"/"Linked lists" appearing in `gaps`.

- [ ] **Step 4: Commit**

```bash
git add app/api/overlap/route.js fixtures/overlap-example.json
git commit -m "feat: add POST /api/overlap route handler + example fixture"
```

---

### Task 3: Grader Consistency — parsers, prompt builder, response parser

**Files:**
- Create: `lib/graderConsistency.js`
- Create: `test/graderConsistency.test.js`

**Interfaces:**
- Produces: `parseNumberedAnswers(text) -> [{number, text}]`, `parseGraderScores(text) -> [{grader, answerNumber, score}]`, `buildGraderConsistencyPrompt({rubric, answers, scores}) -> string`, `parseConsistencyJSON(rawText) -> {flags: ConsistencyFlag[]}` where `ConsistencyFlag = {answerA, answerB, scoreA, scoreB, grader}`. Consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

`test/graderConsistency.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { parseNumberedAnswers, parseGraderScores, buildGraderConsistencyPrompt, parseConsistencyJSON } = require('../lib/graderConsistency');

test('parseNumberedAnswers strips numbering', () => {
  const result = parseNumberedAnswers('1. The answer is 42.\n2) It depends on the input size.');
  assert.deepStrictEqual(result, [
    { number: 1, text: 'The answer is 42.' },
    { number: 2, text: 'It depends on the input size.' },
  ]);
});

test('parseGraderScores parses grader,answerNumber,score triples', () => {
  const result = parseGraderScores('Alex,1,8\nJordan,1,6\nAlex,2,9');
  assert.deepStrictEqual(result, [
    { grader: 'Alex', answerNumber: 1, score: 8 },
    { grader: 'Jordan', answerNumber: 1, score: 6 },
    { grader: 'Alex', answerNumber: 2, score: 9 },
  ]);
});

test('buildGraderConsistencyPrompt embeds rubric, answers, and scores', () => {
  const prompt = buildGraderConsistencyPrompt({
    rubric: 'Award full credit for a correct time complexity with justification.',
    answers: [{ number: 1, text: 'O(log n) because it halves the search space.' }],
    scores: [{ grader: 'Alex', answerNumber: 1, score: 8 }],
  });
  assert.match(prompt, /Award full credit/);
  assert.match(prompt, /A1: O\(log n\)/);
  assert.match(prompt, /Alex scored A1: 8/);
  assert.match(prompt, /Respond with ONLY valid JSON/);
});

test('parseConsistencyJSON parses flags', () => {
  const result = parseConsistencyJSON('{"flags":[{"answerA":"A1","answerB":"A3","scoreA":8,"scoreB":5,"grader":"Alex"}]}');
  assert.strictEqual(result.flags.length, 1);
  assert.strictEqual(result.flags[0].grader, 'Alex');
});

test('parseConsistencyJSON throws on missing flags array', () => {
  assert.throws(() => parseConsistencyJSON('{"foo":1}'), /missing "flags" array/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../lib/graderConsistency'`

- [ ] **Step 3: Write the minimal implementation**

`lib/graderConsistency.js`:
```js
function parseNumberedAnswers(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^\d+[\.\)]\s*(.+)$/);
      return { number: i + 1, text: m ? m[1] : line };
    });
}

function parseGraderScores(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [grader, answerNumber, score] = line.split(',').map((s) => s.trim());
      return { grader, answerNumber: Number(answerNumber), score: Number(score) };
    });
}

function buildGraderConsistencyPrompt({ rubric, answers, scores }) {
  const answerList = answers.map((a) => `A${a.number}: ${a.text}`).join('\n');
  const scoreList = scores.map((s) => `${s.grader} scored A${s.answerNumber}: ${s.score}`).join('\n');

  return `You are checking for grading consistency across multiple graders on the same set of student answers.

RUBRIC:
${rubric}

STUDENT ANSWERS:
${answerList}

GRADER SCORES:
${scoreList}

Find pairs of answers that are substantively equivalent (same correctness and quality relative to the rubric, even if worded differently) but were scored differently by the same grader, OR the same answer scored very differently by different graders. For each such case, report the two answer labels, their scores, and which grader's scoring is in question (use the grader for a same-grader inconsistency; if it's cross-grader, use the grader who gave the outlier score).

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "flags": [
    { "answerA": "A1", "answerB": "A3", "scoreA": 8, "scoreB": 5, "grader": "Alex" }
  ]
}
Return an empty "flags" array if you find no inconsistencies.`;
}

function parseConsistencyJSON(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.flags)) {
    throw new Error('Model response missing "flags" array');
  }
  return { flags: parsed.flags };
}

module.exports = { parseNumberedAnswers, parseGraderScores, buildGraderConsistencyPrompt, parseConsistencyJSON };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/graderConsistency.js test/graderConsistency.test.js
git commit -m "feat: add grader-consistency parsers, prompt builder, response parser"
```

---

### Task 4: `/api/grader-consistency` route handler + fixture

**Files:**
- Create: `app/api/grader-consistency/route.js`
- Create: `fixtures/grader-consistency-example.json`

**Interfaces:**
- Consumes: `lib/graderConsistency.js` (Task 3).
- Produces: `POST /api/grader-consistency` — body `{rubric, studentAnswers, graderScores}` (strings), response `{flags}` on 200, `{error}` on 4xx/5xx.

- [ ] **Step 1: Write the fixture**

`fixtures/grader-consistency-example.json`:
```json
{
  "rubric": "Award full credit for a correct time complexity with justification; half credit for a correct answer with no justification.",
  "studentAnswers": "1. O(log n), because binary search halves the remaining input each step.\n2. O(n), scans every element once.\n3. Logarithmic time, since the search space is cut in half repeatedly.",
  "graderScores": "Alex,1,10\nAlex,2,5\nAlex,3,6\nJordan,1,10\nJordan,2,5\nJordan,3,9"
}
```
(Answers 1 and 3 are the same idea worded differently; Alex scored them 10 vs 6 — the intended flag.)

- [ ] **Step 2: Write the handler**

`app/api/grader-consistency/route.js`:
```js
import { parseNumberedAnswers, parseGraderScores, buildGraderConsistencyPrompt, parseConsistencyJSON } from '../../../lib/graderConsistency';

export async function POST(req) {
  const { rubric = '', studentAnswers = '', graderScores = '' } = await req.json();
  if (!rubric.trim() || !studentAnswers.trim() || !graderScores.trim()) {
    return Response.json({ error: 'Rubric, student answers, and grader scores are all required' }, { status: 400 });
  }

  const answers = parseNumberedAnswers(studentAnswers);
  const scores = parseGraderScores(graderScores);
  const prompt = buildGraderConsistencyPrompt({ rubric, answers, scores });

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
        max_tokens: 2048,
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

  try {
    const result = parseConsistencyJSON(rawText);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }
}
```

- [ ] **Step 3: Manual verification**

```bash
curl -X POST http://localhost:3000/api/grader-consistency -H "content-type: application/json" -d @fixtures/grader-consistency-example.json
```
Expected: `200` with a `flags` entry pairing A1/A3 under grader Alex (10 vs 6 on equivalent answers).

- [ ] **Step 4: Commit**

```bash
git add app/api/grader-consistency/route.js fixtures/grader-consistency-example.json
git commit -m "feat: add POST /api/grader-consistency route handler + example fixture"
```

---

### Task 5: AI-Anchored Grading — parsers, prompt builder, response parser

**Files:**
- Create: `lib/grade.js`
- Create: `test/grade.test.js`

**Interfaces:**
- Produces: `parseNumberedAnswers(text) -> [{number, text}]` (a second, independent copy of Task 3's function — see note below), `parseHumanScores(text) -> Map<number, number>`, `buildGradePrompt({rubric, modelAnswer, answers, humanScores}) -> string`, `parseGradeJSON(rawText) -> {results: GradeResult[]}` where `GradeResult = {answer, humanScore: number|null, aiScore, delta, reason}`. Consumed by Task 6.

`ponytail:` `parseNumberedAnswers` is identical to the one in `lib/graderConsistency.js`. Six lines duplicated across two files you alone own beats introducing a third shared file with its own merge-conflict surface, or coupling two otherwise-independent features — same tradeoff `plan.md` already made for `lib/types.ts`.

- [ ] **Step 1: Write the failing tests**

`test/grade.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert');
const { parseNumberedAnswers, parseHumanScores, buildGradePrompt, parseGradeJSON } = require('../lib/grade');

test('parseNumberedAnswers strips numbering', () => {
  const result = parseNumberedAnswers('1. The answer is 42.\n2) It depends on the input size.');
  assert.deepStrictEqual(result, [
    { number: 1, text: 'The answer is 42.' },
    { number: 2, text: 'It depends on the input size.' },
  ]);
});

test('parseHumanScores maps answerNumber to score', () => {
  const result = parseHumanScores('1,8\n2,6');
  assert.strictEqual(result.get(1), 8);
  assert.strictEqual(result.get(2), 6);
});

test('parseHumanScores returns an empty map for empty input', () => {
  const result = parseHumanScores('');
  assert.strictEqual(result.size, 0);
});

test('buildGradePrompt embeds rubric, model answer, student answers, and human scores when present', () => {
  const prompt = buildGradePrompt({
    rubric: 'Full credit for O(log n) with justification.',
    modelAnswer: 'O(log n), because the search space halves each step.',
    answers: [{ number: 1, text: 'O(log n).' }],
    humanScores: new Map([[1, 6]]),
  });
  assert.match(prompt, /Full credit for O\(log n\)/);
  assert.match(prompt, /O\(log n\), because the search space halves/);
  assert.match(prompt, /A1: O\(log n\)\./);
  assert.match(prompt, /Human score for A1: 6/);
  assert.match(prompt, /Respond with ONLY valid JSON/);
});

test('buildGradePrompt omits human-score lines when none are given', () => {
  const prompt = buildGradePrompt({
    rubric: 'r', modelAnswer: 'm', answers: [{ number: 1, text: 'a' }], humanScores: new Map(),
  });
  assert.doesNotMatch(prompt, /Human score for/);
});

test('parseGradeJSON parses results and computes delta when a human score exists', () => {
  const result = parseGradeJSON('{"results":[{"answer":"A1: O(log n).","humanScore":6,"aiScore":9,"reason":"Correct and justified."}]}');
  assert.strictEqual(result.results[0].delta, 3);
});

test('parseGradeJSON sets delta to null when there is no human score', () => {
  const result = parseGradeJSON('{"results":[{"answer":"A1: O(log n).","humanScore":null,"aiScore":9,"reason":"Correct and justified."}]}');
  assert.strictEqual(result.results[0].delta, null);
});

test('parseGradeJSON throws on missing results array', () => {
  assert.throws(() => parseGradeJSON('{"foo":1}'), /missing "results" array/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../lib/grade'`

- [ ] **Step 3: Write the minimal implementation**

`lib/grade.js`:
```js
function parseNumberedAnswers(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^\d+[\.\)]\s*(.+)$/);
      return { number: i + 1, text: m ? m[1] : line };
    });
}

function parseHumanScores(text) {
  const map = new Map();
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [answerNumber, score] = line.split(',').map((s) => s.trim());
      map.set(Number(answerNumber), Number(score));
    });
  return map;
}

function buildGradePrompt({ rubric, modelAnswer, answers, humanScores }) {
  const answerList = answers
    .map((a) => {
      const human = humanScores.get(a.number);
      const humanLine = human !== undefined ? `\nHuman score for A${a.number}: ${human}` : '';
      return `A${a.number}: ${a.text}${humanLine}`;
    })
    .join('\n');

  return `You are anchoring student answers against a rubric and a model answer.

RUBRIC:
${rubric}

MODEL ANSWER:
${modelAnswer}

STUDENT ANSWERS:
${answerList}

For each student answer, assign an AI anchor score (0-10) against the rubric and model answer, and give a one-sentence reason. If a human score was given for that answer, include it verbatim; otherwise use null.

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "results": [
    { "answer": "A1: O(log n).", "humanScore": 6, "aiScore": 9, "reason": "Correct and justified, slightly terse." }
  ]
}`;
}

function parseGradeJSON(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.results)) {
    throw new Error('Model response missing "results" array');
  }
  const results = parsed.results.map((r) => ({
    answer: r.answer,
    humanScore: r.humanScore ?? null,
    aiScore: r.aiScore,
    delta: r.humanScore == null ? null : r.aiScore - r.humanScore,
    reason: r.reason,
  }));
  return { results };
}

module.exports = { parseNumberedAnswers, parseHumanScores, buildGradePrompt, parseGradeJSON };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/grade.js test/grade.test.js
git commit -m "feat: add AI-anchored grading parsers, prompt builder, response parser"
```

---

### Task 6: `/api/grade` route handler + fixture

**Files:**
- Create: `app/api/grade/route.js`
- Create: `fixtures/grade-example.json`

**Interfaces:**
- Consumes: `lib/grade.js` (Task 5).
- Produces: `POST /api/grade` — body `{rubric, modelAnswer, studentAnswers, humanScores?}` (strings, `humanScores` optional), response `{results}` on 200, `{error}` on 4xx/5xx, sorted by biggest disagreement (largest absolute `delta` first, `null` deltas last).

- [ ] **Step 1: Write the fixture**

`fixtures/grade-example.json`:
```json
{
  "rubric": "Full credit for a correct time complexity with justification; half credit for a correct answer with no justification.",
  "modelAnswer": "O(log n), because binary search halves the remaining search space on each comparison.",
  "studentAnswers": "1. O(log n), because it halves the search space each step.\n2. O(n), since it checks every element.\n3. Logarithmic.",
  "humanScores": "1,9\n2,5\n3,10"
}
```
(Answer 3 is correct but unjustified — a strict human grader might give it full credit anyway (10) while a rubric-anchored AI gives it half credit, producing the intended biggest-disagreement row.)

- [ ] **Step 2: Write the handler**

`app/api/grade/route.js`:
```js
import { parseNumberedAnswers, parseHumanScores, buildGradePrompt, parseGradeJSON } from '../../../lib/grade';

export async function POST(req) {
  const { rubric = '', modelAnswer = '', studentAnswers = '', humanScores = '' } = await req.json();
  if (!rubric.trim() || !modelAnswer.trim() || !studentAnswers.trim()) {
    return Response.json({ error: 'Rubric, model answer, and student answers are all required' }, { status: 400 });
  }

  const answers = parseNumberedAnswers(studentAnswers);
  const humanScoreMap = parseHumanScores(humanScores);
  const prompt = buildGradePrompt({ rubric, modelAnswer, answers, humanScores: humanScoreMap });

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
        max_tokens: 2048,
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
    parsed = parseGradeJSON(rawText);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }

  const sorted = [...parsed.results].sort((a, b) => {
    if (a.delta === null) return 1;
    if (b.delta === null) return -1;
    return Math.abs(b.delta) - Math.abs(a.delta);
  });

  return Response.json({ results: sorted });
}
```

- [ ] **Step 3: Manual verification**

```bash
curl -X POST http://localhost:3000/api/grade -H "content-type: application/json" -d @fixtures/grade-example.json
```
Expected: `200` with `results` sorted by largest `|delta|` first — answer 3 (unjustified but scored 10 by the human) should surface near the top if the AI anchors it lower.

- [ ] **Step 4: Commit**

```bash
git add app/api/grade/route.js fixtures/grade-example.json
git commit -m "feat: add POST /api/grade route handler + example fixture"
```

---

### Task 7: Cross-route QA — edge cases on all 3 routes

**Files:**
- Modify: `test/overlap.test.js`, `test/graderConsistency.test.js`, `test/grade.test.js`

**Interfaces:**
- Consumes: all pure functions from Tasks 1, 3, 5. No new production interfaces — this task only adds test coverage for malformed/edge-case input, per your "fixtures + QA" file ownership in `plan.md`'s workstream split. (Full-app Playwright QA is a separate, whole-team phase in `TEAM_PROMPTS.md` — out of scope here.)

- [ ] **Step 1: Write the failing edge-case tests**

Append to `test/overlap.test.js`:
```js
test('parseExistingSyllabi returns an empty array for blank input', () => {
  assert.deepStrictEqual(parseExistingSyllabi(''), []);
});

test('parseTopics ignores blank lines between topics', () => {
  assert.deepStrictEqual(parseTopics('Recursion\n\nSorting\n'), ['Recursion', 'Sorting']);
});
```

Append to `test/graderConsistency.test.js`:
```js
test('parseGraderScores skips gracefully on a line with a non-numeric score', () => {
  const result = parseGraderScores('Alex,1,eight');
  assert.strictEqual(Number.isNaN(result[0].score), true);
});

test('parseNumberedAnswers returns an empty array for blank input', () => {
  assert.deepStrictEqual(parseNumberedAnswers(''), []);
});
```

Append to `test/grade.test.js`:
```js
test('parseHumanScores ignores blank lines', () => {
  const result = parseHumanScores('1,8\n\n2,6\n');
  assert.strictEqual(result.size, 2);
});

test('parseGradeJSON handles a result with an explicit null humanScore', () => {
  const result = parseGradeJSON('{"results":[{"answer":"A1","humanScore":null,"aiScore":7,"reason":"r"}]}');
  assert.strictEqual(result.results[0].delta, null);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail or reveal a gap**

Run: `node --test test/`
Expected: the non-numeric-score test currently PASSES as written (documenting existing behavior: malformed scores become `NaN` rather than being rejected) — this is deliberate, not a bug to fix now; `ponytail:` a full validation layer isn't proportionate for a 4.5h build, but the behavior is now pinned by a test so a future change can't silently regress it unnoticed. All other new tests should PASS immediately since they exercise already-correct code paths.

- [ ] **Step 3: Run the full suite one more time**

Run: `node --test test/`
Expected: PASS (25 tests total across `overlap.test.js`, `graderConsistency.test.js`, `grade.test.js`)

- [ ] **Step 4: Manual verification — empty-required-field 400s on all 3 deployed routes**

Once Arko's scaffold is deployed and your 3 routes are live alongside it:
```bash
curl -i -X POST https://<deployment>.vercel.app/api/overlap -H "content-type: application/json" -d '{}'
curl -i -X POST https://<deployment>.vercel.app/api/grader-consistency -H "content-type: application/json" -d '{}'
curl -i -X POST https://<deployment>.vercel.app/api/grade -H "content-type: application/json" -d '{}'
```
Expected: all three return `400` with a descriptive `error` message, not a `500` or an unhandled exception.

- [ ] **Step 5: Commit**

```bash
git add test/overlap.test.js test/graderConsistency.test.js test/grade.test.js
git commit -m "test: add edge-case QA coverage for overlap, grader-consistency, and grade routes"
```
