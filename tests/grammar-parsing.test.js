import { describe, it, expect } from 'vitest';

// Extract parseGrammaticalInfo from content.js
// Since content.js isn't modular, we replicate the pure function here for testing
// TODO: Refactor content.js to export pure functions

const tagMapping = {
  'पुंल्लिङ्गम्': { type: 'gender', value: 'm', en: 'masculine', sa: 'पुंल्लिङ्ग' },
  'स्त्रीलिङ्गम्': { type: 'gender', value: 'f', en: 'feminine', sa: 'स्त्रीलिङ्ग' },
  'नपुंसकलिङ्गम्': { type: 'gender', value: 'n', en: 'neuter', sa: 'नपुंसकलिङ्ग' },
  'प्रथमाविभक्तिः': { type: 'case', value: '1', en: 'nominative', sa: 'प्रथमा' },
  'द्वितीयाविभक्तिः': { type: 'case', value: '2', en: 'accusative', sa: 'द्वितीया' },
  'तृतीयाविभक्तिः': { type: 'case', value: '3', en: 'instrumental', sa: 'तृतीया' },
  'चतुर्थीविभक्तिः': { type: 'case', value: '4', en: 'dative', sa: 'चतुर्थी' },
  'पञ्चमीविभक्तिः': { type: 'case', value: '5', en: 'ablative', sa: 'पञ्चमी' },
  'षष्ठीविभक्तिः': { type: 'case', value: '6', en: 'genitive', sa: 'षष्ठी' },
  'सप्तमीविभक्तिः': { type: 'case', value: '7', en: 'locative', sa: 'सप्तमी' },
  'सम्बोधनप्रथमाविभक्तिः': { type: 'case', value: '8', en: 'vocative', sa: 'सम्बोधन' },
  'एकवचनम्': { type: 'number', value: 's', en: 'singular', sa: 'एकवचन' },
  'द्विवचनम्': { type: 'number', value: 'd', en: 'dual', sa: 'द्विवचन' },
  'बहुवचनम्': { type: 'number', value: 'p', en: 'plural', sa: 'बहुवचन' }
};

function parseGrammaticalInfo(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  const info = {};
  for (const tag of tags) {
    const mapped = tagMapping[tag];
    if (mapped) {
      info[mapped.type] = { value: mapped.value, en: mapped.en, sa: mapped.sa };
    }
  }
  return Object.keys(info).length > 0 ? info : null;
}

describe('parseGrammaticalInfo', () => {
  it('parses masculine nominative singular', () => {
    const tags = ['पुंल्लिङ्गम्', 'प्रथमाविभक्तिः', 'एकवचनम्'];
    const result = parseGrammaticalInfo(tags);
    expect(result.gender.value).toBe('m');
    expect(result.gender.en).toBe('masculine');
    expect(result.case.value).toBe('1');
    expect(result.case.en).toBe('nominative');
    expect(result.number.value).toBe('s');
  });

  it('parses feminine accusative plural', () => {
    const tags = ['स्त्रीलिङ्गम्', 'द्वितीयाविभक्तिः', 'बहुवचनम्'];
    const result = parseGrammaticalInfo(tags);
    expect(result.gender.value).toBe('f');
    expect(result.case.value).toBe('2');
    expect(result.number.value).toBe('p');
  });

  it('parses neuter locative dual', () => {
    const tags = ['नपुंसकलिङ्गम्', 'सप्तमीविभक्तिः', 'द्विवचनम्'];
    const result = parseGrammaticalInfo(tags);
    expect(result.gender.value).toBe('n');
    expect(result.case.value).toBe('7');
    expect(result.number.value).toBe('d');
  });

  it('returns null for empty tags', () => {
    expect(parseGrammaticalInfo([])).toBe(null);
  });

  it('returns null for null input', () => {
    expect(parseGrammaticalInfo(null)).toBe(null);
  });

  it('handles partial tags (gender only)', () => {
    const result = parseGrammaticalInfo(['पुंल्लिङ्गम्']);
    expect(result.gender.value).toBe('m');
    expect(result.case).toBeUndefined();
    expect(result.number).toBeUndefined();
  });

  it('ignores unknown tags', () => {
    const tags = ['पुंल्लिङ्गम्', 'unknownTag', 'एकवचनम्'];
    const result = parseGrammaticalInfo(tags);
    expect(result.gender.value).toBe('m');
    expect(result.number.value).toBe('s');
    expect(result.case).toBeUndefined();
  });
});
