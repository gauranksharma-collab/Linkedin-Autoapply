import { useState } from "react";
import { api } from "../api/client";
import RemoteBrowserView from "../components/RemoteBrowserView";

export default function LinkedInConnect() {
  const [liveLoggedIn, setLiveLoggedIn] = useState(null);
  const [checkedStatus, setCheckedStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  async function checkStatus() {
    setChecking(true);
    try {
      const { data } = await api.get("/browser/status");
      setCheckedStatus(data.loggedIn);
    } finally {
      setChecking(false);
    }
  }

  const loggedIn = checkedStatus ?? liveLoggedIn;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Connect LinkedIn</h1>
        <button
          onClick={checkStatus}
          disabled={checking}
          className="rounded-lg bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {checking ? "Checking..." : "Check login status"}
        </button>
      </div>

      {loggedIn !== null && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            loggedIn ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
          }`}
        >
          {loggedIn ? "Logged into LinkedIn" : "Not logged in yet — log in below"}
        </div>
      )}

      <RemoteBrowserView onStatus={setLiveLoggedIn} />
    </div>
  );
}
