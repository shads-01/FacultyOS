/**
 * Demo input data — used by the "Load example" buttons on each feature page
 * to pre-fill textareas. These are input convenience data, NOT fake API responses.
 */
export const demoInputs = {
  examQuality: {
    clos: 'CLO1: Explain Big-O time complexity\nCLO2: Implement recursive algorithms\nCLO3: Analyze sorting algorithm tradeoffs\nCLO4: Design a hash table from scratch',
    exam: '1. What is the time complexity of binary search, and why?\n2. Write a recursive function to compute the nth Fibonacci number.\n3. Compare the average-case and worst-case time complexity of quicksort vs mergesort.',
    pastExams: '2024\n1. Write a recursive function that returns the nth Fibonacci number using memoization.\n\n2023\n1. Derive the time complexity of binary search and justify your answer.',
  },
  overlap: {
    proposedSyllabus: 'Big-O notation\nRecursion\nSorting\nHash tables',
    existingSyllabi: 'Intro to Algorithms\nBig-O notation\nRecursion\nSorting\n\nData Structures I\nArrays\nLinked lists',
  },
  consistency: {
    rubric: 'Award full credit for a correct answer with clear justification. Deduct 2 points for a missing justification. Award 0 for incorrect reasoning, even with a correct final value.',
    studentAnswers: '1. O(log n), because binary search halves the search space each step.\n2. Fibonacci recursion without memoization, correctly implemented.\n3. Logarithmic.\n4. Recursive Fibonacci with a tracing table of calls.',
    graderScores: 'Alex,1,10\nAlex,3,6\nJordan,1,10\nJordan,3,9',
  },
  grade: {
    rubric: 'Full credit requires: correct complexity class, a justification referencing the algorithm mechanism, and no unsupported claims. Partial credit (max 60%) for correct answer without justification.',
    modelAnswer: 'Binary search runs in O(log n) because each comparison halves the remaining search space, so after k steps at most n/2^k elements remain.',
    studentAnswers: '1. O(log n), because binary search halves the search space each step.\n2. It is logarithmic.\n3. O(n) because it scans the list once.',
    humanScores: '1,9\n2,8',
  },
};
