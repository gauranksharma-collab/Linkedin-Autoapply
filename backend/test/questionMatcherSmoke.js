require("dotenv").config();
const mongoose = require("mongoose");
const { findAnswer, saveAnswer, normalize } = require("../utils/questionMatcher");
const QuestionBankEntry = require("../models/QuestionBankEntry");

const userId = new mongoose.Types.ObjectId().toString();

const CASES = [
  // [questionText, inputType, expectAnswer]
  ["What is your current CTC?", "text", "12 LPA"],
  ["Current CTC (in INR)", "text", "12 LPA"],
  ["current ctc?", "text", "12 LPA"],
  ["Please enter your current CTC", "text", "12 LPA"],
  ["What is your expected CTC?", "text", "16 LPA"],
  ["Expected CTC", "text", "16 LPA"],
  ["Notice period", "text", "30 days"],
  ["What is your notice period?", "text", "30 days"],
  ["How many years of experience do you have?", "text", "5"],
  ["Years of experience", "text", "5"],
  ["Completely unrelated brand new question nobody has seen", "text", null],
  // adversarial: shares the word "ctc" with both bank entries but must not match either
  ["Are you open to relocation for this ctc range?", "text", null],
  // regression: skill-specific experience questions must never share an answer
  ["How many years of experience do you have with Django?", "text", null],
  ["Years of experience with Python?", "text", "3"],
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  await saveAnswer(userId, "What is your current CTC?", "12 LPA", "text");
  await saveAnswer(userId, "What is your expected CTC?", "16 LPA", "text");
  await saveAnswer(userId, "Notice period", "30 days", "text");
  await saveAnswer(userId, "Years of experience", "5", "text");
  await saveAnswer(userId, "Years of experience with Python", "3", "text");

  // Type-mismatch case: same normalized question text, but bank has it as "text"
  // and a hypothetical select-typed question comes in — must NOT reuse the answer.
  await saveAnswer(userId, "Work authorization", "Yes, authorized", "radio");

  let pass = 0;
  let fail = 0;

  for (const [question, inputType, expected] of CASES) {
    const { answer, matchType, score } = await findAnswer(userId, question, inputType);
    const ok = answer === expected;
    console.log(
      `${ok ? "PASS" : "FAIL"} "${question}" -> ${JSON.stringify(answer)} (expected ${JSON.stringify(
        expected
      )}, matchType=${matchType}${score ? `, score=${score.toFixed(3)}` : ""})`
    );
    ok ? pass++ : fail++;
  }

  // Type-mismatch check: same question text, different input_type -> must reject
  const mismatch = await findAnswer(userId, "Work authorization", "select");
  const mismatchOk = mismatch.answer === null;
  console.log(
    `${mismatchOk ? "PASS" : "FAIL"} type-mismatch rejection -> ${JSON.stringify(mismatch.answer)} (expected null)`
  );
  mismatchOk ? pass++ : fail++;

  console.log(`\n${pass} passed, ${fail} failed`);

  await QuestionBankEntry.deleteMany({ userId });
  await mongoose.disconnect();

  if (fail > 0) process.exit(1);
}

run().catch((err) => {
  console.error("QUESTION MATCHER SMOKE TEST FAILED:", err);
  process.exit(1);
});
