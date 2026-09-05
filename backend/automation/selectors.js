function jobSearchUrl({ keywords, location, easyApplyOnly }) {
  const params = new URLSearchParams();
  if (keywords) params.set("keywords", keywords);
  if (location) params.set("location", location);
  if (easyApplyOnly) params.set("f_AL", "true");
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

module.exports = {
  jobSearchUrl,
  jobCard: "div.job-card-container, li.jobs-search-results__list-item, div.base-card",
  jobCardLinkHref: "a[href*='/jobs/view/']",
  jobTitle: ".job-card-list__title, .base-search-card__title, .artdeco-entity-lockup__title",
  jobCompany:
    ".job-card-container__primary-description, .base-search-card__subtitle, .artdeco-entity-lockup__subtitle",
  jobLocation: ".job-card-container__metadata-wrapper, .job-search-card__location",
  // Verified against real LinkedIn markup: Easy Apply cards carry LinkedIn's
  // own "bug" icon next to the footer "Apply" text; external-apply cards show
  // plain "Apply" with no such icon.
  easyApplyBadge: 'svg[data-test-icon="linkedin-bug-color-small"]',
  nextPageButton: 'button[aria-label="Next"]',
  // Verified against a real job page: the apply control is an <a>, not a
  // <button>, with no stable CSS class — only this aria-label is consistent.
  easyApplyButton: 'a[aria-label*="LinkedIn Apply" i]',
  nextButton: 'button:has-text("Next")',
  reviewButton: 'button:has-text("Review")',
  submitButton: 'button:has-text("Submit application")',
  checkpoint: {
    urlPatterns: [/\/checkpoint\//, /\/authwall/, /\/uas\/login/],
    textPatterns: [
      /unusual activity/i,
      /security check/i,
      /verify your identity/i,
      /let'?s do a quick security check/i,
      /confirm you'?re a human/i,
    ],
  },
};
