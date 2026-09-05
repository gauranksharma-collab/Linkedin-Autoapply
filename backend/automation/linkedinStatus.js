function isLinkedInLoggedInUrl(url) {
  if (!url || !url.startsWith("https://www.linkedin.com")) return false;
  return !/\/(login|checkpoint|authwall)/.test(url);
}

module.exports = { isLinkedInLoggedInUrl };
