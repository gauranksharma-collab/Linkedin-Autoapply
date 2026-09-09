import { useEffect, useRef, useState } from "react";
import { api, wsBase } from "../api/client";

const VIEWPORT = { width: 1280, height: 800 };
const MOUSEMOVE_THROTTLE_MS = 30;

export default function RemoteBrowserView({ onStatus }) {
  const imgRef = useRef(null);
  const wsRef = useRef(null);
  const lastMoveSentRef = useRef(0);
  const [frameUrl, setFrameUrl] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(null); // { xPct, yPct } in display space
  const [pressed, setPressed] = useState(false);
  const [isTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );

  useEffect(() => {
    let closed = false;

    async function connect() {
      try {
        const { data } = await api.post("/browser/session");
        if (closed) return;
        const ws = new WebSocket(`${wsBase}${data.wsPath}`);
        wsRef.current = ws;

        ws.onopen = () => setStatus("connected");
        ws.onclose = () => setStatus("closed");
        ws.onerror = () => setStatus("error");
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "frame") {
            setFrameUrl(`data:image/jpeg;base64,${msg.data}`);
          } else if (msg.type === "status") {
            onStatus?.(msg.loggedIn);
          } else if (msg.type === "error") {
            setStatus(`error: ${msg.message}`);
          }
        };
      } catch {
        setStatus("failed to start session");
      }
    }

    connect();
    return () => {
      closed = true;
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(payload) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }

  function toViewportCoords(e) {
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * VIEWPORT.width),
      y: Math.round(((e.clientY - rect.top) / rect.height) * VIEWPORT.height),
    };
  }

  function handleMouseMove(e) {
    const rect = imgRef.current.getBoundingClientRect();
    // Update the local cursor overlay on every event — instant, no network round trip.
    // Skipped on touch devices: taps synthesize a mousemove at the tap point, which would
    // otherwise leave a stray cursor icon on screen with no real mouse to move it away.
    if (!isTouch) {
      setCursor({
        xPct: ((e.clientX - rect.left) / rect.width) * 100,
        yPct: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }

    // Throttle what actually goes over the wire so a flood of mousemove events
    // can't back up behind mousedown/mouseup/keys on the server.
    const now = performance.now();
    if (now - lastMoveSentRef.current < MOUSEMOVE_THROTTLE_MS) return;
    lastMoveSentRef.current = now;
    send({ type: "mousemove", ...toViewportCoords(e) });
  }

  function handleMouseDown(e) {
    send({ type: "mousedown", ...toViewportCoords(e), button: "left" });
    setPressed(true);
    setFocused(true);
  }

  function handleMouseUp(e) {
    send({ type: "mouseup", ...toViewportCoords(e), button: "left" });
    setPressed(false);
  }

  function handleWheel(e) {
    send({ type: "wheel", deltaX: e.deltaX, deltaY: e.deltaY });
  }

  useEffect(() => {
    if (!focused) return undefined;

    function handleKeyDown(e) {
      e.preventDefault();
      send({ type: "keydown", key: e.key });
    }
    function handleKeyUp(e) {
      e.preventDefault();
      send({ type: "keyup", key: e.key });
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-white/60">
        <span>Status: {status}</span>
        {focused && <span className="text-blue-400">Live — typed keys go to LinkedIn</span>}
      </div>

      <div className="rounded-lg bg-yellow-500/10 text-yellow-400 text-xs px-3 py-2">
        Use your LinkedIn email + password below — the "Continue with Google" / "Sign in with
        Apple" buttons won't work here. Google and Apple block OAuth sign-in from automated or
        embedded browser sessions as a security measure, regardless of who's actually typing.
      </div>

      <div
        className="relative w-full aspect-[16/10] bg-black rounded-xl overflow-hidden border border-white/10"
        tabIndex={-1}
        onBlur={() => setFocused(false)}
      >
        {frameUrl ? (
          <img
            ref={imgRef}
            src={frameUrl}
            alt="LinkedIn live view"
            className="w-full h-full select-none cursor-none"
            draggable={false}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setCursor(null)}
            onWheel={handleWheel}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
            Connecting to your browser session...
          </div>
        )}

        {cursor && (
          <div
            className="pointer-events-none absolute -translate-x-0.5 -translate-y-0.5"
            style={{ left: `${cursor.xPct}%`, top: `${cursor.yPct}%` }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              className={`drop-shadow transition-transform ${pressed ? "scale-90" : ""}`}
            >
              <path
                d="M2 1 L2 18 L6.5 14.5 L9.5 20.5 L12 19.3 L9 13.3 L15 13 Z"
                fill={pressed ? "#3b82f6" : "white"}
                stroke="black"
                strokeWidth="1"
              />
            </svg>
          </div>
        )}
      </div>
      <p className="text-xs text-white/40">
        This is your own isolated browser running on the server. Log in exactly as you normally
        would — your password goes straight into LinkedIn's page, never through this app.
      </p>
    </div>
  );
}
