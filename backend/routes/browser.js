const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { issueTicket } = require("../utils/wsTickets");
const browserPool = require("../automation/browserPool");
const { isLinkedInLoggedInUrl } = require("../automation/linkedinStatus");

const router = express.Router();

router.use(requireAuth);

router.post("/session", (req, res) => {
  const ticket = issueTicket(req.userId);
  res.json({ ticket, wsPath: `/ws/browser?ticket=${ticket}` });
});

router.get("/status", async (req, res, next) => {
  try {
    const page = await browserPool.getPage(req.userId);
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    const currentUrl = page.url();
    res.json({ loggedIn: isLinkedInLoggedInUrl(currentUrl), url: currentUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
