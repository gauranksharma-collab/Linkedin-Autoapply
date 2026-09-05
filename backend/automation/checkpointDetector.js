const { checkpoint } = require("./selectors");

class CheckpointDetectedError extends Error {}

// A CAPTCHA "challenge" iframe (the actual interactive puzzle, src containing
// bframe/challenge) blocks progress and must halt the run. A plain "anchor"
// checkbox widget or an invisible v3/enterprise scoring badge does NOT — those
// sit passively on all kinds of ordinary pages (their src also happens to
// contain "captcha" as a substring of "recaptcha") and would otherwise trip
// this on nearly every page load.
async function hasActiveCaptchaChallenge(page) {
  const frames = await page
    .locator('iframe[src*="captcha"][src*="bframe"], iframe[src*="captcha"][src*="challenge"]')
    .all();

  for (const frame of frames) {
    const visible = await frame.isVisible().catch(() => false);
    if (!visible) continue;
    const box = await frame.boundingBox().catch(() => null);
    if (box && box.width > 50 && box.height > 50) return true;
  }
  return false;
}

async function assertNoCheckpoint(page) {
  const url = page.url();
  if (checkpoint.urlPatterns.some((pattern) => pattern.test(url))) {
    throw new CheckpointDetectedError(`Checkpoint URL detected: ${url}`);
  }

  if (await hasActiveCaptchaChallenge(page)) {
    throw new CheckpointDetectedError("Active CAPTCHA challenge detected");
  }

  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (checkpoint.textPatterns.some((pattern) => pattern.test(bodyText))) {
    throw new CheckpointDetectedError("Checkpoint text detected on page");
  }
}

module.exports = { assertNoCheckpoint, CheckpointDetectedError };
