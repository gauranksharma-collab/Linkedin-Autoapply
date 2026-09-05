const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const JobListing = require("../models/JobListing");
const Application = require("../models/Application");
const { scrapeNewJobs } = require("../automation/jobScraper");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.status) filter.status = req.query.status;
    const jobs = await JobListing.find(filter).sort({ scraped_at: -1 }).limit(200);

    // "queued" alone doesn't distinguish "never attempted" from "attempted,
    // now waiting on you" — attach the latest application outcome so the
    // frontend can show a real status instead of a generic badge.
    const applications = await Application.find({
      userId: req.userId,
      job_listing_id: { $in: jobs.map((j) => j._id) },
    }).sort({ updatedAt: -1 });
    const latestByJob = new Map();
    for (const app of applications) {
      const key = String(app.job_listing_id);
      if (!latestByJob.has(key)) latestByJob.set(key, app);
    }

    const enriched = jobs.map((job) => {
      const app = latestByJob.get(String(job._id));
      return {
        ...job.toObject(),
        application: app
          ? { id: app._id, status: app.status, answers_json: app.answers_json }
          : null,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

router.post("/scrape", async (req, res, next) => {
  try {
    const jobs = await scrapeNewJobs(req.userId, req.body || {});
    res.json({ scraped: jobs.length, jobs });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/dismiss", async (req, res, next) => {
  try {
    const job = await JobListing.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: "dismissed" },
      { new: true }
    );
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/retry", async (req, res, next) => {
  try {
    const job = await JobListing.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, status: { $in: ["failed", "dismissed"] } },
      { status: "queued" },
      { new: true }
    );
    if (!job) return res.status(404).json({ error: "Failed or dismissed job not found" });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

router.post("/retry-failed", async (req, res, next) => {
  try {
    const result = await JobListing.updateMany(
      { userId: req.userId, status: { $in: ["failed", "dismissed"] } },
      { $set: { status: "queued" } }
    );
    res.json({ retried: result.modifiedCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
