const browserPool = require("./browserPool");
const { assertNoCheckpoint } = require("./checkpointDetector");
const { isLinkedInLoggedInUrl } = require("./linkedinStatus");
const { waitBetweenActions, scrapeCapRemaining } = require("./rateLimiter");
const selectors = require("./selectors");
const JobListing = require("../models/JobListing");
const settingsRepo = require("../models/settingsRepo");
const { dedupeRepeatedText } = require("../utils/textDedupe");

const MAX_SEARCH_PAGES = 5;

function extractJobId(href) {
  const match = href && href.match(/\/jobs\/view\/(\d+)/);
  return match ? match[1] : null;
}

async function scrapeCard(card, searchWasEasyApplyOnly) {
  const linkEl = card.locator(selectors.jobCardLinkHref).first();
  // getAttribute("href") returns the raw HTML attribute, which LinkedIn writes
  // as a relative path ("/jobs/view/123/") — not something page.goto() can
  // navigate to later. The .href DOM property resolves it against the page's
  // origin the way a real click would, giving a proper absolute URL.
  const href = await linkEl.evaluate((el) => el.href).catch(() => null);
  const linkedinJobId = extractJobId(href);
  if (!linkedinJobId) return null;

  const rawTitle = (await card.locator(selectors.jobTitle).first().innerText().catch(() => "")).trim();
  const rawCompany = (await card.locator(selectors.jobCompany).first().innerText().catch(() => "")).trim();
  const rawLocation = (await card.locator(selectors.jobLocation).first().innerText().catch(() => "")).trim();

  // LinkedIn's own f_AL=true search filter already guarantees every result is
  // Easy Apply — trust that over the fragile per-card badge selector, which
  // has been observed to not match LinkedIn's current markup at all.
  const easyApply =
    searchWasEasyApplyOnly || (await card.locator(selectors.easyApplyBadge).count().catch(() => 0)) > 0;

  return {
    linkedin_job_id: linkedinJobId,
    title: rawTitle ? dedupeRepeatedText(rawTitle) : "Untitled",
    company: rawCompany ? dedupeRepeatedText(rawCompany) : "",
    location: rawLocation ? dedupeRepeatedText(rawLocation) : "",
    url: href.split("?")[0],
    easy_apply: easyApply,
  };
}

async function scrapeNewJobs(userId, overrides = {}, onLog = () => {}) {
  const settings = await settingsRepo.getAll(userId);
  const keywords = overrides.keywords ?? settings.search_keywords;
  const location = overrides.location ?? settings.search_location;

  if (!keywords) {
    onLog("No search keywords set — add some in Settings or upload a résumé first");
  }

  const page = await browserPool.getPage(userId);

  if (!isLinkedInLoggedInUrl(page.url())) {
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 15000 });
  }
  if (!isLinkedInLoggedInUrl(page.url())) {
    throw new Error("Not logged into LinkedIn — connect via the live view first");
  }
  await assertNoCheckpoint(page);

  const searchUrl = selectors.jobSearchUrl({ keywords, location, easyApplyOnly: settings.easy_apply_only });
  onLog(`Searching: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await assertNoCheckpoint(page);

  const collected = [];
  let pageIndex = 0;

  while (pageIndex < MAX_SEARCH_PAGES) {
    const remaining = (await scrapeCapRemaining(userId)) - collected.length;
    if (remaining <= 0) break;

    await page.waitForSelector(selectors.jobCard, { timeout: 10000 }).catch(() => {});
    const cards = await page.locator(selectors.jobCard).all();

    if (cards.length === 0 && pageIndex === 0) {
      const pageTitle = await page.title().catch(() => "?");
      onLog(
        `No job cards found on the search results page (page title: "${pageTitle}", url: ${page.url()}). ` +
          "LinkedIn's markup may have changed, or this search genuinely has no results — check the search URL above manually."
      );
      break;
    }

    for (const card of cards) {
      if (collected.length >= remaining) break;
      const job = await scrapeCard(card, settings.easy_apply_only);
      if (job) collected.push(job);
    }

    if (collected.length >= remaining) break;

    const nextButton = page.locator(selectors.nextPageButton).first();
    const hasNext = (await nextButton.count().catch(() => 0)) > 0;
    const enabled = hasNext && (await nextButton.isEnabled().catch(() => false));
    if (!enabled) break;

    await waitBetweenActions(userId);
    await nextButton.click().catch(() => {});
    await assertNoCheckpoint(page);
    pageIndex += 1;
  }

  const scrapedDate = new Date().toISOString().slice(0, 10);
  const saved = [];
  for (const job of collected) {
    const doc = await JobListing.findOneAndUpdate(
      { userId, linkedin_job_id: job.linkedin_job_id },
      { $setOnInsert: { ...job, userId, scraped_date: scrapedDate, scraped_at: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    saved.push(doc);
  }

  return saved;
}

module.exports = { scrapeNewJobs, dedupeRepeatedText };
