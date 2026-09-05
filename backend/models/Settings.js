const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    auto_apply_enabled: { type: Boolean, default: false },
    review_before_submit: { type: Boolean, default: true },
    daily_action_cap: { type: Number, default: 50 },
    min_delay_ms: { type: Number, default: 4000 },
    max_delay_ms: { type: Number, default: 12000 },
    search_keywords: { type: String, default: "" },
    search_location: { type: String, default: "" },
    easy_apply_only: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
