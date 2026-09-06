# Sample PDFs for Testing PDF Upload

This directory contains sample PDF documents specifically designed to test the **"Upload PDF"** feature across all 4 screens in **Faculty OS**.

---

## Directory Structure

```text
sample-pdfs/
├── 01-exam-quality/
│   ├── clos.pdf                     # Course Learning Outcomes (4 CLOs)
│   ├── draft-exam.pdf               # Current draft exam (3 numbered questions)
│   ├── past-exams.pdf               # Combined past exams (2024 & 2023)
│   ├── past-exams-2024.pdf          # 2024 exam (for testing multi-file upload)
│   └── past-exams-2023.pdf          # 2023 exam (for testing multi-file upload)
│
├── 02-syllabus-overlap/
│   ├── proposed-syllabus-algorithms.pdf     # Standard syllabus (Big-O, Recursion, Hash tables...)
│   ├── proposed-syllabus-heavy-overlap.pdf  # High-overlap syllabus (Algorithms, Data Structures...)
│   └── proposed-syllabus-no-overlap.pdf     # Zero-overlap syllabus (Quantum Computing topics)
│
├── 03-grader-consistency/
│   ├── rubric.pdf                   # Scoring rubric
│   ├── student-answers.pdf          # Student answers 1, 2, 3
│   ├── grader-scores.pdf            # Grader scores (Alex & Jordan)
│   └── grader-scores-three-graders.pdf # Grader scores with 3 graders (Alex, Jordan, Morgan)
│
├── 04-ai-grading/
│   ├── rubric.pdf                   # Scoring rubric
│   ├── model-answer.pdf             # Model reference answer
│   ├── student-answers.pdf          # Student answers 1, 2, 3
│   └── human-scores.pdf             # Human scores for answers 1, 2, 3
│
└── edge-cases/
    ├── corrupted-file.pdf           # Invalid PDF (tests "failed to parse PDF" error)
    └── empty-no-text.pdf            # PDF with no text (tests "no readable text found" error)
```

---

## How to Test Each Screen

### 1. Exam Quality (`/exam-quality`)
1. Navigate to `/exam-quality`.
2. On **Course Learning Outcomes**: Click **"Upload PDF"** and choose `01-exam-quality/clos.pdf`.
   - *Expected:* 4 outcomes extracted (`CLO1: Explain Big-O...`).
3. On **Draft Exam (this year)**: Click **"Upload PDF"** and choose `01-exam-quality/draft-exam.pdf`.
   - *Expected:* 3 numbered questions extracted.
4. On **Past Exams**:
   - **Single-file test:** Upload `01-exam-quality/past-exams.pdf`.
   - **Multi-file test:** Select **both** `past-exams-2024.pdf` and `past-exams-2023.pdf` in the file picker at the same time.
   - *Expected:* Both files are joined automatically with year headers `2024` and `2023`.
5. Click **"Review"** → verify parsed counts (4 CLOs, 3 draft questions) → click **"Run audit"**.

---

### 2. Syllabus Overlap (`/syllabus-overlap`)
1. Navigate to `/syllabus-overlap`.
2. On **Proposed Syllabus**: Click **"Upload PDF"**.
   - Select `02-syllabus-overlap/proposed-syllabus-algorithms.pdf`.
3. Click **"Compare syllabi"**.
   - *Expected:* Overlap analysis against existing courses in the catalog, showing shared topics and curriculum gaps.
4. You can also test `proposed-syllabus-heavy-overlap.pdf` or `proposed-syllabus-no-overlap.pdf`.

---

### 3. Grader Consistency (`/grader-consistency`)
1. Navigate to `/grader-consistency`.
2. On **Rubric**: Click **"Upload PDF"** → select `03-grader-consistency/rubric.pdf`.
3. On **Student Answers**: Click **"Upload PDF"** → select `03-grader-consistency/student-answers.pdf`.
4. On **Grader Scores**: Click **"Upload PDF"** → select `03-grader-consistency/grader-scores.pdf` (or `grader-scores-three-graders.pdf`).
5. Click **"Check consistency"**.
   - *Expected:* Consistency report highlighting grading variance and outlier scores.

---

### 4. AI-Anchored Grading (`/ai-grading`)
1. Navigate to `/ai-grading`.
2. On **Rubric**: Click **"Upload PDF"** → select `04-ai-grading/rubric.pdf`.
3. On **Model Answer**: Click **"Upload PDF"** → select `04-ai-grading/model-answer.pdf`.
4. On **Student Answers**: Click **"Upload PDF"** → select `04-ai-grading/student-answers.pdf`.
5. On **Human Scores (optional)**: Click **"Upload PDF"** → select `04-ai-grading/human-scores.pdf`.
6. Click **"Review"** → click **"Score answers"**.
   - *Expected:* Table showing AI score vs human score, computed deltas, and feedback.

---

### 5. Error & Edge Case Handling
- **Corrupted PDF:** Upload `edge-cases/corrupted-file.pdf` to any field.
  - *Expected:* Displays `{filename} — failed to parse PDF, try pasting instead`.
- **Empty / No-Text PDF:** Upload `edge-cases/empty-no-text.pdf`.
  - *Expected:* OCR fallback triggers, then displays `{filename} — no readable text found, try pasting instead`.
