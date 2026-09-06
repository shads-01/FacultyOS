import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const samplePdfDir = path.join(rootDir, 'sample-pdfs');

/**
 * Creates a valid PDF 1.4 buffer containing pure text.
 * Each item in `lines` is rendered on its own line using PDF text operators.
 */
function createPdfBuffer(lines) {
  function escapePdf(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  // Calculate stream content
  // Start at (54, 730), leading 18
  let stream = 'BT\n/F1 11 Tf\n18 TL\n54 730 Td\n';
  let isFirst = true;

  for (const line of lines) {
    if (line === '') {
      stream += 'T*\n';
    } else {
      if (isFirst) {
        stream += '(' + escapePdf(line) + ') Tj\n';
        isFirst = false;
      } else {
        stream += '(' + escapePdf(line) + ') \'\n';
      }
    }
  }
  stream += 'ET\n';

  const streamByteLen = Buffer.byteLength(stream, 'utf8');

  let pdfContent = '%PDF-1.4\n';
  const offsets = [];

  function appendObj(content) {
    offsets.push(Buffer.byteLength(pdfContent, 'utf8'));
    pdfContent += content;
  }

  // 1: Catalog
  appendObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  // 2: Pages
  appendObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  // 3: Page
  appendObj(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  // 4: Stream
  appendObj(`4 0 obj\n<< /Length ${streamByteLen} >>\nstream\n${stream}endstream\nendobj\n`);
  // 5: Font (Standard Type1 Helvetica)
  appendObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  const startXref = Buffer.byteLength(pdfContent, 'utf8');
  pdfContent += 'xref\n0 6\n0000000000 65535 f \n';
  for (const offset of offsets) {
    pdfContent += String(offset).padStart(10, '0') + ' 00000 n \n';
  }
  pdfContent += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return Buffer.from(pdfContent, 'utf8');
}

/**
 * Creates an empty PDF (no text in stream) to test empty extraction.
 */
function createEmptyPdfBuffer() {
  let pdfContent = '%PDF-1.4\n';
  const offsets = [];

  function appendObj(content) {
    offsets.push(Buffer.byteLength(pdfContent, 'utf8'));
    pdfContent += content;
  }

  appendObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  appendObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  appendObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n');
  appendObj(`4 0 obj\n<< /Length 0 >>\nstream\nendstream\nendobj\n`);

  const startXref = Buffer.byteLength(pdfContent, 'utf8');
  pdfContent += 'xref\n0 5\n0000000000 65535 f \n';
  for (const offset of offsets) {
    pdfContent += String(offset).padStart(10, '0') + ' 00000 n \n';
  }
  pdfContent += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return Buffer.from(pdfContent, 'utf8');
}

const filesToGenerate = [
  // --- Screen 1: Exam Quality ---
  {
    folder: '01-exam-quality',
    file: 'clos.pdf',
    lines: [
      'CLO1: Explain Big-O time complexity',
      'CLO2: Implement recursive algorithms',
      'CLO3: Analyze sorting algorithm tradeoffs',
      'CLO4: Design a hash table from scratch',
    ],
  },
  {
    folder: '01-exam-quality',
    file: 'draft-exam.pdf',
    lines: [
      '1. What is the time complexity of binary search, and why?',
      '2. Write a recursive function to compute the nth Fibonacci number.',
      '3. Compare the average-case and worst-case time complexity of quicksort vs mergesort.',
    ],
  },
  {
    folder: '01-exam-quality',
    file: 'past-exams.pdf',
    lines: [
      '2024',
      '1. Write a recursive function that returns the nth Fibonacci number using memoization.',
      '2. What is the time complexity of binary search?',
      '',
      '2023',
      '1. Implement mergesort and state its worst-case time complexity.',
    ],
  },
  {
    folder: '01-exam-quality',
    file: 'past-exams-2024.pdf',
    lines: [
      '2024',
      '1. Write a recursive function that returns the nth Fibonacci number using memoization.',
      '2. What is the time complexity of binary search?',
    ],
  },
  {
    folder: '01-exam-quality',
    file: 'past-exams-2023.pdf',
    lines: [
      '2023',
      '1. Implement mergesort and state its worst-case time complexity.',
    ],
  },

  // --- Screen 2: Syllabus Overlap ---
  {
    folder: '02-syllabus-overlap',
    file: 'proposed-syllabus-algorithms.pdf',
    lines: [
      'Big-O notation',
      'Recursion',
      'Hash tables',
      'Dynamic programming',
    ],
  },
  {
    folder: '02-syllabus-overlap',
    file: 'proposed-syllabus-heavy-overlap.pdf',
    lines: [
      'Data Structures',
      'Algorithms',
      'Sorting',
      'Binary Search Trees',
      'Graph Algorithms',
      'Dynamic Programming',
    ],
  },
  {
    folder: '02-syllabus-overlap',
    file: 'proposed-syllabus-no-overlap.pdf',
    lines: [
      'Quantum Computing',
      'Qubits',
      'Superposition',
      'Quantum Entanglement',
      'Shor\'s Algorithm',
    ],
  },

  // --- Screen 3: Grader Consistency ---
  {
    folder: '03-grader-consistency',
    file: 'rubric.pdf',
    lines: [
      'Award full credit for a correct time complexity with justification; half credit for a correct answer with no justification.',
    ],
  },
  {
    folder: '03-grader-consistency',
    file: 'student-answers.pdf',
    lines: [
      '1. O(log n), because binary search halves the remaining input each step.',
      '2. O(n), scans every element once.',
      '3. Logarithmic time, since the search space is cut in half repeatedly.',
    ],
  },
  {
    folder: '03-grader-consistency',
    file: 'grader-scores.pdf',
    lines: [
      'Alex,1,10',
      'Alex,2,5',
      'Alex,3,6',
      'Jordan,1,10',
      'Jordan,2,5',
      'Jordan,3,9',
    ],
  },
  {
    folder: '03-grader-consistency',
    file: 'grader-scores-three-graders.pdf',
    lines: [
      'Alex,1,10',
      'Alex,2,5',
      'Alex,3,6',
      'Jordan,1,10',
      'Jordan,2,5',
      'Jordan,3,9',
      'Morgan,1,9',
      'Morgan,2,5',
      'Morgan,3,7',
    ],
  },

  // --- Screen 4: AI-Anchored Grading ---
  {
    folder: '04-ai-grading',
    file: 'rubric.pdf',
    lines: [
      'Full credit for a correct time complexity with justification; half credit for a correct answer with no justification.',
    ],
  },
  {
    folder: '04-ai-grading',
    file: 'model-answer.pdf',
    lines: [
      'O(log n), because binary search halves the remaining search space on each comparison.',
    ],
  },
  {
    folder: '04-ai-grading',
    file: 'student-answers.pdf',
    lines: [
      '1. O(log n), because it halves the search space each step.',
      '2. O(n), since it checks every element.',
      '3. Logarithmic.',
    ],
  },
  {
    folder: '04-ai-grading',
    file: 'human-scores.pdf',
    lines: [
      '1,9',
      '2,5',
      '3,10',
    ],
  },
];

// Generate files
for (const item of filesToGenerate) {
  const dir = path.join(samplePdfDir, item.folder);
  fs.mkdirSync(dir, { recursive: true });
  const buf = createPdfBuffer(item.lines);
  const outPath = path.join(dir, item.file);
  fs.writeFileSync(outPath, buf);
  console.log(`Generated: ${path.relative(rootDir, outPath)} (${buf.length} bytes)`);
}

// Generate edge cases
const edgeDir = path.join(samplePdfDir, 'edge-cases');
fs.mkdirSync(edgeDir, { recursive: true });

// 1. Corrupt PDF
const corruptPath = path.join(edgeDir, 'corrupted-file.pdf');
fs.writeFileSync(corruptPath, Buffer.from('NOT A VALID PDF FILE HEADER OR CONTENT'));
console.log(`Generated: ${path.relative(rootDir, corruptPath)}`);

// 2. Empty text PDF
const emptyPath = path.join(edgeDir, 'empty-no-text.pdf');
fs.writeFileSync(emptyPath, createEmptyPdfBuffer());
console.log(`Generated: ${path.relative(rootDir, emptyPath)}`);

console.log('\nAll sample PDFs generated successfully!');
