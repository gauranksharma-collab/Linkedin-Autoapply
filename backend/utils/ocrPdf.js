const Tesseract = require("tesseract.js");

const MAX_PAGES = 5;

async function ocrPdfToText(filePath) {
  const { pdf } = await import("pdf-to-img");
  const document = await pdf(filePath, { scale: 2 });
  const pageTexts = [];
  let pageIndex = 0;

  for await (const imageBuffer of document) {
    if (pageIndex >= MAX_PAGES) break;
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, "eng");
    pageTexts.push(text.trim());
    pageIndex += 1;
  }

  return { text: pageTexts.join("\n\n"), method: "ocr", ocrUsed: true };
}

module.exports = { ocrPdfToText };
