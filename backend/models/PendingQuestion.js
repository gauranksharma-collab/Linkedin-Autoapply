const mongoose = require("mongoose");

const pendingQuestionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    application_id: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    question_original: { type: String, required: true },
    input_type: String,
    options_json: { type: [String], default: [] },
    status: { type: String, enum: ["open", "answered"], default: "open" },
    answer: String,
    resolved_at: Date,
  },
  { timestamps: true }
);

pendingQuestionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("PendingQuestion", pendingQuestionSchema);
