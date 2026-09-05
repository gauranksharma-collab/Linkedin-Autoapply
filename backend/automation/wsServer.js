const { WebSocketServer } = require("ws");
const { parse } = require("url");
const { consumeTicket } = require("../utils/wsTickets");
const browserPool = require("./browserPool");
const { startScreencast, stopScreencast, applyInput } = require("./remoteView");
const { isLinkedInLoggedInUrl } = require("./linkedinStatus");

function attachWsServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const { pathname, query } = parse(req.url, true);
    if (pathname !== "/ws/browser") {
      socket.destroy();
      return;
    }

    const userId = consumeTicket(query.ticket);
    if (!userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, userId);
    });
  });

  wss.on("connection", async (ws, userId) => {
    browserPool.attachViewer(userId);
    let cdp = null;

    const send = (payload) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
    };

    try {
      const page = await browserPool.getPage(userId);

      if (!page.url().startsWith("https://www.linkedin.com")) {
        await page
          .goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 15000 })
          .catch((err) => send({ type: "error", message: `Navigation failed: ${err.message}` }));
      }

      cdp = await startScreencast(page, (data) => send({ type: "frame", data }));
      send({ type: "status", loggedIn: isLinkedInLoggedInUrl(page.url()) });

      // Input is processed as a strict FIFO queue so concurrent async handlers
      // never race on the same Playwright page (which caused clicks to land
      // out of order relative to the mousemove that preceded them). A flood of
      // mousemove events would otherwise back up behind that queue, so any
      // not-yet-processed mousemove is replaced in place rather than piling up
      // — mousedown/mouseup/keys always keep their own queue slot.
      const queue = [];
      let pendingMoveIndex = -1;
      let processing = false;

      async function processQueue() {
        if (processing) return;
        processing = true;
        while (queue.length) {
          const msg = queue.shift();
          if (pendingMoveIndex === 0) pendingMoveIndex = -1;
          else if (pendingMoveIndex > 0) pendingMoveIndex -= 1;
          try {
            await applyInput(page, msg);
          } catch (err) {
            send({ type: "error", message: err.message });
          }
        }
        processing = false;
      }

      ws.on("message", (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg.type === "ping") {
          send({ type: "pong" });
          return;
        }
        browserPool.touch(userId);

        if (msg.type === "mousemove") {
          if (pendingMoveIndex !== -1) {
            queue[pendingMoveIndex] = msg;
            return;
          }
          pendingMoveIndex = queue.length;
        }
        queue.push(msg);
        processQueue();
      });
    } catch (err) {
      send({ type: "error", message: err.message });
      ws.close();
      return;
    }

    ws.on("close", async () => {
      browserPool.detachViewer(userId);
      if (cdp) await stopScreencast(cdp);
    });
  });

  return wss;
}

module.exports = { attachWsServer };
