import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function PendingQuestions() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(null);

  function load() {
    api.get("/pending-questions").then((res) => setQuestions(res.data));
  }

  useEffect(load, []);

  async function handleAnswer(id) {
    const answer = answers[id];
    if (!answer) return;
    setSubmitting(id);
    try {
      await api.post(`/pending-questions/${id}/answer`, { answer });
      load();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-semibold text-white">Pending Questions</h1>
      <p className="text-sm text-white/50">
        These are new application questions we haven't seen before. Answer once and it's saved for
        next time.
      </p>

      <div className="space-y-3">
        {questions.length === 0 && <p className="text-sm text-white/40">Nothing waiting on you right now.</p>}
        {questions.map((q) => (
          <div key={q._id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-white text-sm">{q.question_original}</p>
            <div className="flex gap-2">
              <input
                value={answers[q._id] || ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q._id]: e.target.value }))}
                placeholder="Your answer"
                className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
              <button
                onClick={() => handleAnswer(q._id)}
                disabled={submitting === q._id}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting === q._id ? "Saving..." : "Answer & continue"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
