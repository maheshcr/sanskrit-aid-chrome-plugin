# Privacy Policy — Sanskrit Learner Chrome Extension

**Last updated:** 2026-03-17

## Summary

Sanskrit Learner does not collect, store, or transmit any personal data. All user preferences and feedback are stored locally on your device.

## Data the Extension Accesses

### Page Content
The extension reads text on web pages you visit to detect Sanskrit (Devanagari) words when you select them. This text is processed locally in your browser and is never sent to any server, except as described below for word analysis and pronunciation.

### Selected Words
When you select a Sanskrit word, the extension may send it to the following third-party services for analysis:

| Service | Purpose | Data Sent | URL |
|---------|---------|-----------|-----|
| Sanskrit Parser | Sandhi/compound splitting | The selected Sanskrit word | sanskrit-parser.appspot.com |
| Dharmamitra | Deep compound analysis (fallback) | The selected word in IAST transliteration | dharmamitra.org |
| Sanskrit TTS (self-hosted) | Audio pronunciation | The selected word in Devanagari | sanskrit-tts.mahesh-cr.workers.dev |

No personal information, browsing history, URLs, or page content beyond the individual selected word is ever transmitted.

### Audio Pronunciation
When you click the speaker icon, the selected word is sent to our Cloudflare Worker, which either serves a cached audio file or generates one via a HuggingFace Space running the ai4bharat/indic-parler-tts model. Generated audio is cached for future use. Only the Sanskrit word and voice preset name are transmitted — no user identifiers.

## Data Storage

### Local Only
- **Extension preferences** (enabled/disabled state): stored via Chrome's `chrome.storage.local` API, on your device only.
- **Feedback submissions**: stored via `chrome.storage.local` on your device. You can export feedback as JSON or clear it at any time. Feedback is never automatically transmitted anywhere.

### No Accounts, No Tracking
- No user accounts or sign-in required
- No cookies set by the extension
- No analytics, telemetry, or tracking of any kind
- No advertising

## Permissions Explained

| Permission | Why |
|------------|-----|
| `activeTab` | Read selected text on the current page to analyze Sanskrit words |
| `storage` | Save your preferences and feedback locally |
| Host permissions (sanskrit-parser, dharmamitra.org) | Send selected words for grammatical analysis |

## Third-Party Services

The extension relies on these third-party services. Their privacy policies apply to data they receive:

- **Sanskrit Parser** (sanskrit-parser.appspot.com) — Open-source Sanskrit analysis tool
- **Dharmamitra** (dharmamitra.org) — Buddhist Digital Resource Center's Sanskrit analysis API
- **Cloudflare** (workers.dev) — Hosts our TTS caching layer. Subject to [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/)
- **HuggingFace** (hf.space) — Hosts the TTS model. Subject to [HuggingFace's privacy policy](https://huggingface.co/privacy)

## Children's Privacy

This extension does not knowingly collect any information from children under 13.

## Changes

If this policy changes, the updated version will be published in the extension's GitHub repository and the Chrome Web Store listing.

## Contact

For questions about this privacy policy:
- GitHub: [github.com/maheshcr/sanskrit-aid-chrome-plugin](https://github.com/maheshcr/sanskrit-aid-chrome-plugin)
- Email: hello@maheshcr.com
