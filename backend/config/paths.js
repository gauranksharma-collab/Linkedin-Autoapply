const path = require("path");

const BACKEND_ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(BACKEND_ROOT, "data");
const UPLOADS_DIR = path.join(BACKEND_ROOT, "uploads");

module.exports = {
  DATA_DIR,
  UPLOADS_DIR,
  BROWSER_PROFILES_DIR: path.join(DATA_DIR, "browser-profiles"),
  SCREENSHOTS_DIR: path.join(DATA_DIR, "screenshots"),
};
