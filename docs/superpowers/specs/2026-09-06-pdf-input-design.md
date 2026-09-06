# PDF Input for the 4 Core Feature Pages (Spec)

**Date:** 2026-09-06 · **Status:** approved design, pre-implementation
**Supersedes:** the "file upload" line in `2026-09-06-faculty-os-v3-design.md`'s Non-goals — that cut was for the hackathon window; this spec adds it back now that all 4 features are built.

## Product truth

Every field on every one of the 4 feature pages (Exam Quality, Syllabus Overlap, Grader Consistency, AI-Anchored Grading) is currently a plain paste-only `<textarea>` — 17 fields total across the 4 pages. Faculty routinely have this material as PDFs (scanned exams, typed rubrics, syllabi), not as text they're willing to retype. This spec adds a PDF-upload alternative to every one of those 17 fields without changing anything about what the 4 API routes receive.

## Architecture — entirely client-side, zero backend change

The request payload to `/api/analyze`, `/api/overlap`, `/api/grader-consistency`, `/api/grade` stays exactly the strings it is today. A PDF is just another way to fill the same `useState` string a textarea fills now. Only frontend files change (page components) plus one new shared component and lib, plus two new npm dependencies. No route file, no Frozen Contract shape, no `middleware.js` is touched.

## New files

- **`src/lib/pdfExtract.js`** — pure browser extraction helpers, built on `pdfjs-dist` (text layer + page-to-canvas rendering) and `tesseract.js` (OCR fallback):
  - `extractTextFromPdf(file)` → one PDF's text, per the pipeline below.
  - `extractTextFromPdfs(files)` → `{ text, failed: [{name, reason}] }`; successes joined with `\n\n` in file-picker order.
- **`src/components/PdfOrPasteField.jsx`** — drop-in replacement for a raw `<textarea>`. Same `id`/`label`/`value`/`onChange`/`placeholder`/hint props. Renders a "Paste text / Upload PDF" toggle; upload mode shows a `<input type="file" accept="application/pdf" multiple>`, a per-file progress line during OCR, and a per-file error line for anything that couldn't be read. Extracted text lands in the same editable textarea either mode, so a user can hand-fix formatting after extraction (e.g. Past Exams' bare-year-line convention, which extraction cannot infer).

## Extraction pipeline (per PDF file)

1. **Text layer first:** `pdfjs-dist` `getTextContent()` across all pages, joined with `\n`. Fast, exact, no OCR involved — covers every digitally-generated PDF.
2. **OCR fallback:** if step 1 returns near-empty text (threshold: <20 non-whitespace characters), treat the file as scanned/handwritten. Render each page to an offscreen `<canvas>` via `pdfjs-dist`'s `page.render()`, then run `tesseract.js` `recognize()` (`eng`) per page image, concatenating page text with `\n`.
   - **Page cap:** OCR stops after the first 20 pages of a file (stated in the field's hint text). The text-layer path (step 1) has no cap.
   - **Known limitation, accepted:** `tesseract.js` is built for printed text; accuracy on genuine handwriting is inconsistent. This is a deliberate trade-off (client-side, no new backend dependency) over routing scans through Gemini's multimodal input, which was considered and declined because it would require sending raw file bytes to the route handlers, breaking the current string-only request contract.
3. **Still empty → report failure:** if OCR also returns near-empty text, the file is added to `failed` with a short reason ("no readable text found") and contributes nothing to the joined output. Other files in the same batch are unaffected.

## Dependencies

- **`pdfjs-dist`** — text extraction + page rendering. Worker loaded from CDN (`GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@<installed-version>/build/pdf.worker.min.mjs'`) rather than fighting Next's bundler over worker asset resolution.
- **`tesseract.js`** — OCR fallback. Fetches its worker/wasm/`eng.traineddata` from its default CDN at runtime; no asset bundling needed.

Both are genuinely new (`AGENTS.md`'s "no new dependency beyond what a plan already names" is explicitly overridden here — this is a direct, current user request, not an unrequested addition).

## UI behavior

- **Toggle, not two simultaneous controls:** each field shows either its textarea (paste mode) or the file picker + extracted-text preview (upload mode), switched by a small toggle — matches the existing `.fz-label`/`.fz-textarea` visual language, no new design system.
- **Multi-file, auto-concatenated:** selecting several PDFs in one picker action joins their extracted text in selection order. Re-opening the picker and choosing a new batch replaces the field's current extracted text — no persistent per-file remove/reorder list (kept minimal; re-select to redo).
- **Progress during OCR:** since OCR is seconds-per-page rather than instant, `tesseract.js`'s progress callback drives a line like "Reading page 2 of 4…" so a multi-page scan doesn't look frozen.
- **Wiring:** all 17 existing textareas (Exam Quality ×3, Syllabus Overlap ×4, Grader Consistency ×6, AI-Anchored Grading ×4) are swapped for `<PdfOrPasteField>` with the props they already pass today — mechanical, no state-shape change on any page.

## Files touched

New: `src/lib/pdfExtract.js`, `src/components/PdfOrPasteField.jsx`
Modified: `src/app/(app)/exam-quality/page.js`, `src/app/(app)/syllabus-overlap/page.js`, `src/app/(app)/grader-consistency/page.js`, `src/app/(app)/ai-grading/page.js`, `package.json`

## Testing & verify

`extractTextFromPdf(s)` depends on the browser File API, `<canvas>`, and pdf.js/tesseract's own worker/wasm loading — none of which run under Node's `node --test` runner without heavy DOM mocking that would test the mock, not the code. Per this repo's existing convention (`AGENTS.md`: thin glue over an external capability is `ponytail:`-flagged and manually verified, not unit-tested), this is manual-verification code:

1. `npm run build` + `npm run lint` clean.
2. On each of the 4 pages: toggle at least one field to Upload PDF, upload a real text-bearing PDF, confirm extracted text appears and the page's existing submit button (Analyze/Compare/Check/Score) still produces a report end-to-end.
3. Upload a multi-page scanned/image-only PDF to one field; confirm the OCR progress line appears, then correct (if imperfect) text lands in the field.
4. Upload a genuinely blank/corrupt PDF; confirm the per-file error shows and doesn't break the rest of the form or other files in the same batch.
5. Upload 2+ PDFs to one field in a single picker action; confirm their text is concatenated in selection order.

## Non-goals

Server-side extraction, any new API route, changes to the Frozen Contract shapes, per-file remove/reorder UI, OCR languages beyond English, OCR quality tuning/pre-processing beyond pdf.js's default page render, drag-and-drop upload (plain `<input type=file>` only), routing PDFs through Gemini's multimodal input.
