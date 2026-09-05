const path = require("path");
const { chromium } = require("playwright");
const { BROWSER_PROFILES_DIR } = require("../config/paths");

const IDLE_TIMEOUT_MS = 25 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

// userId -> { context, page, viewerCount, lastActivity, runnerActive }
const pool = new Map();

async function launchContext(userId) {
  const profileDir = path.join(BROWSER_PROFILES_DIR, userId);
  return chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: { width: 1280, height: 800 },
  });
}

async function getOrLaunchContext(userId) {
  let entry = pool.get(userId);
  if (entry) return entry;

  const context = await launchContext(userId);
  entry = { context, page: null, viewerCount: 0, lastActivity: Date.now(), runnerActive: false };
  pool.set(userId, entry);
  return entry;
}

async function getPage(userId) {
  const entry = await getOrLaunchContext(userId);
  if (!entry.page || entry.page.isClosed()) {
    entry.page = entry.context.pages()[0] || (await entry.context.newPage());
  }
  touch(userId);
  return entry.page;
}

function touch(userId) {
  const entry = pool.get(userId);
  if (entry) entry.lastActivity = Date.now();
}

function attachViewer(userId) {
  const entry = pool.get(userId);
  if (entry) {
    entry.viewerCount += 1;
    touch(userId);
  }
}

function detachViewer(userId) {
  const entry = pool.get(userId);
  if (entry) {
    entry.viewerCount = Math.max(0, entry.viewerCount - 1);
    touch(userId);
  }
}

function setRunnerActive(userId, active) {
  const entry = pool.get(userId);
  if (entry) entry.runnerActive = active;
}

async function closeContext(userId) {
  const entry = pool.get(userId);
  if (!entry) return;
  pool.delete(userId);
  try {
    await entry.context.close();
  } catch {
    // already closed
  }
}

function isActive(userId) {
  return pool.has(userId);
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of pool) {
    if (entry.viewerCount > 0 || entry.runnerActive) continue;
    if (now - entry.lastActivity > IDLE_TIMEOUT_MS) closeContext(userId);
  }
}, SWEEP_INTERVAL_MS).unref();

module.exports = {
  getOrLaunchContext,
  getPage,
  touch,
  attachViewer,
  detachViewer,
  setRunnerActive,
  closeContext,
  isActive,
};
