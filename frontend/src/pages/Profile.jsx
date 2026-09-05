import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [warning, setWarning] = useState(null);
  const [error, setError] = useState(null);
  const [autoSearchApplied, setAutoSearchApplied] = useState(false);

  useEffect(() => {
    api.get("/profile").then((res) => setProfile(res.data)).catch(() => {});
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setWarning(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const { data } = await api.post("/profile/import-resume", formData);
      setProfile(data.profile);
      setWarning(data.warning);
      setAutoSearchApplied(data.autoSearchApplied);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFieldChange(field, value) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    const { data } = await api.put("/profile", {
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      headline: profile.headline,
      current_ctc: profile.current_ctc,
      expected_ctc: profile.expected_ctc,
      notice_period: profile.notice_period,
    });
    setProfile(data);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-semibold text-white">Your Profile</h1>

      <form onSubmit={handleUpload} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm text-white/70"
        />
        <button
          type="submit"
          disabled={!file || uploading}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {uploading ? "Parsing..." : "Upload résumé"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {warning && <p className="text-yellow-400 text-sm">{warning}</p>}
      {autoSearchApplied && (
        <p className="text-green-400 text-sm">
          Job search keywords/location were auto-filled from your résumé —{" "}
          <Link to="/settings" className="underline">
            review in Settings
          </Link>
          , then head to the{" "}
          <Link to="/" className="underline">
            Dashboard
          </Link>{" "}
          and click "Scrape now" (after connecting LinkedIn) to pull in matching listings.
        </p>
      )}
      {profile?.ocr_used && (
        <p className="text-yellow-400 text-sm">
          This résumé was read via OCR — please double-check the extracted fields below.
        </p>
      )}

      {profile && (
        <div className="grid grid-cols-2 gap-4 bg-white/5 border border-white/10 rounded-xl p-6">
          {[
            ["full_name", "Full name"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["location", "Location"],
            ["headline", "Headline"],
            ["current_ctc", "Current CTC"],
            ["expected_ctc", "Expected CTC"],
            ["notice_period", "Notice period"],
          ].map(([field, label]) => (
            <label key={field} className="text-sm text-white/70 space-y-1">
              <span>{label}</span>
              <input
                value={profile[field] || ""}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </label>
          ))}
          <div className="col-span-2">
            <button
              onClick={handleSave}
              className="rounded-lg bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-sm font-medium"
            >
              Save
            </button>
          </div>

          {profile.skills_json?.length > 0 && (
            <div className="col-span-2 text-sm text-white/70">
              <p className="mb-2">Skills (from résumé)</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills_json.map((skill) => (
                  <span key={skill} className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
