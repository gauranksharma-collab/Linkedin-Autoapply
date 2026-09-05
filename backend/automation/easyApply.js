const browserPool = require("./browserPool");
const { assertNoCheckpoint } = require("./checkpointDetector");
const selectors = require("./selectors");
const { findAnswer, saveAnswer } = require("../utils/questionMatcher");
const { dedupeRepeatedText } = require("../utils/textDedupe");
const Application = require("../models/Application");
const PendingQuestion = require("../models/PendingQuestion");
const JobListing = require("../models/JobListing");
const settingsRepo = require("../models/settingsRepo");

const MAX_STEPS = 15;

async function getOrCreateApplication(userId, jobListing) {
  let application = await Application.findOne({ userId, job_listing_id: jobListing._id });
  if (!application) {
    application = await Application.create({ userId, job_listing_id: jobListing._id, status: "pending" });
  }
  return application;
}

// LinkedIn's Easy Apply modal (verified live against a real application) uses
// fully hashed/atomic CSS class names with no stable selector — but it still
// follows standard HTML labeling: `<label for>` linked to its control, and
// `<fieldset><legend>` for radio groups. Scoped away from `footer`/`nav` so
// unrelated page chrome (e.g. LinkedIn's own language switcher) isn't picked
// up, since this runs page-wide rather than against a modal container class.
async function extractFormFields(page) {
  const fields = [];
  const seenIds = new Set();

  const labels = await page.locator("label:visible").all();
  for (const label of labels) {
    const inChrome = await label.evaluate((el) => Boolean(el.closest("footer, nav"))).catch(() => true);
    if (inChrome) continue;

    const forId = await label.getAttribute("for").catch(() => null);
    if (!forId || seenIds.has(forId)) continue;

    const input = page.locator(`[id="${forId}"]`).first();
    if ((await input.count().catch(() => 0)) === 0) continue;
    seenIds.add(forId);

    const tag = await input.evaluate((el) => el.tagName).catch(() => "");
    const htmlType = await input.getAttribute("type").catch(() => null);
    let inputType = "text";
    if (tag === "SELECT") inputType = "select";
    else if (htmlType === "checkbox") inputType = "checkbox";
    else if (htmlType === "radio") inputType = "checkbox"; // individually labeled, not grouped by a fieldset
    else if (htmlType === "file") inputType = "file";

    const rawLabel = (await label.innerText().catch(() => "")).replace(/\*\s*$/, "").trim();
    if (!rawLabel) continue;

    fields.push({ input, label: dedupeRepeatedText(rawLabel), inputType, isNumber: htmlType === "number" });
  }

  const fieldsets = await page.locator("fieldset:visible").all();
  for (const fieldset of fieldsets) {
    const inChrome = await fieldset.evaluate((el) => Boolean(el.closest("footer, nav"))).catch(() => true);
    if (inChrome) continue;

    const hasRadio = (await fieldset.locator('input[type="radio"]').count().catch(() => 0)) > 0;
    if (!hasRadio) continue;

    const rawLegend = (await fieldset.locator("legend").first().innerText().catch(() => "")).replace(/\*\s*$/, "").trim();
    if (!rawLegend) continue;

    fields.push({ group: fieldset, label: dedupeRepeatedText(rawLegend), inputType: "radio" });
  }

  return fields;
}

const AFFIRMATIVE_ANSWERS = new Set(["yes", "true", "on", "check", "checked", "agree"]);

async function fillField(page, field, answer) {
  if (field.inputType === "select") {
    await field.input.selectOption({ label: String(answer) }).catch(() => field.input.selectOption(String(answer)));
    return;
  }

  if (field.inputType === "checkbox") {
    if (AFFIRMATIVE_ANSWERS.has(String(answer).toLowerCase())) await field.input.check();
    else await field.input.uncheck();
    return;
  }

  if (field.inputType === "radio") {
    const options = await field.group.locator('input[type="radio"]').all();
    for (const option of options) {
      const id = await option.getAttribute("id");
      const optionLabel = id
        ? (await page.locator(`[for="${id}"]`).first().innerText().catch(() => "")).trim()
        : "";
      if (optionLabel.toLowerCase() === String(answer).toLowerCase()) {
        await option.check();
        return;
      }
    }
    return;
  }

  await field.input.fill(String(answer));
}

async function applyToJob(userId, jobListing, options = {}) {
  const page = await browserPool.getPage(userId);
  await assertNoCheckpoint(page);

  const application = await getOrCreateApplication(userId, jobListing);
  application.error_message = null; // this run's outcome supersedes any stale error from a prior attempt
  const settings = await settingsRepo.getAll(userId);

  await page.goto(jobListing.url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await assertNoCheckpoint(page);

  // The apply control renders client-side slightly after domcontentloaded —
  // an instant .count() check races that render and false-negatives often.
  const easyApplyBtn = page.locator(selectors.easyApplyButton).first();
  try {
    await easyApplyBtn.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    application.status = "error";
    application.error_message = "Easy Apply button not found on this listing";
    await application.save();
    return { application };
  }

  await easyApplyBtn.click();
  // No stable modal container selector exists (verified: LinkedIn's apply
  // modal uses fully hashed CSS with no fixed classes) — waiting for the
  // step-advance button is a reliable proxy for "the modal has rendered".
  await page.waitForSelector(
    `${selectors.nextButton}, ${selectors.reviewButton}, ${selectors.submitButton}`,
    { timeout: 10000 }
  );

  // Rebuilt fresh on every run: a re-opened Easy Apply modal starts from step
  // one with blank fields, so whatever was filled in a prior (abandoned) attempt
  // must be re-derived from the question bank, not assumed to still be on screen.
  const collectedAnswers = [];

  for (let step = 0; step < MAX_STEPS; step += 1) {
    await assertNoCheckpoint(page);

    const fields = await extractFormFields(page);

    // LinkedIn's résumé picker exposes a "Deselect résumé X" checkbox for the
    // currently-attached file, alongside a "Select résumé X" checkbox that's
    // unchecked (verified live: an accessibility-duplicate control for the
    // same toggle, not a second real résumé). If a résumé is already attached
    // anywhere in this step, none of these need answering.
    const resumeAlreadyAttached = await (async () => {
      for (const f of fields) {
        if (/^deselect r[ée]sum[ée]/i.test(f.label) && (await f.input.isChecked().catch(() => false))) return true;
      }
      return false;
    })();

    for (const field of fields) {
      if (resumeAlreadyAttached && /^(select|deselect) r[ée]sum[ée]/i.test(field.label)) {
        collectedAnswers.push({ question: field.label, answer: true, source: "resume-already-attached" });
        continue;
      }

      // File inputs (e.g. an "upload a new resume" control alongside an
      // already-selected existing resume) can't be answered with saved text —
      // skip rather than block the whole application on something that isn't
      // really a screening question.
      if (field.inputType === "file") {
        collectedAnswers.push({ question: field.label, answer: null, source: "skipped-file-upload" });
        continue;
      }

      // LinkedIn frequently pre-fills/pre-checks fields (email, phone, phone
      // country code, an already-selected résumé) with sensible defaults —
      // leave those alone rather than demanding an answer for something
      // already correctly set. A checkbox's .value is always "on" regardless
      // of checked state, so it needs its own check rather than inputValue().
      if (field.inputType === "checkbox") {
        const isChecked = await field.input.isChecked().catch(() => false);
        if (isChecked) {
          collectedAnswers.push({ question: field.label, answer: true, source: "prefilled" });
          continue;
        }
      } else if (field.inputType !== "radio") {
        const existingValue = (await field.input.inputValue().catch(() => "")).trim();
        // A bare "0" on a years-of-experience/rating-style question is very
        // likely just an untouched default, not a real answer someone typed —
        // that should never be silently accepted as if the applicant
        // confirmed "0 years experience". (Not gated on input type="number":
        // these fields are often styled as plain text inputs regardless.)
        const looksLikeUntouchedDefault =
          existingValue === "0" && /how many|years?\b|rate|scale|proficiency/i.test(field.label);
        if (existingValue && !looksLikeUntouchedDefault) {
          collectedAnswers.push({ question: field.label, answer: existingValue, source: "prefilled" });
          continue;
        }
      }

      const { answer, matchedEntry } = await findAnswer(userId, field.label, field.inputType);
      if (answer !== null) {
        await fillField(page, field, answer);
        collectedAnswers.push({ question: field.label, answer, source: matchedEntry ? "question_bank" : "unknown" });
        continue;
      }

      const pending = await PendingQuestion.create({
        userId,
        application_id: application._id,
        question_original: field.label,
        input_type: field.inputType,
      });
      application.status = "awaiting_answer";
      application.answers_json = collectedAnswers;
      await application.save();
      return { application, pendingQuestion: pending };
    }

    const submitBtn = page.locator(selectors.submitButton).first();
    if ((await submitBtn.count().catch(() => 0)) > 0) {
      application.answers_json = collectedAnswers;

      if (settings.review_before_submit && !options.forceSubmit) {
        application.status = "awaiting_review";
        await application.save();
        return { application };
      }

      await submitBtn.click();
      await page.waitForTimeout(1500);
      await assertNoCheckpoint(page);

      application.status = "submitted";
      application.submitted_at = new Date();
      await application.save();
      await JobListing.updateOne({ _id: jobListing._id }, { status: "applied" });
      return { application };
    }

    const nextBtn = page.locator(selectors.nextButton).first();
    if ((await nextBtn.count().catch(() => 0)) > 0) {
      await nextBtn.click();
      await page.waitForTimeout(800);
      continue;
    }

    break;
  }

  application.status = "error";
  application.error_message = "Could not complete the Easy Apply flow — unexpected form structure";
  application.answers_json = collectedAnswers;
  await application.save();
  return { application };
}

async function confirmSubmit(userId, applicationId) {
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application || application.status !== "awaiting_review") {
    throw new Error("Application is not awaiting review");
  }

  const jobListing = await JobListing.findOne({ _id: application.job_listing_id, userId });
  if (!jobListing) throw new Error("Job listing not found");

  // The shared browser page for this user may well have moved on to a
  // different job by now (the runner doesn't sit and wait on a paused
  // review) — re-running the normal flow re-derives every field fresh
  // instead of assuming the modal is still sitting where it was left.
  const { application: updated } = await applyToJob(userId, jobListing, { forceSubmit: true });
  return updated;
}

async function answerPendingQuestion(userId, pendingQuestionId, answer) {
  const pending = await PendingQuestion.findOne({ _id: pendingQuestionId, userId });
  if (!pending) throw new Error("Pending question not found");

  await saveAnswer(userId, pending.question_original, answer, pending.input_type);
  pending.status = "answered";
  pending.answer = answer;
  pending.resolved_at = new Date();
  await pending.save();

  const application = await Application.findOne({ _id: pending.application_id, userId });
  const jobListing = await JobListing.findOne({ _id: application.job_listing_id, userId });

  // The question bank now has this answer, so re-running from the top resolves
  // everything answered so far instantly and continues from where it stopped.
  return applyToJob(userId, jobListing);
}

module.exports = { applyToJob, confirmSubmit, answerPendingQuestion };
