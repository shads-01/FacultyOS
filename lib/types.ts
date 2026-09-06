export type CLO = { id: string; text: string };
export type Question = { number: number; text: string };
export type PastExamYear = { year: string; questions: string[] };
export type SimilarityMatch = { year: string; matchedQuestion: string; percent: number; reason: string };
export type QuestionAnalysis = {
  questionNumber: number;
  coveredCLOs: string[];
  topic: string;
  bloom: string;
  similarity: SimilarityMatch | null;
};
export type AnalysisResult = { clos: CLO[]; questions: Question[]; analysis: QuestionAnalysis[] };
