// Declension table generator for Sanskrit nominals
// Generates all 24 forms (8 cases × 3 numbers) for a given stem

// Declension data loaded from JSON
let NOMINAL_ENDINGS = null;

/**
 * Load declension data from JSON file
 */
async function loadDeclensionData() {
  if (NOMINAL_ENDINGS) return NOMINAL_ENDINGS;

  try {
    const url = chrome.runtime.getURL('data/nominal-endings.json');
    const response = await fetch(url);
    NOMINAL_ENDINGS = await response.json();
    return NOMINAL_ENDINGS;
  } catch (error) {
    console.error('Failed to load declension data:', error);
    return null;
  }
}

/**
 * Detect the stem type based on the stem ending and gender
 * @param {string} stem - The stem in Devanagari
 * @param {string} gender - 'm', 'f', or 'n'
 * @returns {string|null} - Paradigm key like 'a_m', 'A_f', etc.
 */
function detectStemType(stem, gender) {
  if (!stem || !gender || !NOMINAL_ENDINGS) return null;

  const lastChar = stem.slice(-1);

  // Map ending to possible paradigms
  const endingMap = {
    'अ': { m: 'a_m', n: 'a_n' },
    'आ': { f: 'A_f' },
    'इ': { m: 'i_m', f: 'i_f', n: 'i_n' },
    'उ': { m: 'u_m', n: 'u_n' },
    'ई': { f: 'I_f' },
    'ऊ': { f: 'U_f' },
    'ऋ': { m: 'f_m' }
  };

  // Check for consonant-ending stems (more complex)
  if (stem.endsWith('न्')) {
    return gender === 'n' ? 'an_n' : 'an_m';
  }

  const possibleTypes = endingMap[lastChar];
  if (possibleTypes && possibleTypes[gender]) {
    return possibleTypes[gender];
  }

  // Default to a-stem based on gender (most common)
  if (gender === 'm') return 'a_m';
  if (gender === 'n') return 'a_n';
  if (gender === 'f') return 'A_f';

  return null;
}

/**
 * Get the bare stem by removing the final vowel marker
 * @param {string} stem - Full stem with ending
 * @param {string} stemType - Paradigm type
 * @returns {string} - Bare stem for combining with endings
 */
function getBareStem(stem, stemType) {
  if (!stem || !stemType) return stem;

  // For a-stems, remove final 'अ' character
  // But in Devanagari, the stem might already be bare
  // The API usually returns the stem without the thematic vowel

  // Map of what to strip based on stem type
  const stripMap = {
    'a_m': 'अ',
    'a_n': 'अ',
    'A_f': 'आ',
    'i_m': 'इ',
    'i_f': 'इ',
    'i_n': 'इ',
    'u_m': 'उ',
    'u_n': 'उ',
    'I_f': 'ई',
    'U_f': 'ऊ',
    'f_m': 'ऋ',
    'an_m': 'न्',
    'an_n': 'न्'
  };

  const toStrip = stripMap[stemType];
  if (toStrip && stem.endsWith(toStrip)) {
    return stem.slice(0, -toStrip.length);
  }

  return stem;
}

/**
 * Generate all 24 forms of a noun
 * @param {string} stem - The stem in Devanagari
 * @param {string} gender - 'm', 'f', or 'n'
 * @param {string} [forceParadigm] - Optional specific paradigm to use
 * @returns {Object} - Declension table object
 */
async function generateDeclensionTable(stem, gender, forceParadigm = null) {
  const data = await loadDeclensionData();
  if (!data) {
    return { error: 'Failed to load declension data' };
  }

  const stemType = forceParadigm || detectStemType(stem, gender);
  if (!stemType || !data.paradigms[stemType]) {
    return { error: `Unknown stem type for ${stem} (${gender})` };
  }

  const paradigm = data.paradigms[stemType];
  const bareStem = getBareStem(stem, stemType);

  const table = {
    stem: stem,
    bareStem: bareStem,
    gender: gender,
    genderName: data.genderNames[gender],
    stemType: stemType,
    paradigmName: paradigm.name,
    forms: {},
    caseNames: data.caseNames,
    numberNames: data.numberNames
  };

  // Generate all forms
  const cases = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const numbers = ['s', 'd', 'p'];

  for (const c of cases) {
    table.forms[c] = {};
    for (const n of numbers) {
      const key = `${c}${n}`;
      const ending = paradigm.endings[key];
      if (ending) {
        // Combine bare stem with ending
        table.forms[c][n] = combineWithEnding(bareStem, ending, stemType);
      } else {
        table.forms[c][n] = '—'; // Missing form
      }
    }
  }

  return table;
}

/**
 * Combine stem with ending, handling sandhi rules
 * @param {string} bareStem - Stem without final vowel
 * @param {string} ending - Ending to add
 * @param {string} stemType - Type of stem for special rules
 * @returns {string} - Combined form
 */
function combineWithEnding(bareStem, ending, stemType) {
  if (!bareStem) return ending;
  if (!ending) return bareStem;

  // For most cases, simple concatenation works
  // The endings already include the thematic vowel changes

  // Special handling for a-stems where ending starts with vowel
  if (stemType === 'a_m' || stemType === 'a_n') {
    // Endings already account for the 'a' stem
    return bareStem + ending;
  }

  return bareStem + ending;
}

/**
 * Find which cell in the declension table matches a given form
 * @param {Object} table - Declension table from generateDeclensionTable
 * @param {string} form - The form to find
 * @returns {Object|null} - {case, number} or null if not found
 */
function findFormInTable(table, form) {
  if (!table || !table.forms || !form) return null;

  // Normalize the form (remove any trailing punctuation)
  const normalizedForm = form.replace(/[ः।॥]/g, (m) => m === 'ः' ? 'ः' : '').trim();

  for (const [caseNum, numbers] of Object.entries(table.forms)) {
    for (const [num, cellForm] of Object.entries(numbers)) {
      // Compare, handling visarga variations
      if (cellForm === normalizedForm || cellForm === form) {
        return { case: caseNum, number: num };
      }
    }
  }

  return null;
}

/**
 * Parse API tags to extract grammatical info
 * @param {string[]} tags - Array of Sanskrit grammatical tags
 * @returns {Object} - Parsed info {gender, case, number}
 */
async function parseApiTags(tags) {
  const data = await loadDeclensionData();
  if (!data || !tags) return {};

  const result = {};
  const mapping = data.tagMapping;

  for (const tag of tags) {
    if (mapping[tag]) {
      const value = mapping[tag];
      // Determine what type this is
      if (value === 'm' || value === 'f' || value === 'n') {
        result.gender = value;
      } else if (value === 's' || value === 'd' || value === 'p') {
        result.number = value;
      } else if (/^[1-8]$/.test(value)) {
        result.case = value;
      }
    }
  }

  return result;
}

/**
 * Get human-readable labels for grammatical info
 * @param {Object} info - {gender, case, number}
 * @returns {Object} - Labels in English and Sanskrit
 */
async function getGrammaticalLabels(info) {
  const data = await loadDeclensionData();
  if (!data || !info) return {};

  const labels = {
    en: {},
    sa: {}
  };

  if (info.gender && data.genderNames[info.gender]) {
    labels.en.gender = data.genderNames[info.gender].en;
    labels.sa.gender = data.genderNames[info.gender].sa;
  }

  if (info.case && data.caseNames[info.case]) {
    labels.en.case = data.caseNames[info.case].en;
    labels.sa.case = data.caseNames[info.case].sa;
  }

  if (info.number && data.numberNames[info.number]) {
    labels.en.number = data.numberNames[info.number].en;
    labels.sa.number = data.numberNames[info.number].sa;
  }

  return labels;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadDeclensionData,
    detectStemType,
    generateDeclensionTable,
    findFormInTable,
    parseApiTags,
    getGrammaticalLabels
  };
}

// Make available globally for content script
window.SanskritDeclension = {
  loadDeclensionData,
  detectStemType,
  generateDeclensionTable,
  findFormInTable,
  parseApiTags,
  getGrammaticalLabels
};
