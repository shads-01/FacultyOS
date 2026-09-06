'use client';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;

const MIN_TEXT_LENGTH = 20;
const OCR_PAGE_CAP = 20;

function isEmptyExtraction(text) {
  return text.trim().length < MIN_TEXT_LENGTH;
}

async function extractTextLayer(pdf) {
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text;
}

async function extractViaOcr(pdf, onProgress) {
  const { default: Tesseract } = await import('tesseract.js');
  const pageCount = Math.min(pdf.numPages, OCR_PAGE_CAP);
  let text = '';
  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(`Reading page ${i} of ${pageCount}…`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const { data } = await Tesseract.recognize(canvas, 'eng');
    text += data.text + '\n';
  }
  return text;
}

export async function extractTextFromPdf(file, { onProgress } = {}) {
  let pdf;
  try {
    const buffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch {
    return { text: '', ok: false, reason: 'failed to parse PDF' };
  }

  const textLayerResult = await extractTextLayer(pdf);
  if (!isEmptyExtraction(textLayerResult)) {
    return { text: textLayerResult.trim(), ok: true, reason: null };
  }

  const ocrResult = await extractViaOcr(pdf, onProgress);
  if (!isEmptyExtraction(ocrResult)) {
    return { text: ocrResult.trim(), ok: true, reason: null };
  }

  return { text: '', ok: false, reason: 'no readable text found' };
}

export async function extractTextFromPdfs(files, { onProgress } = {}) {
  const successes = [];
  const failed = [];
  for (const file of Array.from(files)) {
    const result = await extractTextFromPdf(file, {
      onProgress: (status) => onProgress?.(file.name, status),
    });
    if (result.ok) {
      successes.push(result.text);
    } else {
      failed.push({ name: file.name, reason: result.reason });
    }
  }
  return { text: successes.join('\n\n'), failed };
}
