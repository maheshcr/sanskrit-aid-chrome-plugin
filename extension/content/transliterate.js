// Transliteration utility for SLP1 <-> Devanagari conversion
// SLP1 is a lossless ASCII encoding for Sanskrit, used by many APIs

const SLP1_TO_DEVANAGARI = {
  // Independent vowels
  'a': 'अ', 'A': 'आ', 'i': 'इ', 'I': 'ई', 'u': 'उ', 'U': 'ऊ',
  'f': 'ऋ', 'F': 'ॠ', 'x': 'ऌ', 'X': 'ॡ',
  'e': 'ए', 'E': 'ऐ', 'o': 'ओ', 'O': 'औ',
  // Consonants
  'k': 'क', 'K': 'ख', 'g': 'ग', 'G': 'घ', 'N': 'ङ',
  'c': 'च', 'C': 'छ', 'j': 'ज', 'J': 'झ', 'Y': 'ञ',
  'w': 'ट', 'W': 'ठ', 'q': 'ड', 'Q': 'ढ', 'R': 'ण',
  't': 'त', 'T': 'थ', 'd': 'द', 'D': 'ध', 'n': 'न',
  'p': 'प', 'P': 'फ', 'b': 'ब', 'B': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व',
  'S': 'श', 'z': 'ष', 's': 'स', 'h': 'ह',
  // Anusvara, Visarga, Chandrabindu
  'M': 'ं', 'H': 'ः', '~': 'ँ',
  // Punctuation
  "'": 'ऽ', '.': '।', '..': '॥'
};

const VOWEL_MARKS = {
  'A': 'ा', 'i': 'ि', 'I': 'ी', 'u': 'ु', 'U': 'ू',
  'f': 'ृ', 'F': 'ॄ', 'x': 'ॢ', 'X': 'ॣ',
  'e': 'े', 'E': 'ै', 'o': 'ो', 'O': 'ौ'
};

const VIRAMA = '्';

const CONSONANTS = new Set([
  'k', 'K', 'g', 'G', 'N',
  'c', 'C', 'j', 'J', 'Y',
  'w', 'W', 'q', 'Q', 'R',
  't', 'T', 'd', 'D', 'n',
  'p', 'P', 'b', 'B', 'm',
  'y', 'r', 'l', 'v',
  'S', 'z', 's', 'h'
]);

const VOWELS = new Set(['a', 'A', 'i', 'I', 'u', 'U', 'f', 'F', 'x', 'X', 'e', 'E', 'o', 'O']);

// Build reverse mapping for Devanagari to SLP1
const DEVANAGARI_TO_SLP1 = {};

// Independent vowels
for (const [slp1, dev] of Object.entries(SLP1_TO_DEVANAGARI)) {
  DEVANAGARI_TO_SLP1[dev] = slp1;
}

// Vowel marks
for (const [slp1, dev] of Object.entries(VOWEL_MARKS)) {
  DEVANAGARI_TO_SLP1[dev] = slp1;
}

// Virama
DEVANAGARI_TO_SLP1[VIRAMA] = '';

// Add numbers
const DEVANAGARI_DIGITS = '०१२३४५६७८९';
const ASCII_DIGITS = '0123456789';
for (let i = 0; i < 10; i++) {
  DEVANAGARI_TO_SLP1[DEVANAGARI_DIGITS[i]] = ASCII_DIGITS[i];
}

/**
 * Convert SLP1 text to Devanagari
 * @param {string} slp1 - Text in SLP1 encoding
 * @returns {string} - Text in Devanagari script
 */
function slp1ToDevanagari(slp1) {
  if (!slp1) return '';

  let result = '';
  let i = 0;
  let prevWasConsonant = false;

  while (i < slp1.length) {
    const char = slp1[i];

    // Check for double-dot punctuation
    if (char === '.' && i + 1 < slp1.length && slp1[i + 1] === '.') {
      result += '॥';
      i += 2;
      prevWasConsonant = false;
      continue;
    }

    if (CONSONANTS.has(char)) {
      // It's a consonant
      result += SLP1_TO_DEVANAGARI[char];

      // Look ahead for vowel
      if (i + 1 < slp1.length) {
        const next = slp1[i + 1];
        if (next === 'a') {
          // Inherent 'a' - no mark needed
          i += 2;
        } else if (VOWEL_MARKS[next]) {
          // Vowel mark needed
          result += VOWEL_MARKS[next];
          i += 2;
        } else {
          // Consonant followed by non-vowel - add virama
          result += VIRAMA;
          i += 1;
        }
      } else {
        // End of string - add virama
        result += VIRAMA;
        i += 1;
      }
      prevWasConsonant = true;
    } else if (VOWELS.has(char)) {
      // Independent vowel at start of word or after vowel
      result += SLP1_TO_DEVANAGARI[char];
      i += 1;
      prevWasConsonant = false;
    } else if (SLP1_TO_DEVANAGARI[char]) {
      // Anusvara, visarga, or punctuation
      result += SLP1_TO_DEVANAGARI[char];
      i += 1;
      prevWasConsonant = false;
    } else if (/\d/.test(char)) {
      // Convert ASCII digit to Devanagari digit
      result += DEVANAGARI_DIGITS[parseInt(char)];
      i += 1;
      prevWasConsonant = false;
    } else {
      // Pass through other characters (spaces, etc.)
      result += char;
      i += 1;
      prevWasConsonant = false;
    }
  }

  return result;
}

/**
 * Convert Devanagari text to SLP1
 * @param {string} devanagari - Text in Devanagari script
 * @returns {string} - Text in SLP1 encoding
 */
function devanagariToSlp1(devanagari) {
  if (!devanagari) return '';

  let result = '';
  let i = 0;
  let prevWasConsonant = false;

  while (i < devanagari.length) {
    const char = devanagari[i];

    if (DEVANAGARI_TO_SLP1[char] !== undefined) {
      const slp1 = DEVANAGARI_TO_SLP1[char];

      // Check if this is a consonant (has SLP1 mapping and is in consonants range)
      const isConsonant = char >= 'क' && char <= 'ह';

      if (isConsonant) {
        result += slp1;

        // Look ahead for virama or vowel mark
        if (i + 1 < devanagari.length) {
          const next = devanagari[i + 1];
          if (next === VIRAMA) {
            // Explicit virama - no inherent 'a'
            i += 2;
          } else if (DEVANAGARI_TO_SLP1[next] !== undefined && isVowelMark(next)) {
            // Vowel mark follows
            result += DEVANAGARI_TO_SLP1[next];
            i += 2;
          } else {
            // No virama, no vowel mark - inherent 'a'
            result += 'a';
            i += 1;
          }
        } else {
          // End of string - inherent 'a'
          result += 'a';
          i += 1;
        }
        prevWasConsonant = true;
      } else if (slp1 === '') {
        // Virama - skip (handled above)
        i += 1;
      } else {
        // Independent vowel, anusvara, visarga, etc.
        result += slp1;
        i += 1;
        prevWasConsonant = false;
      }
    } else {
      // Pass through other characters
      result += char;
      i += 1;
      prevWasConsonant = false;
    }
  }

  return result;
}

/**
 * Check if a Devanagari character is a vowel mark (matra)
 */
function isVowelMark(char) {
  const code = char.charCodeAt(0);
  // Devanagari vowel signs range: U+093E to U+094C, plus U+0962-U+0963
  return (code >= 0x093E && code <= 0x094C) || (code >= 0x0962 && code <= 0x0963);
}

/**
 * Check if text contains Devanagari characters
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains Devanagari
 */
function containsDevanagari(text) {
  if (!text) return false;
  // Devanagari Unicode range: U+0900 to U+097F
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Extract only Devanagari words from text
 * @param {string} text - Text containing mixed content
 * @returns {string[]} - Array of Devanagari words
 */
function extractDevanagariWords(text) {
  if (!text) return [];
  // Match sequences of Devanagari characters (including vowel signs, anusvara, visarga)
  const matches = text.match(/[\u0900-\u097F]+/g);
  return matches || [];
}

/**
 * Clean a Devanagari word by removing punctuation
 * @param {string} word - Devanagari word possibly with punctuation
 * @returns {string} - Cleaned word
 */
function cleanDevanagariWord(word) {
  if (!word) return '';
  // Remove Devanagari punctuation (danda, double danda) and common punctuation
  return word.replace(/[।॥\s,.;:!?'"()[\]{}]/g, '').trim();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    slp1ToDevanagari,
    devanagariToSlp1,
    containsDevanagari,
    extractDevanagariWords,
    cleanDevanagariWord
  };
}

// Make available globally for content script
window.SanskritTransliterate = {
  slp1ToDevanagari,
  devanagariToSlp1,
  containsDevanagari,
  extractDevanagariWords,
  cleanDevanagariWord
};
