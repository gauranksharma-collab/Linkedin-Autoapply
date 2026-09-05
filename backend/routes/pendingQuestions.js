const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const PendingQuestion = require("../models/PendingQuestion");
const { answerPendingQuestion } = require("../automation/easyApply");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const status = req.query.status || "open";
    const questions = await PendingQuestion.find({ userId: req.userId, status }).populate("application_id");
    res.json(questions);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/answer", async (req, res, next) => {
  try {
    const { answer } = req.body;
    if (!answer) return res.status(400).json({ error: "answer is required" });
    const result = await answerPendingQuestion(req.userId, req.params.id, answer);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
