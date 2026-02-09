// Service worker for Sanskrit Learner extension
// Handles API proxying to sanskrit_parser (CORS workaround) and caching

const API_BASE = 'https://sanskrit-parser.appspot.com/sanskrit_parser/v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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
console.log('Sanskrit Learner service worker initialized');
