import { useEffect, useState } from "react";
import { api } from "../api/client";

const STATUS_COLORS = {
  pending: "text-white/40",
  awaiting_review: "text-yellow-400",
  awaiting_answer: "text-yellow-400",
  submitted: "text-green-400",
  skipped: "text-white/40",
  error: "text-red-400",
  checkpoint_blocked: "text-red-400",
};

export default function ApplicationHistory() {
  const [applications, setApplications] = useState([]);
  const [busy, setBusy] = useState(null);

  function load() {
    api.get("/applications").then((res) => setApplications(res.data));
  }

  useEffect(load, []);

  async function handleConfirmSubmit(id) {
    setBusy(id);
    try {
      await api.post(`/applications/${id}/confirm-submit`);
      load();
    } finally {
      setBusy(null);
    }
  }

  async function handleSkip(id) {
    setBusy(id);
    try {
      await api.post(`/applications/${id}/skip`);
      load();
    } finally {
      setBusy(null);
    }
  }

  async function handleRetry(id) {
    setBusy(id);
    try {
      await api.post(`/applications/${id}/retry`);
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-semibold text-white">Application History</h1>
      {applications.length === 0 && <p className="text-sm text-white/40">No applications yet.</p>}
      <div className="space-y-2">
        {applications.map((app) => (
          <div key={app._id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div>
              <p className="text-white text-sm">{app.job_listing_id?.title || "Job removed"}</p>
              <p className="text-xs text-white/40">{app.job_listing_id?.company}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs uppercase ${STATUS_COLORS[app.status] || "text-white/40"}`}>
                {app.status.replace("_", " ")}
              </span>
              {app.status === "awaiting_review" && (
                <>
                  <button
                    onClick={() => handleConfirmSubmit(app._id)}
                    disabled={busy === app._id}
                    className="text-xs rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors px-3 py-1.5 disabled:opacity-50"
                  >
                    Confirm & Submit
                  </button>
                  <button
                    onClick={() => handleSkip(app._id)}
                    disabled={busy === app._id}
                    className="text-xs text-white/40 hover:text-white transition-colors"
                  >
                    Skip
                  </button>
                </>
              )}
              {app.status === "skipped" && (
                <button
                  onClick={() => handleRetry(app._id)}
                  disabled={busy === app._id}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/40">
        "Confirm & Submit" clicks the real submit button in your live LinkedIn browser — check the
        LinkedIn tab yourself before confirming if you want to see exactly what will be sent.
      </p>
    </div>
  );
}
