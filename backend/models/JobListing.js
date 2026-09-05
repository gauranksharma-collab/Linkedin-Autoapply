const mongoose = require("mongoose");

const jobListingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    linkedin_job_id: { type: String, required: true },
    title: { type: String, required: true },
    company: String,
    location: String,
    url: { type: String, required: true },
    description: String,
    easy_apply: { type: Boolean, default: false },
    match_score: Number,
    status: {
      type: String,
      enum: ["queued", "skipped", "applying", "applied", "failed", "dismissed"],
      default: "queued",
    },
    scraped_at: { type: Date, default: Date.now },
    scraped_date: { type: String, required: true },
  },
  { timestamps: true }
);

jobListingSchema.index({ userId: 1, linkedin_job_id: 1 }, { unique: true });
jobListingSchema.index({ userId: 1, status: 1 });
jobListingSchema.index({ userId: 1, scraped_date: 1 });

module.exports = mongoose.model("JobListing", jobListingSchema);
