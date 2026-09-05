import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/linkedin", label: "LinkedIn" },
  { to: "/questions", label: "Question Bank" },
  { to: "/pending", label: "Pending" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-white">LinkedIn Auto-Apply</span>
        <div className="flex gap-4 text-sm">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `hover:text-white transition-colors ${isActive ? "text-white" : "text-white/50"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-white/60">
        <span>{user?.email}</span>
        <button onClick={logout} className="hover:text-white transition-colors">
          Log out
        </button>
      </div>
    </nav>
  );
}
