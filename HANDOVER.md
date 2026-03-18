# Handover — Sanskrit Aid Chrome Plugin

**Session date:** 2026-03-17 to 2026-03-18
**Session focus:** TTS accent fix, release prep, branding

## What Was Done

### TTS Accent Fix (Issue #1, closed)
- **Root cause 1:** Model loaded without explicit `torch_dtype` — defaulted to float16 on ZeroGPU, degrading voice quality
- **Root cause 2:** Voice descriptions were generic English prompts. indic-parler-tts uses named Indian speakers (Aryan for Sanskrit, 99.79% NSS)
- **Fix:** Added `torch_dtype=torch.float32` + switched to named speaker presets in `server/hf-space/app.py`
- **Deployed:** HF Space redeployed via `huggingface_hub` Python API
- **Cache purge:** 854 stale audio files deleted from R2 via temporary Worker endpoint

### Audio Playback UX Fix
- **Problem:** No visual feedback during audio fetch — users double-clicked, heard audio twice
- **Fix:** Three distinct button states: idle (speaker icon) -> loading (spinner, pointer-events: none) -> playing (solid orange pause, click to stop)
- **Files:** `extension/content/content.js`, `extension/styles/content.css`

### Usage Analytics (Worker-side)
- Added anonymous aggregate counters to CF Worker using R2 daily stats files (`stats/YYYY-MM-DD.json`)
- Tracks: requests, hits, misses, hit rate, unique new words per day
- Uses `ctx.waitUntil()` so stats writes don't block responses
- No user identifiers — privacy policy remains honest
- Dashboard: `curl https://sanskrit-tts.mahesh-cr.workers.dev/stats`

### Branding: Sanskrit Learner -> Sanskrit Aid
- Renamed across all 13 files (23 occurrences)
- manifest.json, popup, feedback form, content script, service worker, README, privacy policy, store listing, CLAUDE.md

### New Icon
- Replaced solid orange placeholder with Om symbol on saffron gradient
- Edge-to-edge design (no baked-in rounded corners — Chrome applies its own masking)
- Generated via image-gen MCP, resized to 16/48/128px

### Extension Hardening
- `chrome.runtime?.sendMessage` guard on all three message-passing functions
- Shows "Extension was updated. Please refresh this page." instead of TypeError crash
- Removed all debug `console.log` statements from content.js

### Release Prep
- **Privacy policy:** `docs/PRIVACY-POLICY.md` (contact: hello@maheshcr.com)
- **Store listing:** `docs/STORE-LISTING.md` (title, short desc, detailed desc, tags)
- **Demo video:** `docs/images/SanskritAid-Demo-Final.mp4` (35.8s, 1.8MB, title card + demo + outro, background music with ducking)
- **README GIF:** `docs/images/SanskritAid-Demo.gif` (8s sandhi split segment)
- **TTS fix writeup:** `docs/TTS-ACCENT-FIX.md` (blog/Twitter source material)
- Version bumped to 0.2.0

### v0.2.0 Commit (b46f390)
All features committed and pushed:
- Sandhi splitting (sanskrit-parser + Dharmamitra two-tier fallback)
- Audio playback with loading/playing/stop UX
- Feedback form with local storage and JSON export
- Vidyut-generated declension bundle (120 paradigms, 1722 forms)
- CF Worker + R2 cache + HF Space TTS pipeline
- Test suite (31 tests, all passing)

## What Remains

### Chrome Web Store Submission
- [ ] Register developer account ($5 one-time)
- [ ] Host privacy policy at public URL (GitHub raw or personal blog)
- [ ] Take store-format screenshots (1280x800 or 640x400)
- [ ] Package extension as .zip (`cd extension && zip -r ../sanskrit-aid.zip .`)
- [ ] Submit for review

### Content / Marketing
- [ ] Blog post (source: `docs/TTS-ACCENT-FIX.md`)
- [ ] Twitter announcement (video: `docs/images/SanskritAid-Demo-Final.mp4`)
- [ ] Reddit r/sanskrit update post
- [ ] Demo video also suitable for YouTube short

### Future Features (from TASKS-REDDIT-FEEDBACK.md)
- [ ] Firefox / Brave support
- [ ] Verb conjugation tables
- [ ] Sentence-level grammatical visualization
- [ ] Batch TTS pre-generation (script ready: `server/batch_generate_audio.py`)

## Key URLs
- **GitHub:** github.com/maheshcr/sanskrit-aid-chrome-plugin
- **CF Worker:** https://sanskrit-tts.mahesh-cr.workers.dev
- **HF Space:** https://huggingface.co/spaces/maheshcr/sanskrit-tts
- **Stats:** https://sanskrit-tts.mahesh-cr.workers.dev/stats

## Auth Notes
- Wrangler: authenticated via `wrangler login` (OAuth, browser-based)
- HuggingFace: authenticated via `huggingface_hub` (token stored in system keychain)
- No API tokens stored in files
