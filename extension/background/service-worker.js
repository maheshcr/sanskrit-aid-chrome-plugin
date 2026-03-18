// Service worker for Sanskrit Aid extension
// Handles API proxying to sanskrit_parser and Dharmamitra (CORS workaround) and caching

const API_BASE = 'https://sanskrit-parser.appspot.com/sanskrit_parser/v1';
const DHARMAMITRA_API = 'https://dharmamitra.org/api/tagging/';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Devanagari to IAST transliteration (needed for Dharmamitra API)
const DEVA_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ṅ',
  'च': 'c', 'छ': 'ch', 'ज': 'j', 'झ': 'jh', 'ञ': 'ñ',
  'ट': 'ṭ', 'ठ': 'ṭh', 'ड': 'ḍ', 'ढ': 'ḍh', 'ण': 'ṇ',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'ś', 'ष': 'ṣ', 'स': 's', 'ह': 'h'
};
const DEVA_VOWELS = {
  'अ': 'a', 'आ': 'ā', 'इ': 'i', 'ई': 'ī', 'उ': 'u', 'ऊ': 'ū',
  'ऋ': 'ṛ', 'ॠ': 'ṝ', 'ऌ': 'ḷ', 'ॡ': 'ḹ',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
};
const DEVA_MARKS = {
  'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū',
  'ृ': 'ṛ', 'ॄ': 'ṝ', 'ॢ': 'ḷ', 'ॣ': 'ḹ',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'ṃ', 'ः': 'ḥ', 'ँ': 'm̐'
};
const VIRAMA = '्';

function devanagariToIAST(text) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // Two-char independent vowels (आ, ई, ऊ, ऐ, औ, etc.)
    const twoChar = text.slice(i, i + 2);
    if (DEVA_VOWELS[twoChar]) {
      result += DEVA_VOWELS[twoChar];
      i += 2;
    } else if (DEVA_VOWELS[ch]) {
      result += DEVA_VOWELS[ch];
      i += 1;
    } else if (DEVA_CONSONANTS[ch]) {
      result += DEVA_CONSONANTS[ch];
      // Check what follows
      if (i + 1 < text.length) {
        const next = text[i + 1];
        if (next === VIRAMA) {
          // Virama: no vowel
          i += 2;
        } else if (DEVA_MARKS[next]) {
          result += DEVA_MARKS[next];
          i += 2;
        } else {
          // Inherent 'a'
          result += 'a';
          i += 1;
        }
      } else {
        result += 'a';
        i += 1;
      }
    } else if (DEVA_MARKS[ch]) {
      result += DEVA_MARKS[ch];
      i += 1;
    } else {
      result += ch;
      i += 1;
    }
  }
  return result;
}

// IAST to Devanagari (for converting Dharmamitra response back)
const IAST_CONSONANTS = Object.fromEntries(
  Object.entries(DEVA_CONSONANTS).map(([d, i]) => [i, d])
);
const IAST_VOWELS = Object.fromEntries(
  Object.entries(DEVA_VOWELS).map(([d, i]) => [i, d])
);
const IAST_MARKS_REV = {
  'ā': 'ा', 'i': 'ि', 'ī': 'ी', 'u': 'ु', 'ū': 'ू',
  'ṛ': 'ृ', 'ṝ': 'ॄ', 'ḷ': 'ॢ', 'ḹ': 'ॣ',
  'e': 'े', 'ai': 'ै', 'o': 'ो', 'au': 'ौ'
};
const IAST_VOWEL_SET = new Set(Object.keys(IAST_VOWELS));
const IAST_CONS_KEYS = Object.keys(IAST_CONSONANTS).sort((a, b) => b.length - a.length);
const IAST_VOWEL_KEYS = Object.keys(IAST_VOWELS).sort((a, b) => b.length - a.length);
const IAST_MARK_KEYS = Object.keys(IAST_MARKS_REV).sort((a, b) => b.length - a.length);

function iastToDevanagari(text) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    // Try consonants (longest match first)
    let matched = false;
    for (const key of IAST_CONS_KEYS) {
      if (text.startsWith(key, i)) {
        result += IAST_CONSONANTS[key];
        i += key.length;
        // Check for vowel mark or virama
        let vowelFound = false;
        for (const vk of IAST_MARK_KEYS) {
          if (text.startsWith(vk, i)) {
            result += IAST_MARKS_REV[vk];
            i += vk.length;
            vowelFound = true;
            break;
          }
        }
        if (!vowelFound) {
          if (text[i] === 'a') {
            // Inherent 'a' — skip
            i += 1;
          } else {
            // No vowel follows — add virama
            result += VIRAMA;
          }
        }
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Try independent vowels
    for (const vk of IAST_VOWEL_KEYS) {
      if (text.startsWith(vk, i)) {
        result += IAST_VOWELS[vk];
        i += vk.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Special characters
    if (text[i] === 'ṃ' || text.startsWith('ṃ', i)) {
      result += 'ं';
      i += 1;
    } else if (text[i] === 'ḥ' || text.startsWith('ḥ', i)) {
      result += 'ः';
      i += 1;
    } else {
      result += text[i];
      i += 1;
    }
  }
  return result;
}

// In-memory cache for API responses
const cache = new Map();

/**
 * Get cached response if valid
 * @param {string} key - Cache key
 * @returns {Object|null} - Cached data or null
 */
function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  if (cached) {
    cache.delete(key); // Remove stale entry
  }
  return null;
}

/**
 * Store response in cache
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 */
function setCache(key, data) {
  // Limit cache size to prevent memory issues
  if (cache.size > 1000) {
    // Remove oldest entries
    const keysToDelete = Array.from(cache.keys()).slice(0, 500);
    keysToDelete.forEach(k => cache.delete(k));
  }
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch grammatical tags for a word
 * @param {string} word - Word in Devanagari or SLP1
 * @returns {Promise<Object>} - API response
 */
async function fetchTags(word) {
  const cacheKey = `tags:${word}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  try {
    const url = `${API_BASE}/tags/${encodeURIComponent(word)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return { error: error.message };
  }
}

/**
 * Fetch sandhi splits for a word
 * @param {string} word - Word in Devanagari or SLP1
 * @returns {Promise<Object>} - API response
 */
async function fetchSplits(word) {
  const cacheKey = `splits:${word}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  try {
    const url = `${API_BASE}/splits/${encodeURIComponent(word)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Failed to fetch splits:', error);
    return { error: error.message };
  }
}

/**
 * Fetch compound/sandhi splits from Dharmamitra API
 * Takes Devanagari input, converts to IAST, returns Devanagari components
 */
async function fetchDharmamitraSplits(word) {
  const cacheKey = `dharmamitra:${word}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  try {
    const iast = devanagariToIAST(word);
    const response = await fetch(DHARMAMITRA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: [iast],
        mode: 'unsandhied',
        input_encoding: 'iast',
        human_readable_tags: true
      })
    });

    if (!response.ok) {
      throw new Error(`Dharmamitra API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse underscore-delimited response into components
    // Response format: {"results": ["tapaḥ_svādhyāya_niratam_"]}
    const splits = [];
    if (data.results && data.results.length > 0) {
      const segmented = data.results[0];
      // Skip if response starts with 'R ' (error indicator) or is all underscores
      if (!segmented.startsWith('R ') && segmented.replace(/_/g, '').length > 0) {
        const iastComponents = segmented.split('_').filter(s => s.length > 0);
        if (iastComponents.length > 1) {
          // Convert each IAST component back to Devanagari
          const devaComponents = iastComponents.map(c => iastToDevanagari(c));
          splits.push(devaComponents);
        }
      }
    }

    const result = { input: word, splits, source: 'dharmamitra' };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Failed to fetch Dharmamitra splits:', error);
    return { error: error.message };
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_TAGS') {
    fetchTags(message.word)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'FETCH_SPLITS') {
    fetchSplits(message.word)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === 'FETCH_DHARMAMITRA_SPLITS') {
    fetchDharmamitraSplits(message.word)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(['enabled', 'theme'], (result) => {
      sendResponse({
        enabled: result.enabled !== false, // Default to true
        theme: result.theme || 'light'
      });
    });
    return true;
  }

  if (message.type === 'SET_SETTINGS') {
    chrome.storage.sync.set(message.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'CLEAR_CACHE') {
    cache.clear();
    sendResponse({ success: true, message: 'Cache cleared' });
    return true;
  }
});

// Log when service worker starts
console.log('Sanskrit Aid service worker initialized');
