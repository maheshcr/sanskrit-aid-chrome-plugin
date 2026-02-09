// Content script for Sanskrit Learner extension
// Detects Devanagari text selection and shows analysis popup

console.log('Sanskrit Learner: Content script file loaded');

// State
let popupElement = null;
let isEnabled = true;

/**
 * Check if extension is enabled
 */
async function checkEnabled() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Sanskrit Learner: Could not get settings:', chrome.runtime.lastError.message);
          isEnabled = true; // Default to enabled
          resolve(true);
          return;
        }
        isEnabled = response?.enabled !== false;
        resolve(isEnabled);
      });
    } catch (e) {
      console.warn('Sanskrit Learner: Error checking settings:', e);
      isEnabled = true;
      resolve(true);
    }
  });
}

/**
 * Check if text contains Devanagari characters
 */
function containsDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Clean selected text - extract just the Devanagari word
 */
function cleanSelectedText(text) {
  if (!text) return '';
  // Remove punctuation and whitespace, get first Devanagari word
  const match = text.match(/[\u0900-\u097F]+/);
  return match ? match[0] : '';
}

/**
 * Create the popup element
 */
function createPopup() {
  const popup = document.createElement('div');
  popup.id = 'sanskrit-learner-popup';
  popup.className = 'sanskrit-popup';
  popup.innerHTML = `
    <div class="sanskrit-popup-header">
      <span class="sanskrit-popup-title">Sanskrit Analysis</span>
      <button class="sanskrit-popup-close" aria-label="Close">&times;</button>
    </div>
    <div class="sanskrit-popup-content">
      <div class="sanskrit-loading">Analyzing...</div>
    </div>
  `;

  // Close button handler
  popup.querySelector('.sanskrit-popup-close').addEventListener('click', () => {
    hidePopup();
  });

  document.body.appendChild(popup);
  return popup;
}

/**
 * Position popup near selection
 */
function positionPopup(selection) {
  if (!popupElement) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Calculate position
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 10;

  // Ensure popup stays within viewport
  const popupRect = popupElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (left + popupRect.width > viewportWidth) {
    left = viewportWidth - popupRect.width - 20;
  }
  if (left < 10) left = 10;

  // If popup would go below viewport, show above selection
  if (top + popupRect.height > window.scrollY + viewportHeight) {
    top = rect.top + window.scrollY - popupRect.height - 10;
  }

  popupElement.style.left = `${left}px`;
  popupElement.style.top = `${top}px`;
}

/**
 * Show the popup with analysis
 */
async function showPopup(word, selection) {
  console.log('Sanskrit Learner: showPopup called for:', word);

  if (!popupElement) {
    console.log('Sanskrit Learner: Creating popup element');
    popupElement = createPopup();
  }

  // Show loading state
  const content = popupElement.querySelector('.sanskrit-popup-content');
  content.innerHTML = '<div class="sanskrit-loading">Analyzing...</div>';
  popupElement.classList.add('visible');
  positionPopup(selection);
  console.log('Sanskrit Learner: Popup should now be visible');

  try {
    // Fetch analysis from API
    console.log('Sanskrit Learner: Fetching analysis...');
    const analysis = await analyzeWord(word);
    console.log('Sanskrit Learner: Got analysis:', analysis);
    renderAnalysis(content, word, analysis);
  } catch (error) {
    console.error('Sanskrit Learner: Analysis error:', error);
    content.innerHTML = `
      <div class="sanskrit-error">
        <p>Failed to analyze word</p>
        <p class="sanskrit-error-detail">${error.message}</p>
      </div>
    `;
  }

  // Reposition after content is rendered
  requestAnimationFrame(() => positionPopup(selection));
}

/**
 * Hide the popup
 */
function hidePopup() {
  if (popupElement) {
    popupElement.classList.remove('visible');
  }
}

/**
 * Analyze a word using the API
 */
async function analyzeWord(word) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'FETCH_TAGS', word }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
}

/**
 * Parse API tags to extract grammatical information
 */
function parseGrammaticalInfo(tags) {
  if (!tags || !Array.isArray(tags)) return null;

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

  const info = {};

  for (const tag of tags) {
    const mapped = tagMapping[tag];
    if (mapped) {
      info[mapped.type] = {
        value: mapped.value,
        en: mapped.en,
        sa: mapped.sa
      };
    }
  }

  return Object.keys(info).length > 0 ? info : null;
}

/**
 * Generate declension table HTML
 */
async function generateTableHtml(stem, gender, highlightCase, highlightNumber) {
  // Load declension data
  const dataUrl = chrome.runtime.getURL('data/nominal-endings.json');
  const response = await fetch(dataUrl);
  const data = await response.json();

  // Detect stem type
  const lastChar = stem.slice(-1);
  let stemType = null;

  const endingMap = {
    'अ': { m: 'a_m', n: 'a_n' },
    'आ': { f: 'A_f' },
    'इ': { m: 'i_m', f: 'i_f', n: 'i_n' },
    'उ': { m: 'u_m', n: 'u_n' },
    'ई': { f: 'I_f' },
    'ऊ': { f: 'U_f' }
  };

  if (stem.endsWith('न्')) {
    stemType = gender === 'n' ? 'an_n' : 'an_m';
  } else if (endingMap[lastChar] && endingMap[lastChar][gender]) {
    stemType = endingMap[lastChar][gender];
  } else {
    // Default based on gender
    stemType = gender === 'm' ? 'a_m' : gender === 'n' ? 'a_n' : 'A_f';
  }

  const paradigm = data.paradigms[stemType];
  if (!paradigm) {
    return '<p class="sanskrit-note">Declension table unavailable</p>';
  }

  // Get bare stem
  const stripMap = {
    'a_m': 'अ', 'a_n': 'अ', 'A_f': 'आ',
    'i_m': 'इ', 'i_f': 'इ', 'i_n': 'इ',
    'u_m': 'उ', 'u_n': 'उ',
    'I_f': 'ई', 'U_f': 'ऊ',
    'an_m': 'न्', 'an_n': 'न्'
  };

  let bareStem = stem;
  const toStrip = stripMap[stemType];
  if (toStrip && stem.endsWith(toStrip)) {
    bareStem = stem.slice(0, -toStrip.length);
  }

  // Build table
  const cases = [
    { num: '1', sa: 'प्रथमा', en: 'nom' },
    { num: '2', sa: 'द्वितीया', en: 'acc' },
    { num: '3', sa: 'तृतीया', en: 'ins' },
    { num: '4', sa: 'चतुर्थी', en: 'dat' },
    { num: '5', sa: 'पञ्चमी', en: 'abl' },
    { num: '6', sa: 'षष्ठी', en: 'gen' },
    { num: '7', sa: 'सप्तमी', en: 'loc' },
    { num: '8', sa: 'सम्बोधन', en: 'voc' }
  ];

  let html = `
    <table class="sanskrit-declension-table">
      <thead>
        <tr>
          <th></th>
          <th>एक<br><span class="sanskrit-en">sg</span></th>
          <th>द्वि<br><span class="sanskrit-en">du</span></th>
          <th>बहु<br><span class="sanskrit-en">pl</span></th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const c of cases) {
    html += `<tr>`;
    html += `<th>${c.sa}<br><span class="sanskrit-en">${c.en}</span></th>`;

    for (const n of ['s', 'd', 'p']) {
      const key = `${c.num}${n}`;
      const ending = paradigm.endings[key] || '—';
      const form = bareStem + ending;
      const isHighlighted = c.num === highlightCase && n === highlightNumber;
      const cellClass = isHighlighted ? 'sanskrit-highlight' : '';
      html += `<td class="${cellClass}">${form}</td>`;
    }

    html += `</tr>`;
  }

  html += `</tbody></table>`;
  return html;
}

/**
 * Render analysis results
 */
async function renderAnalysis(container, word, analysis) {
  if (!analysis || !analysis.tags || analysis.tags.length === 0) {
    container.innerHTML = `
      <div class="sanskrit-word">${word}</div>
      <p class="sanskrit-note">No analysis available for this word.</p>
      <p class="sanskrit-hint">Try selecting a different word or check if it's a valid Sanskrit form.</p>
    `;
    return;
  }

  // API returns array of possible analyses: [[stem, [tag1, tag2, ...]], ...]
  const firstAnalysis = analysis.tags[0];
  if (!firstAnalysis || firstAnalysis.length < 2) {
    container.innerHTML = `
      <div class="sanskrit-word">${word}</div>
      <p class="sanskrit-note">Could not parse analysis.</p>
    `;
    return;
  }

  const stem = firstAnalysis[0];
  const tags = firstAnalysis[1];
  const grammarInfo = parseGrammaticalInfo(tags);

  let html = `<div class="sanskrit-word">${word}</div>`;

  if (stem) {
    html += `<div class="sanskrit-stem">Stem: <strong>${stem}</strong></div>`;
  }

  if (grammarInfo) {
    html += `<div class="sanskrit-grammar">`;
    if (grammarInfo.gender) {
      html += `<span class="sanskrit-tag">${grammarInfo.gender.sa} (${grammarInfo.gender.en})</span>`;
    }
    if (grammarInfo.case) {
      html += `<span class="sanskrit-tag">${grammarInfo.case.sa} (${grammarInfo.case.en})</span>`;
    }
    if (grammarInfo.number) {
      html += `<span class="sanskrit-tag">${grammarInfo.number.sa} (${grammarInfo.number.en})</span>`;
    }
    html += `</div>`;

    // Generate declension table if we have gender info
    if (grammarInfo.gender && stem) {
      const highlightCase = grammarInfo.case?.value;
      const highlightNumber = grammarInfo.number?.value;
      html += `<div class="sanskrit-section-title">Declension Table</div>`;
      html += await generateTableHtml(stem, grammarInfo.gender.value, highlightCase, highlightNumber);
    }
  }

  // Show alternative analyses if available
  if (analysis.tags.length > 1) {
    html += `<div class="sanskrit-alternatives">`;
    html += `<div class="sanskrit-section-title">Alternative analyses (${analysis.tags.length - 1})</div>`;
    html += `<ul class="sanskrit-alt-list">`;
    for (let i = 1; i < Math.min(analysis.tags.length, 4); i++) {
      const alt = analysis.tags[i];
      if (alt && alt.length >= 2) {
        const altTags = alt[1].slice(0, 3).join(', ');
        html += `<li><strong>${alt[0]}</strong>: ${altTags}...</li>`;
      }
    }
    html += `</ul></div>`;
  }

  container.innerHTML = html;
}

/**
 * Handle text selection
 */
function handleSelection() {
  console.log('Sanskrit Learner: handleSelection called, isEnabled:', isEnabled);

  if (!isEnabled) {
    console.log('Sanskrit Learner: Extension is disabled');
    return;
  }

  const selection = window.getSelection();
  const text = selection?.toString()?.trim();
  console.log('Sanskrit Learner: Selected text:', text);

  if (!text || !containsDevanagari(text)) {
    console.log('Sanskrit Learner: No Devanagari text detected');
    return;
  }

  const word = cleanSelectedText(text);
  console.log('Sanskrit Learner: Cleaned word:', word);

  if (word && word.length > 0) {
    console.log('Sanskrit Learner: Showing popup for:', word);
    showPopup(word, selection);
  }
}

/**
 * Handle click outside popup
 */
function handleClickOutside(event) {
  if (popupElement && !popupElement.contains(event.target)) {
    hidePopup();
  }
}

/**
 * Handle escape key
 */
function handleKeydown(event) {
  if (event.key === 'Escape') {
    hidePopup();
  }
}

/**
 * Initialize the content script
 */
async function init() {
  console.log('Sanskrit Learner: Initializing...');

  // Check if enabled
  await checkEnabled();
  console.log('Sanskrit Learner: Enabled status:', isEnabled);

  // Listen for text selection (mouseup after selection)
  document.addEventListener('mouseup', (event) => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      // Don't trigger if clicking inside popup
      if (popupElement && popupElement.contains(event.target)) {
        return;
      }
      handleSelection();
    }, 10);
  });

  // Listen for clicks outside popup
  document.addEventListener('mousedown', handleClickOutside);

  // Listen for escape key
  document.addEventListener('keydown', handleKeydown);

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      isEnabled = changes.enabled.newValue !== false;
      if (!isEnabled) {
        hidePopup();
      }
    }
  });

  console.log('Sanskrit Learner content script initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
