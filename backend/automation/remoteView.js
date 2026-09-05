async function startScreencast(page, onFrame) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 60,
    maxWidth: 1280,
    maxHeight: 800,
    everyNthFrame: 1,
  });

  cdp.on("Page.screencastFrame", async (frame) => {
    onFrame(frame.data);
    try {
      await cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId });
    } catch {
      // session may already be gone (page navigated/closed)
    }
  });

  return cdp;
}

async function stopScreencast(cdp) {
  try {
    await cdp.send("Page.stopScreencast");
  } catch {
    // ignore
  }
  try {
    await cdp.detach();
  } catch {
    // ignore
  }
}

async function applyInput(page, msg) {
  switch (msg.type) {
    case "mousemove":
      await page.mouse.move(msg.x, msg.y);
      break;
    case "mousedown":
      await page.mouse.move(msg.x, msg.y);
      await page.mouse.down({ button: msg.button || "left" });
      break;
    case "mouseup":
      await page.mouse.move(msg.x, msg.y);
      await page.mouse.up({ button: msg.button || "left" });
      break;
    case "wheel":
      await page.mouse.wheel(msg.deltaX || 0, msg.deltaY || 0);
      break;
    case "keydown":
      await page.keyboard.down(msg.key);
      break;
    case "keyup":
      await page.keyboard.up(msg.key);
      break;
    case "insertText":
      await page.keyboard.insertText(msg.text);
      break;
    default:
      break;
  }
}

module.exports = { startScreencast, stopScreencast, applyInput };
