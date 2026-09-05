require("dotenv").config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

const http = require("http");
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");
const { attachWsServer } = require("./automation/wsServer");
const scheduler = require("./automation/scheduler");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/browser", require("./routes/browser"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/question-bank", require("./routes/questionBank"));
app.use("/api/pending-questions", require("./routes/pendingQuestions"));
app.use("/api/runner", require("./routes/runner"));

app.get("/", (_req, res) => res.json({ ok: true, message: "linkedin-auto-apply backend is live" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

const server = http.createServer(app);
attachWsServer(server);

const PORT = process.env.PORT || 4500;

connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`linkedin-auto-apply backend listening on :${PORT}`));
    scheduler.start();
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
