import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function QuestionBank() {
  const [entries, setEntries] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  function load() {
    api.get("/question-bank").then((res) => setEntries(res.data));
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!question || !answer) return;
    await api.post("/question-bank", { question, answer, inputType: "text" });
    setQuestion("");
    setAnswer("");
    load();
  }

  async function handleUpdate(id, newAnswer) {
    await api.put(`/question-bank/${id}`, { answer: newAnswer });
    load();
  }

  async function handleDelete(id) {
    await api.delete(`/question-bank/${id}`);
    load();
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-semibold text-white">Question Bank</h1>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question (e.g. Current CTC)"
          className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Answer"
          className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <button type="submit" className="rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 text-sm font-medium">
          Add
        </button>
      </form>

      <div className="space-y-2">
        {entries.length === 0 && <p className="text-sm text-white/40">No saved answers yet.</p>}
        {entries.map((entry) => (
          <div key={entry._id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div className="flex-1">
              <p className="text-sm text-white">{entry.question_original}</p>
              <p className="text-xs text-white/40">used {entry.times_used}x</p>
            </div>
            <input
              defaultValue={entry.answer}
              onBlur={(e) => e.target.value !== entry.answer && handleUpdate(entry._id, e.target.value)}
              className="w-40 rounded-lg bg-white/10 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-white/30"
            />
            <button onClick={() => handleDelete(entry._id)} className="text-xs text-white/40 hover:text-red-400 transition-colors">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
