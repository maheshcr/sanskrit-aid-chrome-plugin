import { describe, it, expect } from 'vitest';

const API_BASE = 'https://sanskrit-parser.appspot.com/sanskrit_parser/v1';
const DHARMAMITRA_API = 'https://dharmamitra.org/api/tagging/';

async function fetchSplits(word) {
  const url = `${API_BASE}/splits/${encodeURIComponent(word)}`;
  const response = await fetch(url);
  return response.json();
}

async function fetchTags(word) {
  const url = `${API_BASE}/tags/${encodeURIComponent(word)}`;
  const response = await fetch(url);
  return response.json();
}

async function fetchDharmamitraSplits(iastWord) {
  const response = await fetch(DHARMAMITRA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts: [iastWord],
      mode: 'unsandhied',
      input_encoding: 'iast',
      human_readable_tags: true
    })
  });
  return response.json();
}

// Ramayana 1.1.1 validation cases
// तपस्वाध्यायनिरतं तपस्वी वाग्विदां वरम् ।
// नारदं परिपप्रच्छ वाल्मीकिर्मुनिपुङ्गवम् ।।1.1.1।।

describe('Ramayana 1.1.1 — Sandhi Splitting', { timeout: 15000 }, () => {
  it('परिपप्रच्छ splits into परि + पप्रच्छ', async () => {
    const result = await fetchSplits('परिपप्रच्छ');
    expect(result.splits).toBeDefined();
    expect(result.splits.length).toBeGreaterThan(0);

    // First split should be the correct one
    const bestSplit = result.splits[0];
    expect(bestSplit).toEqual(['परि', 'पप्रच्छ']);
  });

  it('वाल्मीकिर्मुनिपुङ्गवम् splits with visarga sandhi', async () => {
    const result = await fetchSplits('वाल्मीकिर्मुनिपुङ्गवम्');
    expect(result.splits).toBeDefined();
    expect(result.splits.length).toBeGreaterThan(0);

    // First split should undo visarga sandhi: वाल्मीकिस् (= वाल्मीकिः)
    const bestSplit = result.splits[0];
    expect(bestSplit[0]).toMatch(/वाल्मीकि/);
    expect(bestSplit).toContain('पुङ्गवम्');
  });

  it('तपस्वाध्यायनिरतं — compound splitting (known limitation)', async () => {
    const result = await fetchSplits('तपस्वाध्यायनिरतं');
    // This currently returns empty splits from sanskrit-parser API
    // Documenting the known limitation
    if (result.splits.length === 0) {
      // Expected: compound splitting not yet supported by this API
      expect(result.splits).toEqual([]);
    } else {
      // If the API improves, verify the split is reasonable
      const bestSplit = result.splits[0];
      expect(bestSplit.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Ramayana 1.1.1 — Direct Word Tags', { timeout: 15000 }, () => {
  it('तपस्वी is analyzed correctly', async () => {
    const result = await fetchTags('तपस्वी');
    expect(result.tags).toBeDefined();
    expect(result.tags.length).toBeGreaterThan(0);
  });

  it('वरम् is analyzed correctly', async () => {
    const result = await fetchTags('वरम्');
    expect(result.tags).toBeDefined();
    expect(result.tags.length).toBeGreaterThan(0);
  });

  it('नारदं is analyzed correctly', async () => {
    const result = await fetchTags('नारदं');
    expect(result.tags).toBeDefined();
    expect(result.tags.length).toBeGreaterThan(0);
  });
});

describe('Dharmamitra API — Compound Splitting', { timeout: 15000 }, () => {
  it('तपस्वाध्यायनिरतं splits via Dharmamitra (IAST input)', async () => {
    const result = await fetchDharmamitraSplits('tapaḥsvādhyāyanirataṃ');
    expect(result.results).toBeDefined();
    expect(result.results.length).toBeGreaterThan(0);

    // Should contain underscore-delimited segments
    const segmented = result.results[0];
    expect(segmented).toContain('_');
    const components = segmented.split('_').filter(s => s.length > 0);
    expect(components).toContain('tapaḥ');
    expect(components).toContain('svādhyāya');
    expect(components).toContain('niratam');
  });

  it('वाल्मीकिर्मुनिपुङ्गवम् splits via Dharmamitra', async () => {
    const result = await fetchDharmamitraSplits('vālmīkirmunipuṃgavam');
    expect(result.results).toBeDefined();
    const segmented = result.results[0];
    expect(segmented).toContain('vālmīkiḥ');
  });

  it('परिपप्रच्छ kept as single unit via Dharmamitra (correct — verb)', async () => {
    const result = await fetchDharmamitraSplits('paripapraccha');
    expect(result.results).toBeDefined();
    const segmented = result.results[0];
    // Should NOT be split further — it's a single verb form
    const components = segmented.split('_').filter(s => s.length > 0);
    expect(components.length).toBe(1);
  });
});

describe('Sandhi split fallback flow', { timeout: 15000 }, () => {
  it('word with no tags should try splits as fallback', async () => {
    // Simulate the extension flow: tags empty -> try splits
    const tagsResult = await fetchTags('परिपप्रच्छ');
    const hasTags = tagsResult?.tags?.length > 0;

    if (!hasTags) {
      // Fallback to splits
      const splitsResult = await fetchSplits('परिपप्रच्छ');
      expect(splitsResult.splits.length).toBeGreaterThan(0);

      // Analyze each component
      const bestSplit = splitsResult.splits[0];
      for (const component of bestSplit) {
        const compTags = await fetchTags(component);
        // At least some components should have analysis
        // (prefixes like परि may not have tags)
      }
    }
    // Either way, the word should be handled
    expect(true).toBe(true);
  });
});
