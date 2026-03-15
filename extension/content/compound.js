/**
 * Utilities for compound word (समास) analysis and display.
 *
 * Pure functions — no Chrome API or DOM dependencies.
 * Kept separate so they can be unit-tested directly.
 */

/**
 * Extracts the best (first) split from a sanskrit_parser /v1/splits response.
 *
 * Expected API shape:
 *   { input: string, splits: string[][] }
 * where splits[0] is the top-ranked decomposition.
 *
 * Returns null when:
 *  - the API returned an error or an unexpected shape
 *  - the word is not a compound (single-element or empty split)
 *
 * @param {object} data  Raw API response
 * @returns {string[]|null}  Component words, or null
 */
export function parseSplitsResponse(data) {
  if (!data || data.error) return null;
  if (!Array.isArray(data.splits) || data.splits.length === 0) return null;
  const best = data.splits[0];
  if (!Array.isArray(best) || best.length < 2) return null;
  return best;
}

/**
 * Returns true when an analysis result has no usable grammatical tags.
 * Used to decide whether to fall back to split-based compound analysis.
 *
 * @param {object|null} analysis  Result of FETCH_TAGS
 * @returns {boolean}
 */
export function hasNoTags(analysis) {
  return !analysis || !analysis.tags || analysis.tags.length === 0;
}

/**
 * Builds the HTML snippet for a compound word breakdown panel.
 *
 * Each component is rendered as a <button> with a data-word attribute so the
 * caller can attach re-analysis click handlers without coupling this function
 * to the DOM.
 *
 * @param {string}   word        The original (unsplit) Devanagari word
 * @param {string[]} components  Component words from parseSplitsResponse
 * @returns {string}  HTML string safe for innerHTML assignment
 */
export function buildCompoundHtml(word, components) {
  const parts = components
    .map(c => `<button class="sanskrit-compound-part" data-word="${c}">${c}</button>`)
    .join('<span class="sanskrit-compound-sep"> + </span>');

  return (
    `<div class="sanskrit-word">${word}</div>` +
    `<div class="sanskrit-compound-label">Compound word (समास)</div>` +
    `<div class="sanskrit-compound-parts">${parts}</div>` +
    `<p class="sanskrit-note">Click a component to analyze it individually.</p>`
  );
}
