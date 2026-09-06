function parseTopics(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
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

module.exports = { parseTopics, buildOverlapPrompt, parseOverlapJSON };
