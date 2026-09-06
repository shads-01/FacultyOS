function parseCLOs(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^(CLO\s*\d+)\s*[:\-]\s*(.+)$/i);
      return m
        ? { id: m[1].replace(/\s+/g, '').toUpperCase(), text: m[2] }
        : { id: `CLO${i + 1}`, text: line };
    });
}

function parseNumberedQuestions(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^\d+[\.\)]\s*(.+)$/);
      return { number: i + 1, text: m ? m[1] : line };
    });
}

function parsePastExams(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const years = [];
  let current = null;
  for (const line of lines) {
    if (!line) continue;
    const yearMatch = line.match(/^(\d{4})$/);
    if (yearMatch) {
      current = { year: yearMatch[1], questions: [] };
      years.push(current);
      continue;
    }
    const qMatch = line.match(/^\d+[\.\)]\s*(.+)$/);
    if (current) current.questions.push(qMatch ? qMatch[1] : line);
  }
  return years;
}

module.exports = { parseCLOs, parseNumberedQuestions, parsePastExams };
