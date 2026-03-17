import { describe, it, expect, beforeAll } from 'vitest';

// Mock window before importing
globalThis.window = globalThis.window || {};

const {
  slp1ToDevanagari,
  devanagariToSlp1,
  containsDevanagari,
  extractDevanagariWords,
  cleanDevanagariWord
} = await import('../extension/content/transliterate.js');

describe('SLP1 <-> Devanagari transliteration', () => {
  it('converts rAmaH to रामः', () => {
    expect(slp1ToDevanagari('rAmaH')).toBe('रामः');
  });

  it('converts rAma to राम', () => {
    expect(slp1ToDevanagari('rAma')).toBe('राम');
  });

  it('round-trips Devanagari -> SLP1 -> Devanagari', () => {
    const original = 'नारदं';
    const slp1 = devanagariToSlp1(original);
    const back = slp1ToDevanagari(slp1);
    expect(back).toBe(original);
  });

  it('handles visarga correctly', () => {
    expect(slp1ToDevanagari('rAmaH')).toBe('रामः');
    expect(devanagariToSlp1('रामः')).toBe('rAmaH');
  });

  it('handles anusvara correctly', () => {
    expect(slp1ToDevanagari('nAradaM')).toBe('नारदं');
  });

  it('handles conjuncts/virama', () => {
    const result = slp1ToDevanagari('tapas');
    expect(result).toBe('तपस्');
  });
});

describe('Devanagari detection', () => {
  it('detects Devanagari in mixed text', () => {
    expect(containsDevanagari('Hello रामः world')).toBe(true);
  });

  it('returns false for pure ASCII', () => {
    expect(containsDevanagari('Hello world')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(containsDevanagari('')).toBe(false);
  });
});

describe('Devanagari word extraction', () => {
  it('extracts words from mixed text', () => {
    const words = extractDevanagariWords('Rama said रामः वनं गच्छति to Sita');
    expect(words).toEqual(['रामः', 'वनं', 'गच्छति']);
  });

  it('returns empty array for no Devanagari', () => {
    expect(extractDevanagariWords('Hello world')).toEqual([]);
  });
});

describe('Devanagari word cleaning', () => {
  it('removes dandas', () => {
    expect(cleanDevanagariWord('रामः।')).toBe('रामः');
  });

  it('removes double dandas', () => {
    expect(cleanDevanagariWord('गच्छति॥')).toBe('गच्छति');
  });

  it('handles empty input', () => {
    expect(cleanDevanagariWord('')).toBe('');
    expect(cleanDevanagariWord(null)).toBe('');
  });
});
