const { askGroqForJson } = require("./groqClient");

function buildPrompt(rawText) {
  return `You are an expert résumé parser. Extract structured profile data from the résumé
text below. If a field is not present, use null (or an empty array for list fields) — do not
guess or invent information that isn't in the text.

Résumé text:
"""
${rawText.slice(0, 8000)}
"""

Respond ONLY with a single JSON object in this exact shape:
{
  "full_name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "headline": "string or null",
  "skills": ["string", ...],
  "experience": [{ "title": "string", "company": "string", "start": "string", "end": "string", "description": "string" }],
  "education": [{ "degree": "string", "institution": "string", "year": "string" }],
  "current_ctc": "string or null",
  "expected_ctc": "string or null",
  "notice_period": "string or null"
}`;
}

async function parseResumeProfile(rawText) {
  try {
    const parsed = await askGroqForJson(buildPrompt(rawText));
    return {
      full_name: parsed.full_name ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      location: parsed.location ?? null,
      headline: parsed.headline ?? null,
      skills_json: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience_json: Array.isArray(parsed.experience) ? parsed.experience : [],
      education_json: Array.isArray(parsed.education) ? parsed.education : [],
      current_ctc: parsed.current_ctc ?? null,
      expected_ctc: parsed.expected_ctc ?? null,
      notice_period: parsed.notice_period ?? null,
    };
  } catch (err) {
    console.error("resumeProfileParser: Groq parse failed, returning null", err.message);
    return null;
  }
}

module.exports = { parseResumeProfile };
