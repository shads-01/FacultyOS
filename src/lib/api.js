/**
 * Frontend API client — calls the real backend routes.
 * Each feature page already calls runFeature(screen, payload);
 * this file is the only thing that needed to change.
 */

export async function runFeature(screen, payload) {
  const res = await fetch(`/api/${screen}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

if (typeof module !== 'undefined') {
  module.exports = { runFeature };
}

