const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    full_name: String,
    email: String,
    phone: String,
    location: String,
    headline: String,
    raw_resume_text: String,
    skills_json: { type: [String], default: [] },
    experience_json: { type: [mongoose.Schema.Types.Mixed], default: [] },
    education_json: { type: [mongoose.Schema.Types.Mixed], default: [] },
    current_ctc: String,
    expected_ctc: String,
    notice_period: String,
    resume_file_path: String,
    ocr_used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
