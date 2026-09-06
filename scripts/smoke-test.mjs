import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in environment.');
  process.exit(1);
}

async function getAuthToken(overrideToken) {
  if (overrideToken) return overrideToken;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`signInAnonymously failed: ${error.message}`);
  return data.session.access_token;
}

async function main() {
  console.log(`\n🚀 Running End-to-End Smoke Test against: ${BASE_URL}\n`);

  console.log('1. Authenticating Session A (Anonymous)...');
  const tokenA = await getAuthToken(process.env.TEST_TOKEN);
  console.log('   ✓ Session A authenticated');

  console.log('2. Sending POST /api/analyze request...');
  const analyzePayload = {
    clos: 'CLO1: Explain Big-O time complexity\nCLO2: Implement recursive algorithms\nCLO3: Analyze sorting algorithm tradeoffs\nCLO4: Design a hash table from scratch',
    exam: '1. What is the time complexity of binary search, and why?\n2. Write a recursive function to compute the nth Fibonacci number.\n3. Compare the average-case and worst-case time complexity of quicksort vs mergesort.',
    pastExams: '2024\n1. Write a recursive function that returns the nth Fibonacci number using memoization.',
  };

  const analyzeRes = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify(analyzePayload),
  });

  const analyzeData = await analyzeRes.json();
  if (!analyzeRes.ok) {
    throw new Error(`POST /api/analyze failed (${analyzeRes.status}): ${JSON.stringify(analyzeData)}`);
  }

  if (!Array.isArray(analyzeData.clos) || !Array.isArray(analyzeData.questions) || !Array.isArray(analyzeData.analysis)) {
    throw new Error(`POST /api/analyze returned invalid shape: ${JSON.stringify(analyzeData)}`);
  }
  console.log(`   ✓ POST /api/analyze OK — ${analyzeData.analysis.length} questions analyzed, ${analyzeData.clos.length} CLOs mapped`);

  console.log('3. Fetching GET /api/runs for Session A...');
  const runsResA = await fetch(`${BASE_URL}/api/runs`, {
    headers: { authorization: `Bearer ${tokenA}` },
  });
  const runsDataA = await runsResA.json();
  if (!runsResA.ok) {
    throw new Error(`GET /api/runs failed (${runsResA.status}): ${JSON.stringify(runsDataA)}`);
  }
  if (!Array.isArray(runsDataA.runs) || runsDataA.runs.length < 1) {
    throw new Error(`Expected at least 1 run for Session A, got: ${JSON.stringify(runsDataA)}`);
  }
  console.log(`   ✓ GET /api/runs OK — ${runsDataA.runs.length} run(s) found for Session A`);

  console.log('4. Verifying Row-Level Security (RLS) isolation with Session B...');
  const tokenB = await getAuthToken();
  const runsResB = await fetch(`${BASE_URL}/api/runs`, {
    headers: { authorization: `Bearer ${tokenB}` },
  });
  const runsDataB = await runsResB.json();
  if (!runsResB.ok) {
    throw new Error(`GET /api/runs failed for Session B (${runsResB.status}): ${JSON.stringify(runsDataB)}`);
  }
  if (!Array.isArray(runsDataB.runs) || runsDataB.runs.length !== 0) {
    throw new Error(`RLS isolation violation: Session B should see 0 runs, but saw ${runsDataB.runs.length}`);
  }
  console.log('   ✓ RLS isolation OK — Session B sees 0 runs (pure tenant separation verified)');

  console.log('\n========================================');
  console.log('🎉 ALL END-TO-END SMOKE TESTS PASSED!');
  console.log('========================================\n');
}

main().catch((e) => {
  console.error('\n❌ Smoke test failed:', e);
  process.exit(1);
});
