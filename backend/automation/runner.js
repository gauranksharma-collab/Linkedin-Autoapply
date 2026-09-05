const browserPool = require("./browserPool");
const { CheckpointDetectedError } = require("./checkpointDetector");
const { scrapeNewJobs } = require("./jobScraper");
const { applyToJob } = require("./easyApply");
const { waitBetweenActions, applyCapReached } = require("./rateLimiter");
const JobListing = require("../models/JobListing");
const settingsRepo = require("../models/settingsRepo");

// userId -> { status: 'running'|'done'|'error'|'stopped', log: [], cancelled: bool }
const activeRuns = new Map();

function log(userId, message) {
  const run = activeRuns.get(userId);
  if (run) run.log.push({ message, at: new Date().toISOString() });
  console.log(`[runner:${userId}] ${message}`);
}

function isRunning(userId) {
  const run = activeRuns.get(userId);
  return Boolean(run && run.status === "running");
}

function requestStop(userId) {
  const run = activeRuns.get(userId);
  if (run && run.status === "running") run.cancelled = true;
}

function getStatus(userId) {
  return activeRuns.get(userId) || { status: "idle", log: [] };
}

async function runCycle(userId) {
  if (isRunning(userId)) throw new Error("A run is already in progress for this user");

  activeRuns.set(userId, { status: "running", log: [], cancelled: false });
  browserPool.setRunnerActive(userId, true);
  const run = activeRuns.get(userId);

  try {
    log(userId, "Scraping new job listings...");
    const scraped = await scrapeNewJobs(userId);
    log(userId, `Scraped ${scraped.length} listings`);

    const settings = await settingsRepo.getAll(userId);
    if (!settings.auto_apply_enabled) {
      log(userId, "auto_apply_enabled is off — stopping after scrape");
      run.status = "done";
      return;
    }

    const queued = await JobListing.find({ userId, status: "queued", easy_apply: true });

    for (const job of queued) {
      if (run.cancelled) {
        log(userId, "Stopped by user");
        run.status = "stopped";
        return;
      }
      if (await applyCapReached(userId)) {
        log(userId, "Daily apply cap reached — stopping");
        break;
      }

      await waitBetweenActions(userId);
      log(userId, `Applying to "${job.title}" at ${job.company}...`);

      try {
        job.status = "applying";
        await job.save();

        const { application, pendingQuestion } = await applyToJob(userId, job);

        if (pendingQuestion) {
          log(userId, `Paused — new question needs an answer: "${pendingQuestion.question_original}"`);
          job.status = "queued";
          await job.save();
        } else if (application.status === "awaiting_review") {
          log(userId, "Filled out — waiting for your review before submit");
          job.status = "queued";
          await job.save();
        } else if (application.status === "submitted") {
          log(userId, "Submitted");
        } else if (application.status === "error") {
          job.status = "failed";
          await job.save();
          log(userId, `Failed: ${application.error_message}`);
        }
      } catch (err) {
        if (err instanceof CheckpointDetectedError) {
          log(userId, "LinkedIn checkpoint detected — stopping immediately, please resolve it via the live view");
          job.status = "queued";
          await job.save();
          run.status = "checkpoint_blocked";
          return;
        }
        job.status = "failed";
        await job.save();
        log(userId, `Error: ${err.message}`);
      }
    }

    run.status = "done";
  } catch (err) {
    log(userId, `Run failed: ${err.message}`);
    run.status = "error";
  } finally {
    browserPool.setRunnerActive(userId, false);
  }
}

module.exports = { runCycle, getStatus, isRunning, requestStop };
