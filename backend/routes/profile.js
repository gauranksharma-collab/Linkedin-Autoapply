const express = require("express");
const path = require("path");
const { requireAuth } = require("../middleware/requireAuth");
const { uploadResume } = require("../middleware/upload");
const { uploadResumeToCloudinary } = require("../config/cloudinary");
const { extractText } = require("../utils/resumeTextExtractor");
const { parseResumeProfile } = require("../utils/resumeProfileParser");
const profileRepo = require("../models/profileRepo");
const settingsRepo = require("../models/settingsRepo");

function deriveSearchKeywords(parsed) {
  // Skills are short, search-friendly terms (e.g. "Python Django AWS"); a résumé
  // headline is often a full sentence, which makes a poor LinkedIn keyword query.
  if (Array.isArray(parsed.skills_json) && parsed.skills_json.length > 0) {
    return parsed.skills_json.slice(0, 3).join(" ");
  }
  if (parsed.headline) return parsed.headline.split(/\s+/).slice(0, 4).join(" ");
  return null;
}

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    res.json(await profileRepo.get(req.userId));
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  try {
    res.json(await profileRepo.upsert(req.userId, req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/import-resume", uploadResume.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No résumé file uploaded" });

    const ext = path.extname(req.file.originalname);
    const { text, ocrUsed } = await extractText(req.file.path, ext);

    if (!text) {
      return res.status(422).json({
        error: "Could not extract any text from this résumé — please try a different file",
      });
    }

    let resumeUrl = null;
    try {
      const uploaded = await uploadResumeToCloudinary(req.file.path, req.userId);
      resumeUrl = uploaded.url;
    } catch (err) {
      console.error("Cloudinary upload failed, keeping local temp path:", err.message);
      resumeUrl = req.file.path;
    }

    const parsed = await parseResumeProfile(text);
    const profile = await profileRepo.upsert(req.userId, {
      raw_resume_text: text,
      resume_file_path: resumeUrl,
      ocr_used: Boolean(ocrUsed),
      ...(parsed || {}),
    });

    let autoSearchApplied = false;
    if (parsed) {
      const currentSettings = await settingsRepo.getAll(req.userId);
      const settingsUpdate = {};
      if (!currentSettings.search_keywords) {
        const derived = deriveSearchKeywords(parsed);
        if (derived) settingsUpdate.search_keywords = derived;
      }
      if (!currentSettings.search_location && parsed.location) {
        settingsUpdate.search_location = parsed.location;
      }
      if (Object.keys(settingsUpdate).length > 0) {
        await settingsRepo.setMany(req.userId, settingsUpdate);
        autoSearchApplied = true;
      }
    }

    res.json({
      profile,
      aiParsed: Boolean(parsed),
      autoSearchApplied,
      warning: parsed
        ? null
        : "AI structuring failed — raw résumé text was saved, please fill in the fields manually.",
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
