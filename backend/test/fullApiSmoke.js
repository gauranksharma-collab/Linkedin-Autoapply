const axios = require("axios");

const BASE = "http://localhost:4500/api";
const EMAIL = "fullapismoke@example.com";
const PASSWORD = "passwordX1";

async function registerOrLogin() {
  try {
    const { data } = await axios.post(`${BASE}/auth/register`, { email: EMAIL, password: PASSWORD });
    return data.token;
  } catch (err) {
    if (err.response?.status === 409) {
      const { data } = await axios.post(`${BASE}/auth/login`, { email: EMAIL, password: PASSWORD });
      return data.token;
    }
    throw err;
  }
}

async function run() {
  const token = await registerOrLogin();
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  console.log("=== question bank CRUD ===");
  const created = await axios.post(
    `${BASE}/question-bank`,
    { question: "What is your notice period?", answer: "30 days", inputType: "text" },
    auth
  );
  console.log("created:", created.data.question_original, "->", created.data.answer);

  const list = await axios.get(`${BASE}/question-bank`, auth);
  console.log("list count:", list.data.length);

  const updated = await axios.put(`${BASE}/question-bank/${created.data._id}`, { answer: "45 days" }, auth);
  console.log("updated answer:", updated.data.answer);

  console.log("\n=== runner: start without LinkedIn login (expect graceful failure) ===");
  const start = await axios.post(`${BASE}/runner/start`, {}, auth);
  console.log("start response:", start.data);

  let status;
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    status = await axios.get(`${BASE}/runner/status`, auth);
    if (status.data.status !== "running") break;
  }
  console.log("runner status:", status.data.status);
  console.log("runner log:", status.data.log.map((l) => l.message));

  console.log("\n=== jobs list (should be empty, no scrape succeeded) ===");
  const jobs = await axios.get(`${BASE}/jobs`, auth);
  console.log("jobs count:", jobs.data.length);

  console.log("\n=== cleanup: delete question bank entry ===");
  await axios.delete(`${BASE}/question-bank/${created.data._id}`, auth);
  const listAfter = await axios.get(`${BASE}/question-bank`, auth);
  console.log("list count after delete:", listAfter.data.length);

  const pass =
    status.data.status === "error" &&
    status.data.log.some((l) => /not logged into linkedin/i.test(l.message)) &&
    listAfter.data.length === 0;

  console.log(pass ? "\nPASS: full API smoke test" : "\nFAIL: full API smoke test");
  if (!pass) process.exit(1);
}

run().catch((err) => {
  console.error("FULL API SMOKE TEST FAILED:", err.response?.data || err.message);
  process.exit(1);
});
