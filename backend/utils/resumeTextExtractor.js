const fs = require("fs/promises");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const { ocrPdfToText } = require("./ocrPdf");

const MIN_AVG_CHARS_PER_PAGE = 40;

async function extractFromPdf(filePath) {
  const data = await fs.readFile(filePath);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    const text = (result.text || "").trim();
    const numPages = result.numpages || result.pages?.length || 1;
    const avgCharsPerPage = text.length / Math.max(numPages, 1);

    if (avgCharsPerPage < MIN_AVG_CHARS_PER_PAGE) {
      return ocrPdfToText(filePath);
    }
    return { text, method: "pdf-text", ocrUsed: false };
  } finally {
    await parser.destroy();
  }
}

async function extractFromDocx(filePath) {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return { text: (value || "").trim(), method: "docx-text", ocrUsed: false };
}

async function extractText(filePath, ext) {
  const normalizedExt = ext.toLowerCase().replace(/^\./, "");
  if (normalizedExt === "docx") return extractFromDocx(filePath);
  if (normalizedExt === "pdf") return extractFromPdf(filePath);
  throw new Error(`Unsupported resume file type: ${ext}`);
}

module.exports = { extractText };
