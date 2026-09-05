const fs = require("fs");
const mongoose = require("mongoose");
const { UPLOADS_DIR, SCREENSHOTS_DIR, BROWSER_PROFILES_DIR } = require("./paths");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(BROWSER_PROFILES_DIR, { recursive: true });

async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
}

module.exports = { connectDB };
