// Feedback form for Sanskrit Learner extension
// Stores feedback in chrome.storage.local and allows export

const STORAGE_KEY = 'tester_feedback';

async function loadFeedback() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  return result[STORAGE_KEY] || [];
}

async function saveFeedback(items) {
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

function renderHistory(items) {
  const list = document.getElementById('history-list');
  const count = document.getElementById('count');
  count.textContent = items.length;

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state">No feedback recorded yet. Submit your first report above.</div>';
    return;
  }

  list.innerHTML = items.map((item, i) => {
    const badgeClass = {
      wrong: 'badge-wrong',
      missing: 'badge-missing',
      good: 'badge-good',
      audio: 'badge-audio'
    }[item.type] || 'badge-wrong';

    const badgeLabel = {
      wrong: 'Wrong',
      missing: 'Missing',
      good: 'Correct',
      audio: 'Audio'
    }[item.type] || item.type;

    return `
      <div class="history-item">
        <span class="word">${item.word}</span>
        <span class="badge ${badgeClass}">${badgeLabel}</span>
        ${item.source ? `<div class="meta">${item.source}</div>` : ''}
        ${item.got ? `<div class="issue">Got: ${item.got}</div>` : ''}
        ${item.expected ? `<div class="expected">Expected: ${item.expected}</div>` : ''}
        <div class="meta">${item.tester ? item.tester + ' — ' : ''}${new Date(item.timestamp).toLocaleString()}</div>
      </div>
    `;
  }).reverse().join('');
}

function formatForExport(items) {
  return {
    extension: 'Sanskrit Learner',
    exportDate: new Date().toISOString(),
    feedbackCount: items.length,
    items: items.map(item => ({
      word: item.word,
      source: item.source || null,
      type: item.type,
      extensionShowed: item.got || null,
      expectedResult: item.expected || null,
      tester: item.tester || null,
      timestamp: item.timestamp
    }))
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  let items = await loadFeedback();
  renderHistory(items);

  // Restore tester name from last entry
  if (items.length > 0) {
    const lastName = items[items.length - 1].tester;
    if (lastName) document.getElementById('tester-name').value = lastName;
  }

  document.getElementById('submit-btn').addEventListener('click', async () => {
    const word = document.getElementById('word').value.trim();
    if (!word) {
      document.getElementById('word').focus();
      return;
    }

    const entry = {
      word,
      source: document.getElementById('source').value.trim(),
      type: document.querySelector('input[name="type"]:checked').value,
      got: document.getElementById('got').value.trim(),
      expected: document.getElementById('expected').value.trim(),
      tester: document.getElementById('tester-name').value.trim(),
      timestamp: new Date().toISOString()
    };

    items.push(entry);
    await saveFeedback(items);
    renderHistory(items);

    // Clear form (keep tester name)
    document.getElementById('word').value = '';
    document.getElementById('source').value = '';
    document.getElementById('got').value = '';
    document.getElementById('expected').value = '';
    document.getElementById('word').focus();
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    document.getElementById('word').value = '';
    document.getElementById('source').value = '';
    document.getElementById('got').value = '';
    document.getElementById('expected').value = '';
  });

  document.getElementById('export-btn').addEventListener('click', async () => {
    const data = formatForExport(items);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanskrit-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('copy-btn').addEventListener('click', async () => {
    const data = formatForExport(items);
    const text = items.map(item => {
      let line = `${item.word}`;
      if (item.source) line += ` (${item.source})`;
      line += ` [${item.type}]`;
      if (item.got) line += `\n  Got: ${item.got}`;
      if (item.expected) line += `\n  Expected: ${item.expected}`;
      return line;
    }).join('\n\n');

    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 2000);
  });
});
