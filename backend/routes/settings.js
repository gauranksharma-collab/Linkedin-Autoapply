const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const settingsRepo = require("../models/settingsRepo");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    res.json(await settingsRepo.getAll(req.userId));
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  try {
    res.json(await settingsRepo.setMany(req.userId, req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
