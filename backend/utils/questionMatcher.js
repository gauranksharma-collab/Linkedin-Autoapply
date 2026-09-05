const natural = require("natural");
const QuestionBankEntry = require("../models/QuestionBankEntry");

const JACCARD_THRESHOLD = 0.5;
const CHAR_THRESHOLD = 0.92;
const BOILERPLATE = /\b(please|kindly)\s+(enter|provide|specify|select)\b/g;
const STOPWORDS = new Set([
  "what", "is", "your", "you", "do", "does", "did", "have", "has", "the", "a", "an",
  "in", "of", "for", "to", "are", "this", "that", "i", "my", "and", "or", "on",
  "please", "enter", "provide", "specify", "select", "kindly", "would", "like",
  "can", "will", "how", "many",
]);

function normalize(question) {
  return question
    .toLowerCase()
    .replace(BOILERPLATE, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordsOf(normalized) {
  return normalized.split(" ").filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function jaccard(wordsA, wordsB) {
  const a = new Set(wordsA);
  const b = new Set(wordsB);
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection += 1;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function typeMatches(bankType, requestedType) {
  if (!bankType || !requestedType) return true;
  return bankType === requestedType;
}

// Easy Apply frequently asks the same boilerplate question once per skill
// mentioned in a listing ("years of experience with Python?", "...with
// Django?", "...with AWS?"). Those share almost every word except the skill
// name, which is exactly the part that makes the answer different — plain
// keyword overlap alone would wrongly treat them as the same question. When
// both sides end in "with/in/using/for <thing>", the trailing thing must
// match too, regardless of how similar the rest of the sentence scores.
// Scoped to experience/proficiency-style phrasing specifically — "with/in/for"
// are common English prepositions that show up in plenty of unrelated
// questions too (e.g. "Current CTC (in INR)"), so the skill-suffix check only
// engages when the sentence is actually about experience in the first place.
const EXPERIENCE_CONTEXT_PATTERN = /\b(experience|proficient|proficiency|skilled|rate|rating|years?)\b/;
const SKILL_SUFFIX_PATTERN = /\b(?:with|in|using|for)\s+([a-z0-9][\w-]*(?:\s+[a-z0-9][\w-]*){0,2})$/;

function extractSkillToken(normalized) {
  if (!EXPERIENCE_CONTEXT_PATTERN.test(normalized)) return null;
  const match = normalized.match(SKILL_SUFFIX_PATTERN);
  return match ? match[1] : null;
}

async function findAnswer(userId, questionOriginal, inputType) {
  const normalized = normalize(questionOriginal);
  if (!normalized) return { answer: null, matchedEntry: null, matchType: "none" };

  const exact = await QuestionBankEntry.findOne({ userId, question_normalized: normalized });
  if (exact && typeMatches(exact.input_type, inputType)) {
    return { answer: exact.answer, matchedEntry: exact, matchType: "exact", score: 1 };
  }

  const incomingKeywords = keywordsOf(normalized);
  const incomingSkill = extractSkillToken(normalized);
  const candidates = await QuestionBankEntry.find({ userId });
  let best = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const candidateSkill = extractSkillToken(candidate.question_normalized);
    if ((incomingSkill || candidateSkill) && incomingSkill !== candidateSkill) continue;

    const jaccardScore = jaccard(incomingKeywords, keywordsOf(candidate.question_normalized));
    const charScore = natural.JaroWinklerDistance(normalized, candidate.question_normalized, {});
    const isCandidateMatch = jaccardScore >= JACCARD_THRESHOLD || charScore >= CHAR_THRESHOLD;
    if (!isCandidateMatch) continue;

    const score = Math.max(jaccardScore, charScore);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best && typeMatches(best.input_type, inputType)) {
    return { answer: best.answer, matchedEntry: best, matchType: "fuzzy", score: bestScore };
  }

  return { answer: null, matchedEntry: null, matchType: "none" };
}

async function saveAnswer(userId, questionOriginal, answer, inputType) {
  const normalized = normalize(questionOriginal);
  return QuestionBankEntry.findOneAndUpdate(
    { userId, question_normalized: normalized },
    {
      $set: { question_original: questionOriginal, answer, input_type: inputType },
      $inc: { times_used: 1 },
    },
    { upsert: true, new: true }
  );
}

module.exports = { normalize, findAnswer, saveAnswer, JACCARD_THRESHOLD, CHAR_THRESHOLD };
