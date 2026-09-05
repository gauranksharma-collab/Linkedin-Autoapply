const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const runner = require("../automation/runner");

const router = express.Router();
router.use(requireAuth);

router.post("/start", async (req, res, next) => {
  try {
    if (runner.isRunning(req.userId)) {
      return res.status(409).json({ error: "A run is already in progress" });
    }
    runner.runCycle(req.userId).catch((err) => console.error("Run cycle crashed:", err));
    res.json({ started: true });
  } catch (err) {
    next(err);
  }
});

router.post("/stop", (req, res) => {
  runner.requestStop(req.userId);
  res.json({ stopping: true });
});

router.get("/status", (req, res) => {
  res.json(runner.getStatus(req.userId));
});

module.exports = router;
