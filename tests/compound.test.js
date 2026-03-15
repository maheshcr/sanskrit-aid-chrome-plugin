import { describe, it, expect } from 'vitest';
import {
  parseSplitsResponse,
  hasNoTags,
  buildCompoundHtml,
} from '../extension/content/compound.js';

// ---------------------------------------------------------------------------
// parseSplitsResponse
//
// Documents the expected API shape from sanskrit_parser /v1/splits/{word}:
//   { input: string, splits: string[][] }
// splits[0] is the top-ranked decomposition; each element is a Devanagari word.
// ---------------------------------------------------------------------------

describe('parseSplitsResponse', () => {
  it('extracts the first (top-ranked) split for a 3-part compound', () => {
    // Real-world example: वाल्मीकिमुनिपुङ्गवम् → [वाल्मीकि, मुनि, पुङ्गवम्]
    const apiResponse = {
      input: 'वाल्मीकिमुनिपुङ्गवम्',
      splits: [['वाल्मीकि', 'मुनि', 'पुङ्गवम्']],
    };
    expect(parseSplitsResponse(apiResponse)).toEqual(['वाल्मीकि', 'मुनि', 'पुङ्गवम्']);
  });

  it('extracts the first split for a 2-part compound', () => {
    // नरेन्द्र → नर (man) + इन्द्र (lord) via vowel sandhi a+i→e
    const apiResponse = {
      input: 'नरेन्द्रः',
      splits: [['नर', 'इन्द्रः']],
    };
    expect(parseSplitsResponse(apiResponse)).toEqual(['नर', 'इन्द्रः']);
  });

  it('returns only the first split when multiple alternatives exist', () => {
    // The API may return several possible decompositions; we take the best one.
    const apiResponse = {
      input: 'नरेन्द्रः',
      splits: [
        ['नर', 'इन्द्रः'],       // best split
        ['नरेन्द्र', 'ः'],        // unlikely alternative
      ],
    };
    expect(parseSplitsResponse(apiResponse)).toEqual(['नर', 'इन्द्रः']);
  });

  it('returns null for a simple (non-compound) word — single-element split', () => {
    // A plain word like रामः cannot be split further; the API returns one element.
    const apiResponse = {
      input: 'रामः',
      splits: [['रामः']],
    };
    expect(parseSplitsResponse(apiResponse)).toBeNull();
  });

  it('returns null when the splits array is empty', () => {
    expect(parseSplitsResponse({ input: 'xyz', splits: [] })).toBeNull();
  });

  it('returns null when the response contains an API error', () => {
    expect(parseSplitsResponse({ error: 'API error: 503' })).toBeNull();
  });

  it('returns null when data is null (network failure or API unavailable)', () => {
    expect(parseSplitsResponse(null)).toBeNull();
  });

  it('returns null when data is undefined', () => {
    expect(parseSplitsResponse(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hasNoTags
//
// Guards the splits fallback: only attempt splits when tags analysis is empty.
// ---------------------------------------------------------------------------

describe('hasNoTags', () => {
  it('returns true when analysis is null — API returned nothing', () => {
    expect(hasNoTags(null)).toBe(true);
  });

  it('returns true when the tags array is empty — word not recognized', () => {
    expect(hasNoTags({ tags: [] })).toBe(true);
  });

  it('returns false when the analysis has at least one tag set', () => {
    // Typical tags response: [[stem, [tag1, tag2, ...]], ...]
    const analysis = {
      tags: [['राम', ['पुंल्लिङ्गम्', 'प्रथमाविभक्तिः', 'एकवचनम्']]],
    };
    expect(hasNoTags(analysis)).toBe(false);
  });

  it('returns false even when multiple alternative analyses are present', () => {
    const analysis = {
      tags: [
        ['सीता', ['स्त्रीलिङ्गम्', 'प्रथमाविभक्तिः', 'एकवचनम्']],
        ['सीत', ['पुंल्लिङ्गम्', 'द्वितीयाविभक्तिः', 'बहुवचनम्']],
      ],
    };
    expect(hasNoTags(analysis)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildCompoundHtml
//
// Verifies the HTML structure produced for a compound breakdown panel.
// Tests use string assertions; no DOM dependency needed for HTML-as-string.
// ---------------------------------------------------------------------------

describe('buildCompoundHtml', () => {
  it('displays the original unsplit word', () => {
    const html = buildCompoundHtml('नरेन्द्रः', ['नर', 'इन्द्रः']);
    expect(html).toContain('नरेन्द्रः');
  });

  it('renders each component as a clickable button with a data-word attribute', () => {
    const html = buildCompoundHtml('नरेन्द्रः', ['नर', 'इन्द्रः']);
    expect(html).toContain('<button class="sanskrit-compound-part" data-word="नर">नर</button>');
    expect(html).toContain('<button class="sanskrit-compound-part" data-word="इन्द्रः">इन्द्रः</button>');
  });

  it('includes all three components for a 3-part compound', () => {
    const html = buildCompoundHtml('वाल्मीकिमुनिपुङ्गवम्', ['वाल्मीकि', 'मुनि', 'पुङ्गवम्']);
    expect(html).toContain('data-word="वाल्मीकि"');
    expect(html).toContain('data-word="मुनि"');
    expect(html).toContain('data-word="पुङ्गवम्"');
  });

  it('includes the Sanskrit label (समास) to identify the compound type', () => {
    const html = buildCompoundHtml('नरेन्द्रः', ['नर', 'इन्द्रः']);
    expect(html).toContain('समास');
  });

  it('separates components with a + sign', () => {
    const html = buildCompoundHtml('नरेन्द्रः', ['नर', 'इन्द्रः']);
    expect(html).toContain('+');
  });

  it('includes a hint prompting the user to click for sub-analysis', () => {
    const html = buildCompoundHtml('नरेन्द्रः', ['नर', 'इन्द्रः']);
    expect(html).toContain('Click a component');
  });
});
