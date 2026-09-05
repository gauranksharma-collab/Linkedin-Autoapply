require("dotenv").config();
const { extractText } = require("../utils/resumeTextExtractor");
const { parseResumeProfile } = require("../utils/resumeProfileParser");

async function run(filePath, ext) {
  console.log(`\n--- ${filePath} ---`);
  const { text, method, ocrUsed } = await extractText(filePath, ext);
  console.log("method:", method, "ocrUsed:", ocrUsed, "chars:", text.length);
  console.log("preview:", text.slice(0, 200).replace(/\s+/g, " "));

  const profile = await parseResumeProfile(text);
  console.log("AI parsed:", profile ? "yes" : "no (null — Groq failed)");
  if (profile) console.log(JSON.stringify(profile, null, 2).slice(0, 800));
}

(async () => {
  await run("/Users/Gaurank/Downloads/gaurank-sharma-resume.pdf", ".pdf");
  await run("/Users/Gaurank/Downloads/Priya_Sharma_Resume.docx", ".docx");
})().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
