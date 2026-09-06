const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// GEMINI_API_KEY may hold one key or several comma-separated keys, e.g.
// "AIzaSy...one,AIzaSy...two". Whitespace around each key is trimmed and
// empty entries (stray/trailing commas) are dropped.
function parseApiKeys(raw) {
  return (raw || '').split(',').map((k) => k.trim()).filter(Boolean);
}

function isRateLimited(status) {
  return status === 429;
}

// Pure-ish core: tries apiKeys starting at startIndex, moving to the next
// key only when the current one comes back rate-limited (429). Any other
// error is returned immediately rather than burning through the rest of
// the keys. fetchImpl is injectable for testing.
async function callGeminiWithRotation({ apiKeys, prompt, maxOutputTokens, startIndex = 0, fetchImpl = fetch }) {
  if (!apiKeys || apiKeys.length === 0) {
    return { ok: false, status: 500, error: 'GEMINI_API_KEY not configured', nextIndex: startIndex };
  }

  let lastErrText = '';
  for (let i = 0; i < apiKeys.length; i++) {
    const index = (startIndex + i) % apiKeys.length;
    let res;
    try {
      res = await fetchImpl(GEMINI_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKeys[index],
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens },
        }),
      });
    } catch (e) {
      return { ok: false, status: 502, error: `Gemini API request failed: ${e.message}`, nextIndex: index };
    }

    if (res.ok) {
      const data = await res.json();
      return { ok: true, data, nextIndex: index };
    }

    lastErrText = await res.text();
    if (!isRateLimited(res.status)) {
      return { ok: false, status: 502, error: `Gemini API error: ${lastErrText}`, nextIndex: index };
    }
    // rate-limited: fall through and try the next key
  }

  return {
    ok: false,
    status: 502,
    error: `Gemini API error: all configured keys are rate-limited: ${lastErrText}`,
    nextIndex: startIndex,
  };
}

// Thin stateful wrapper for route handlers: reads GEMINI_API_KEY, remembers
// which key last worked (module-scoped, best-effort across a warm serverless
// instance) so the next call starts there instead of always at key 0.
let sharedIndex = 0;

async function callGemini({ prompt, maxOutputTokens }) {
  const apiKeys = parseApiKeys(process.env.GEMINI_API_KEY);
  const result = await callGeminiWithRotation({ apiKeys, prompt, maxOutputTokens, startIndex: sharedIndex });
  sharedIndex = result.nextIndex;
  return result;
}

module.exports = { parseApiKeys, isRateLimited, callGeminiWithRotation, callGemini };
