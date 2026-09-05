const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job_listing_id: { type: mongoose.Schema.Types.ObjectId, ref: "JobListing", required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_review",
        "awaiting_answer",
        "submitted",
        "skipped",
        "error",
        "checkpoint_blocked",
      ],
      default: "pending",
    },
    answers_json: { type: [mongoose.Schema.Types.Mixed], default: [] },
    error_message: String,
    submitted_at: Date,
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Application", applicationSchema);
