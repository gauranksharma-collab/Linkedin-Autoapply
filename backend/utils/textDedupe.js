// LinkedIn duplicates text for screen readers (a visually hidden span sitting
// right next to the visible one), which Playwright's innerText() concatenates
// into one "Foo Foo" string — sometimes with extra badge text appended after
// the second copy (e.g. "Foo Foo with verification"). Detect a repeated
// leading word-run and keep just the first copy.
function dedupeRepeatedText(text) {
  const words = text.trim().replace(/\s+/g, " ").split(" ");
  const n = words.length;
  for (let k = Math.floor(n / 2); k >= 2; k -= 1) {
    if (words.slice(0, k).join(" ") === words.slice(k, 2 * k).join(" ")) {
      return words.slice(0, k).join(" ");
    }
  }
  return words.join(" ");
}

module.exports = { dedupeRepeatedText };
