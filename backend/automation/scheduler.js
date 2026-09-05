const User = require("../models/User");
const settingsRepo = require("../models/settingsRepo");
const browserPool = require("./browserPool");
const runner = require("./runner");
const { isLinkedInLoggedInUrl } = require("./linkedinStatus");

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

async function tick() {
  const users = await User.find({}, "_id");

  for (const user of users) {
    const userId = String(user._id);
    try {
      const settings = await settingsRepo.getAll(userId);
      if (!settings.auto_apply_enabled) continue;
      if (runner.isRunning(userId)) continue;

      // Re-attaches to this user's persisted browser profile (restoring their
      // LinkedIn session from disk if the server restarted) without requiring
      // them to be actively watching the live view.
      const page = await browserPool.getPage(userId);
      if (!isLinkedInLoggedInUrl(page.url())) {
        await page
          .goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 15000 })
          .catch(() => {});
      }
      if (!isLinkedInLoggedInUrl(page.url())) continue;

      console.log(`[scheduler] starting background run for user ${userId}`);
      runner.runCycle(userId).catch((err) => console.error(`[scheduler] run failed for ${userId}:`, err.message));
    } catch (err) {
      console.error(`[scheduler] tick error for user ${userId}:`, err.message);
    }
  }
}

function start() {
  tick().catch((err) => console.error("[scheduler] initial tick failed:", err.message));
  setInterval(() => {
    tick().catch((err) => console.error("[scheduler] tick failed:", err.message));
  }, CHECK_INTERVAL_MS).unref();
  console.log(`[scheduler] started, checking every ${CHECK_INTERVAL_MS / 60000} minutes`);
}

module.exports = { start };
