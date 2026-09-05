const mongoose = require("mongoose");

const questionBankEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question_normalized: { type: String, required: true },
    question_original: { type: String, required: true },
    answer: { type: String, required: true },
    input_type: String,
    times_used: { type: Number, default: 1 },
  },
  { timestamps: true }
);

questionBankEntrySchema.index({ userId: 1, question_normalized: 1 }, { unique: true });

module.exports = mongoose.model("QuestionBankEntry", questionBankEntrySchema);
