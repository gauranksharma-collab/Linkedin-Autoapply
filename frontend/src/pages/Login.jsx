import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-white/5 border border-white/10 rounded-xl p-8">
        <h1 className="text-xl font-semibold text-white">Log in</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        <p className="text-sm text-white/50 text-center">
          No account? <Link to="/register" className="text-white hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
