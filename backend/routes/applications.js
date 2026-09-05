const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const Application = require("../models/Application");
const JobListing = require("../models/JobListing");
const { applyToJob, confirmSubmit } = require("../automation/easyApply");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.status) filter.status = req.query.status;
    const applications = await Application.find(filter)
      .populate("job_listing_id")
      .sort({ updatedAt: -1 })
      .limit(200);
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, userId: req.userId }).populate(
      "job_listing_id"
    );
    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json(application);
  } catch (err) {
    next(err);
  }
});

router.post("/:jobListingId/apply", async (req, res, next) => {
  try {
    const jobListing = await JobListing.findOne({ _id: req.params.jobListingId, userId: req.userId });
    if (!jobListing) return res.status(404).json({ error: "Job listing not found" });

    const result = await applyToJob(req.userId, jobListing);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/confirm-submit", async (req, res, next) => {
  try {
    const application = await confirmSubmit(req.userId, req.params.id);
    res.json(application);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/skip", async (req, res, next) => {
  try {
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: "skipped" },
      { new: true }
    );
    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json(application);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/retry", async (req, res, next) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.userId,
      status: "skipped",
    });
    if (!application) return res.status(404).json({ error: "Skipped application not found" });

    application.status = "pending";
    application.error_message = null;
    application.answers_json = [];
    await application.save();

    // A skip never touched the job's own status, but it may since have been
    // dismissed separately — make sure it's actually back in the queue too.
    await JobListing.updateOne(
      { _id: application.job_listing_id, userId: req.userId },
      { $set: { status: "queued" } }
    );

    res.json(application);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
