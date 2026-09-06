// Static catalog of existing courses a proposed syllabus is checked against.
// No DB — see context.md's "stateless, no table" design for this feature.
const existingCourses = [
  { course: 'Intro to Algorithms', topics: ['Big-O notation', 'Recursion', 'Sorting'] },
  { course: 'Data Structures I', topics: ['Arrays', 'Linked lists', 'Hash tables'] },
  { course: 'Advanced Algorithms', topics: ['Big-O notation', 'Dynamic programming', 'Graph traversal'] },
];

module.exports = { existingCourses };
