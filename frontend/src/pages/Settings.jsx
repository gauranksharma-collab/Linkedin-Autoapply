import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then((res) => setSettings(res.data));
  }, []);

  function update(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await api.put("/settings", settings);
      setSettings(data);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-lg font-semibold text-white">Settings</h1>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <label className="flex items-center justify-between text-sm text-white/70">
          <span>Auto-apply enabled</span>
          <input
            type="checkbox"
            checked={settings.auto_apply_enabled}
            onChange={(e) => update("auto_apply_enabled", e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between text-sm text-white/70">
          <span>Review before submit</span>
          <input
            type="checkbox"
            checked={settings.review_before_submit}
            onChange={(e) => update("review_before_submit", e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between text-sm text-white/70">
          <span>Easy Apply only</span>
          <input
            type="checkbox"
            checked={settings.easy_apply_only}
            onChange={(e) => update("easy_apply_only", e.target.checked)}
          />
        </label>

        <label className="block text-sm text-white/70 space-y-1">
          <span>Search keywords</span>
          <input
            value={settings.search_keywords}
            onChange={(e) => update("search_keywords", e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>
        <label className="block text-sm text-white/70 space-y-1">
          <span>Search location</span>
          <input
            value={settings.search_location}
            onChange={(e) => update("search_location", e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>
        <label className="block text-sm text-white/70 space-y-1">
          <span>Daily action cap</span>
          <input
            type="number"
            value={settings.daily_action_cap}
            onChange={(e) => update("daily_action_cap", Number(e.target.value))}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm text-white/70 space-y-1">
            <span>Min delay (ms)</span>
            <input
              type="number"
              value={settings.min_delay_ms}
              onChange={(e) => update("min_delay_ms", Number(e.target.value))}
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
            />
          </label>
          <label className="block text-sm text-white/70 space-y-1">
            <span>Max delay (ms)</span>
            <input
              type="number"
              value={settings.max_delay_ms}
              onChange={(e) => update("max_delay_ms", Number(e.target.value))}
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
