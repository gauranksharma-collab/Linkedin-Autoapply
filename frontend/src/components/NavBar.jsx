import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `hover:text-white transition-colors ${isActive ? "text-white" : "text-white/50"}`;

  return (
    <nav className="border-b border-white/10">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <span className="font-semibold text-white">LinkedIn Auto-Apply</span>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex gap-4 text-sm">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span>{user?.email}</span>
            <button onClick={logout} className="hover:text-white transition-colors">
              Log out
            </button>
          </div>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-white/70 hover:text-white transition-colors p-2 -mr-2"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 space-y-4 text-sm border-t border-white/10 pt-3">
          <div className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"} className={linkClass} onClick={() => setOpen(false)}>
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center justify-between text-white/60 border-t border-white/10 pt-3">
            <span className="truncate">{user?.email}</span>
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="hover:text-white transition-colors shrink-0"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
