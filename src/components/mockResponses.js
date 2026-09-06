export const analyzeResponse = {
  clos: [
    { id: 'CLO1', text: 'Explain Big-O time complexity' },
    { id: 'CLO2', text: 'Implement recursive algorithms' },
    { id: 'CLO3', text: 'Analyze sorting algorithm tradeoffs' },
    { id: 'CLO4', text: 'Design a hash table from scratch' },
  ],
  questions: [
    { number: 1, text: 'What is the time complexity of binary search, and why?' },
    { number: 2, text: 'Write a recursive function to compute the nth Fibonacci number.' },
    { number: 3, text: 'Compare the average-case and worst-case time complexity of quicksort vs mergesort.' },
  ],
  analysis: [
    { questionNumber: 1, coveredCLOs: ['CLO1'], bloom: 'Understand', topic: 'Binary search', similarity: { year: '2023', matchedQuestion: 'Q4', percent: 67, reason: 'Same complexity-analysis task, reworded.' } },
    {
      questionNumber: 2,
      coveredCLOs: ['CLO2'],
      bloom: 'Apply',
      topic: 'Recursion',
      similarity: { year: '2024', matchedQuestion: 'Q1', percent: 92, reason: 'Same Fibonacci-by-recursion task, reworded.' },
    },
    { questionNumber: 3, coveredCLOs: ['CLO3'], bloom: 'Analyze', topic: 'Sorting tradeoffs', similarity: null },
  ],
};

export const runsResponse = {
  runs: [
    { id: 'mock-run-1', created_at: new Date().toISOString(), result: analyzeResponse },
  ],
};

export const overlapResponse = {
  overlaps: [
    { topic: 'Recursion', overlapPercent: 90, existingCourse: 'Intro to Algorithms' },
    { topic: 'Big-O notation', overlapPercent: 75, existingCourse: 'Intro to Algorithms' },
  ],
  gaps: ['Hash tables', 'Dynamic programming'],
};

export const consistencyResponse = {
  flags: [
    { answerA: 'A1', answerB: 'A3', scoreA: 10, scoreB: 6, grader: 'Alex' },
    { answerA: 'A2', answerB: 'A4', scoreA: 8, scoreB: 5, grader: 'Jordan' },
  ],
};

export const gradeResponse = {
  results: [
    { answer: 'A3: Logarithmic.', humanScore: 10, aiScore: 6, delta: -4, reason: 'Correct but unjustified per rubric.' },
    { answer: 'A1: O(log n), because it halves the search space.', humanScore: 9, aiScore: 9, delta: 0, reason: 'Correct and justified.' },
    { answer: 'A2: It is fast.', humanScore: null, aiScore: 4, delta: null, reason: 'No justification; rubric requires reasoning.' },
  ],
};
