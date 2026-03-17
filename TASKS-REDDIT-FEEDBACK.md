# Sanskrit Learner Plugin — Reddit Feedback Tasks

Date: 2026-03-05
Source: r/sanskrit community feedback on the plugin post

## Context

The plugin was shared on Reddit r/sanskrit and received positive reception with actionable feedback. This doc captures the tasks to address in a focused CC session.

## Task 1: Sandhi Splitting Integration (HIGH PRIORITY)

**Problem:** Compound/sandhi-joined words return "No analysis available for this word."

**Failing test case — Ramayana 1.1.1:**
```
तपस्वाध्यायनिरतं तपस्वी वाग्विदां वरम् ।
नारदं परिपप्रच्छ वाल्मीकिर्मुनिपुङ्गवम् ।।1.1.1।।
```

Three words fail:
- `तपस्वाध्यायनिरतं` — compound: तपस् + स्वाध्याय + निरतम्
- `परिपप्रच्छ` — verb with prefix: परि + पप्रच्छ (perfect tense of प्रच्छ्)
- `वाल्मीकिर्मुनिपुङ्गवम्` — compound with visarga sandhi: वाल्मीकिः + मुनिपुङ्गवम्

**User suggestion:** Use [Dharmamitra API](https://dharmamitra.org) for sandhi splitting.

**What to do:**
1. Research the Dharmamitra API — endpoints, rate limits, response format
2. Also evaluate: Sanskrit Heritage Site splitter (`https://sanskrit.inria.fr/cgi-bin/SKT/sktgraph.cgi`) which is already referenced in `host_permissions` via `sanskrit-parser.appspot.com`
3. Implement a sandhi splitting step before word lookup:
   - User selects/hovers a word
   - If direct lookup fails, attempt sandhi split
   - Display split components with individual analyses
4. Test with the Ramayana 1.1.1 shloka as the validation case
5. Consider caching split results to avoid repeated API calls

**Current code path:** `extension/content/content.js` handles word selection. `extension/content/declension.js` does the lookup against `extension/data/declensions-bundle.json`. The failure happens when the word isn't in the bundle — no fallback exists.

**Files likely to change:**
- `extension/content/content.js` — add sandhi split fallback
- `extension/background/service-worker.js` — API calls go through service worker
- `extension/manifest.json` — add Dharmamitra to `host_permissions`
- Possibly new: `extension/content/sandhi.js` — sandhi splitting module

## Task 2: Chrome Web Store Submission (MEDIUM PRIORITY)

**Signal:** User asked in Sanskrit "कदा तत् जालविपणेन आलभ्येत्?" (When will it be on the web store?) — 3 upvotes.

**What to do:**
1. Review Chrome Web Store developer requirements
2. Prepare store listing:
   - Description (English + Sanskrit?)
   - Screenshots showing the plugin in action
   - Privacy policy (extension uses `activeTab`, `storage`, makes API calls)
3. Create proper icons if current ones are placeholders (check `extension/icons/`)
4. Ensure manifest.json meets CWS requirements
5. Submit for review

**Blocker:** Probably want sandhi splitting working first — the current "No analysis available" for common words is a bad first impression.

## Task 3: Firefox Support (MEDIUM PRIORITY)

**Signal:** "Does it work on अग्निजम्बुकः (firefox)?" — 8 upvotes, from a Top 1% poster. Also +1 for Brave browser.

**What to do:**
1. Audit Manifest V3 compatibility with Firefox (Firefox supports MV3 since v109)
2. Key differences to check:
   - `service_worker` → Firefox uses `background.scripts` (or supports service workers in recent versions)
   - `host_permissions` handling
   - `web_accessible_resources` format
3. Options:
   - **Option A:** Single codebase with browser polyfill (`webextension-polyfill`)
   - **Option B:** Separate Firefox manifest with build script
4. Test on Firefox Developer Edition
5. Submit to Firefox Add-ons (addons.mozilla.org)

**Brave note:** Brave is Chromium-based — the Chrome extension likely works already. Verify by loading unpacked in Brave. If it works, mention Brave compatibility in the store listing.

## Task 4: Test Suite for the Failing Cases

Before fixing, create a test harness so we can verify:

```
Test input: तपस्वाध्यायनिरतं
Expected: splits into तपस् + स्वाध्याय + निरतम्, each analyzed

Test input: परिपप्रच्छ
Expected: identified as परि + प्रच्छ् (perfect tense, 3rd person singular)

Test input: वाल्मीकिर्मुनिपुङ्गवम्
Expected: splits into वाल्मीकिः + मुनिपुङ्गवम्, each analyzed
```

## Priority Order

1. **Sandhi splitting** — fixes the core product gap, highest user-reported pain
2. **Test with Ramayana 1.1.1** — concrete validation
3. **Chrome Web Store** — reduces friction for new users
4. **Firefox port** — expands reach

## Reference

- Project: `/Users/maheshcr/Projects/sanskrit-aid-chrome-plugin/`
- Vault project file: `Projects/sanskrit-learner-plugin.md` (has full feedback log)
- Dharmamitra: https://dharmamitra.org
- Reddit thread: check browser history for the r/sanskrit post URL
