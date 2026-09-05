const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const QuestionBankEntry = require("../models/QuestionBankEntry");
const { saveAnswer } = require("../utils/questionMatcher");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const entries = await QuestionBankEntry.find({ userId: req.userId }).sort({ times_used: -1 });
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { question, answer, inputType } = req.body;
    if (!question || !answer) return res.status(400).json({ error: "question and answer are required" });
    const entry = await saveAnswer(req.userId, question, answer, inputType);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { answer } = req.body;
    const entry = await QuestionBankEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { answer } },
      { new: true }
    );
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await QuestionBankEntry.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Entry not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
