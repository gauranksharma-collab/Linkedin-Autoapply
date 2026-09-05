const settingsRepo = require("../models/settingsRepo");
const JobListing = require("../models/JobListing");
const Application = require("../models/Application");

function randomDelay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitBetweenActions(userId) {
  const settings = await settingsRepo.getAll(userId);
  await randomDelay(settings.min_delay_ms, settings.max_delay_ms);
}

function todayStart() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

async function scrapedTodayCount(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return JobListing.countDocuments({ userId, scraped_date: today });
}

async function appliedTodayCount(userId) {
  return Application.countDocuments({ userId, status: "submitted", submitted_at: { $gte: todayStart() } });
}

async function scrapeCapRemaining(userId) {
  const settings = await settingsRepo.getAll(userId);
  const used = await scrapedTodayCount(userId);
  return Math.max(0, settings.daily_action_cap - used);
}

async function applyCapReached(userId) {
  const settings = await settingsRepo.getAll(userId);
  const used = await appliedTodayCount(userId);
  return used >= settings.daily_action_cap;
}

module.exports = {
  randomDelay,
  waitBetweenActions,
  scrapedTodayCount,
  appliedTodayCount,
  scrapeCapRemaining,
  applyCapReached,
};
