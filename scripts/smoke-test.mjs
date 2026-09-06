import { createClient } from '@supabase/supabase-js';
import { createChunks } from '@supabase/ssr/dist/module/utils/chunker.js';
import { stringToBase64URL } from '@supabase/ssr/dist/module/utils/base64url.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.',
  );
  process.exit(1);
}

const DEMO_CLOS = `CLO1: Explain Big-O time complexity
CLO2: Implement recursive algorithms
CLO3: Analyze sorting algorithm tradeoffs
CLO4: Design a hash table from scratch`;

const DEMO_EXAM = `1. What is the time complexity of binary search, and why?
2. Write a recursive function to compute the nth Fibonacci number.
3. Compare the average-case and worst-case time complexity of quicksort vs mergesort.`;

const DEMO_PAST = `2024
1. Write a recursive function that returns the nth Fibonacci number using memoization.`;

function cookieHeaderFromSession(session) {
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const key = `sb-${projectRef}-auth-token`;
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  return createChunks(key, encoded)
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
}

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function adminClient() {
  if (!SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createFacultySession(label) {
  const email = `arko-smoke-${label}-${Date.now()}@test.edu`;
  const password = 'hackathon-demo-1';
  const admin = adminClient();

  if (admin) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`${label} admin createUser failed: ${error.message}`);
    const { data: signedIn, error: signInError } = await anonClient().auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw new Error(`${label} signIn failed: ${signInError.message}`);
    return { email, userId: data.user.id, session: signedIn.session, adminUserId: data.user.id };
  }

  const { data, error } = await anonClient().auth.signUp({ email, password });
  if (error) throw new Error(`${label} signUp failed: ${error.message}`);
  if (!data.session) {
    throw new Error(
      `${label} signUp returned no session — turn off Confirm email in Supabase Auth, or set SUPABASE_SERVICE_ROLE_KEY for the smoke test only.`,
    );
  }
  return { email, userId: data.user.id, session: data.session, adminUserId: null };
}

async function authedFetch(path, session, init = {}) {
  const headers = {
    ...(init.headers || {}),
    cookie: cookieHeaderFromSession(session),
  };
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

async function cleanupUser(userId) {
  const admin = adminClient();
  if (!admin || !userId) return;
  await admin.auth.admin.deleteUser(userId);
}

async function main() {
  console.log(`\nRunning cookie-session smoke test against: ${BASE_URL}\n`);

  let facultyA;
  let facultyB;
  try {
    console.log('1. Creating faculty A (email+password)...');
    facultyA = await createFacultySession('a');
    console.log('   OK');

    console.log('2. Unauthenticated POST /api/analyze must 401...');
    const unauthAnalyze = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clos: DEMO_CLOS, exam: DEMO_EXAM, pastExams: DEMO_PAST }),
    });
    const unauthAnalyzeBody = await unauthAnalyze.json();
    if (unauthAnalyze.status !== 401 || unauthAnalyzeBody.error !== 'Not signed in') {
      throw new Error(`expected 401 Not signed in, got ${unauthAnalyze.status} ${JSON.stringify(unauthAnalyzeBody)}`);
    }
    console.log('   OK');

    console.log('3. Missing-input POST /api/analyze must 400...');
    const badAnalyze = await authedFetch('/api/analyze', facultyA.session, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clos: '', exam: '' }),
    });
    const badAnalyzeBody = await badAnalyze.json();
    if (badAnalyze.status !== 400 || !badAnalyzeBody.error) {
      throw new Error(`expected 400, got ${badAnalyze.status} ${JSON.stringify(badAnalyzeBody)}`);
    }
    console.log('   OK');

    console.log('4. Authenticated POST /api/analyze...');
    const analyzeRes = await authedFetch('/api/analyze', facultyA.session, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clos: DEMO_CLOS, exam: DEMO_EXAM, pastExams: DEMO_PAST }),
    });
    const analyzeData = await analyzeRes.json();
    if (!analyzeRes.ok) {
      throw new Error(`POST /api/analyze failed (${analyzeRes.status}): ${JSON.stringify(analyzeData)}`);
    }
    if (
      !Array.isArray(analyzeData.clos) ||
      !Array.isArray(analyzeData.questions) ||
      !Array.isArray(analyzeData.analysis)
    ) {
      throw new Error(`invalid analyze shape: ${JSON.stringify(analyzeData)}`);
    }
    const cloIds = analyzeData.analysis.flatMap((q) => q.coveredCLOs || []);
    const clo4Untested = !cloIds.includes('CLO4');
    const q2 = analyzeData.analysis.find((q) => q.questionNumber === 2);
    const recycled =
      q2?.similarity && Number(q2.similarity.percent) >= 80 && String(q2.similarity.year).includes('2024');
    console.log(
      `   OK — ${analyzeData.analysis.length} questions, CLO4 untested=${clo4Untested}, Q2>=80% 2024 match=${Boolean(recycled)}`,
    );
    if (!clo4Untested) {
      console.warn('   warn: model did not leave CLO4 untested (non-deterministic)');
    }
    if (!recycled) {
      console.warn('   warn: model did not flag Q2 as a >=80% 2024 match (non-deterministic)');
    }

    console.log('5. GET /api/runs for faculty A...');
    const runsARes = await authedFetch('/api/runs', facultyA.session);
    const runsA = await runsARes.json();
    if (!runsARes.ok) throw new Error(`GET /api/runs A failed (${runsARes.status}): ${JSON.stringify(runsA)}`);
    if (!Array.isArray(runsA.runs) || runsA.runs.length < 1) {
      throw new Error(`expected >=1 run for A, got ${JSON.stringify(runsA)}`);
    }
    console.log(`   OK — ${runsA.runs.length} run(s)`);

    console.log('6. Creating faculty B and checking RLS isolation...');
    facultyB = await createFacultySession('b');
    const runsBRes = await authedFetch('/api/runs', facultyB.session);
    const runsB = await runsBRes.json();
    if (!runsBRes.ok) throw new Error(`GET /api/runs B failed (${runsBRes.status}): ${JSON.stringify(runsB)}`);
    if (!Array.isArray(runsB.runs) || runsB.runs.length !== 0) {
      throw new Error(`RLS isolation failed: B saw ${runsB.runs?.length} runs`);
    }
    console.log('   OK — faculty B sees 0 runs');

    console.log('\n========================================');
    console.log('ALL COOKIE-SESSION SMOKE CHECKS PASSED');
    console.log('========================================\n');
  } finally {
    await cleanupUser(facultyA?.adminUserId);
    await cleanupUser(facultyB?.adminUserId);
  }
}

main().catch((e) => {
  console.error('\nSmoke test failed:', e.message || e);
  process.exit(1);
});
