import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [runnerStatus, setRunnerStatus] = useState({ status: "idle", log: [] });
  const [settings, setSettings] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [togglingAutoApply, setTogglingAutoApply] = useState(false);
  const [error, setError] = useState(null);

  const loadJobs = useCallback(() => {
    api.get("/jobs").then((res) => setJobs(res.data));
  }, []);

  const loadStatus = useCallback(() => {
    api.get("/runner/status").then((res) => setRunnerStatus(res.data));
  }, []);

  const loadSettings = useCallback(() => {
    api.get("/settings").then((res) => setSettings(res.data));
  }, []);

  useEffect(() => {
    loadJobs();
    loadStatus();
    loadSettings();
    const interval = setInterval(() => {
      loadStatus();
      loadJobs();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadJobs, loadStatus, loadSettings]);

  async function handleScrape() {
    setScraping(true);
    setError(null);
    try {
      await api.post("/jobs/scrape");
      loadJobs();
    } catch (err) {
      setError(err.response?.data?.error || "Scrape failed");
    } finally {
      setScraping(false);
    }
  }

  async function handleStart() {
    setError(null);
    try {
      await api.post("/runner/start");
      loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || "Could not start run");
    }
  }

  async function handleStop() {
    await api.post("/runner/stop");
    loadStatus();
  }

  async function handleDismiss(id) {
    await api.post(`/jobs/${id}/dismiss`);
    loadJobs();
  }

  async function handleRetry(id) {
    await api.post(`/jobs/${id}/retry`);
    loadJobs();
  }

  async function handleRetryAllFailed() {
    await api.post("/jobs/retry-failed");
    loadJobs();
  }

  async function handleEnableAutoApply() {
    setTogglingAutoApply(true);
    try {
      await api.put("/settings", { auto_apply_enabled: true });
      loadSettings();
    } finally {
      setTogglingAutoApply(false);
    }
  }

  async function handleToggleReview() {
    await api.put("/settings", { review_before_submit: !settings.review_before_submit });
    loadSettings();
  }

  async function handleConfirmSubmit(applicationId) {
    await api.post(`/applications/${applicationId}/confirm-submit`);
    loadJobs();
  }

  async function handleSkipApplication(applicationId) {
    await api.post(`/applications/${applicationId}/skip`);
    loadJobs();
  }

  async function handleRetryApplication(applicationId) {
    await api.post(`/applications/${applicationId}/retry`);
    loadJobs();
  }

  const failedOrDismissedCount = jobs.filter((j) => j.status === "failed" || j.status === "dismissed").length;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Dashboard</h1>
        <div className="flex gap-2">
          {failedOrDismissedCount > 0 && (
            <button
              onClick={handleRetryAllFailed}
              className="rounded-lg bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-sm font-medium"
            >
              Retry all failed/dismissed ({failedOrDismissedCount})
            </button>
          )}
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="rounded-lg bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {scraping ? "Scraping..." : "Scrape now"}
          </button>
          {runnerStatus.status === "running" ? (
            <button
              onClick={handleStop}
              className="rounded-lg bg-red-600 hover:bg-red-500 transition-colors px-4 py-2 text-sm font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 text-sm font-medium"
            >
              Run now
            </button>
          )}
        </div>
      </div>

      {settings && !settings.auto_apply_enabled && (
        <div className="rounded-lg bg-yellow-500/10 text-yellow-400 text-sm px-4 py-3 flex items-center justify-between gap-4">
          <span>
            Auto-apply is off — jobs get scraped but nothing gets applied to. Once it's on, this
            runs by itself in the background roughly every 15 minutes, all day, with no need to
            keep clicking anything.
          </span>
          <button
            onClick={handleEnableAutoApply}
            disabled={togglingAutoApply}
            className="shrink-0 rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 transition-colors px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {togglingAutoApply ? "Enabling..." : "Turn on auto-apply"}
          </button>
        </div>
      )}

      {settings && (
        <div className="rounded-lg bg-white/5 border border-white/10 text-sm px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-white/60">
            {settings.review_before_submit
              ? "Review before submit is on — filled applications pause here for your confirmation before the real submit click."
              : "Review before submit is off — applications submit automatically once filled out, no pause."}
          </span>
          <button
            onClick={handleToggleReview}
            className="shrink-0 rounded-lg bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 text-xs font-medium"
          >
            {settings.review_before_submit ? "Skip review (auto-submit)" : "Turn review back on"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-400 text-sm px-4 py-3">
          {error}
          {/not logged into linkedin/i.test(error) && (
            <>
              {" "}
              <Link to="/linkedin" className="underline">
                Connect LinkedIn
              </Link>
            </>
          )}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <p className="text-sm text-white/60">
          Run status: <span className="text-white">{runnerStatus.status}</span>
        </p>
        <div className="max-h-40 overflow-y-auto text-xs text-white/50 space-y-1 font-mono">
          {runnerStatus.log?.map((entry, i) => (
            <div key={i}>
              [{new Date(entry.at).toLocaleTimeString()}] {entry.message}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {jobs.length === 0 && <p className="text-sm text-white/40">No jobs scraped yet.</p>}
        {jobs.map((job) => {
          const appStatus = job.application?.status;
          const appOverridesJobStatus = ["awaiting_review", "awaiting_answer", "skipped"].includes(appStatus);
          const displayStatus = appOverridesJobStatus ? appStatus : job.status;

          return (
            <div key={job._id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <a href={job.url} target="_blank" rel="noreferrer" className="text-white hover:underline font-medium">
                    {job.title}
                  </a>
                  <p className="text-sm text-white/50">
                    {[job.company, job.location, job.easy_apply ? "Easy Apply" : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs uppercase ${
                      displayStatus === "awaiting_review" || displayStatus === "awaiting_answer"
                        ? "text-yellow-400"
                        : displayStatus === "failed"
                        ? "text-red-400"
                        : "text-white/40"
                    }`}
                  >
                    {displayStatus.replace("_", " ")}
                  </span>
                  {job.status === "queued" && !appStatus && (
                    <button
                      onClick={() => handleDismiss(job._id)}
                      className="text-xs text-white/40 hover:text-white transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                  {(job.status === "failed" || job.status === "dismissed") && (
                    <button
                      onClick={() => handleRetry(job._id)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                  {appStatus === "skipped" && (
                    <button
                      onClick={() => handleRetryApplication(job.application.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {appStatus === "awaiting_review" && (
                <div className="rounded-lg bg-yellow-500/10 p-3 space-y-2">
                  <p className="text-xs text-white/50">Filled out and ready — review before it submits for real:</p>
                  <ul className="text-xs text-white/70 space-y-0.5">
                    {job.application.answers_json?.map((a, i) => (
                      <li key={i}>
                        <span className="text-white/40">{a.question}:</span> {String(a.answer)}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleConfirmSubmit(job.application.id)}
                      className="text-xs rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors px-3 py-1.5"
                    >
                      Confirm & Submit
                    </button>
                    <button
                      onClick={() => handleSkipApplication(job.application.id)}
                      className="text-xs text-white/40 hover:text-white transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {appStatus === "awaiting_answer" && (
                <div className="rounded-lg bg-yellow-500/10 p-3 flex items-center justify-between">
                  <p className="text-xs text-white/50">Paused on a new question it hasn't seen before.</p>
                  <Link to="/pending" className="text-xs text-blue-400 hover:text-blue-300 underline">
                    Answer it
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
