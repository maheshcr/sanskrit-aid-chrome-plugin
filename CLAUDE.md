# Sanskrit Learner Chrome Plugin

A Chrome extension for Sanskrit learners that provides word-level analysis, declension families, and grammatical relationship visualization.

## Project Vision

**Core Insight:** Don't just teach the specific declension in context - show its family. Learner sees the word in its full paradigm.

Current Sanskrit learning tools are dictionary-focused. Missing: paradigm awareness, grammatical context visualization. The language's regularity (Paninian grammar) makes systematic display possible and valuable.

## Development Phases

### Phase 1: Word-Level Analysis (MVP)
On hover/select of a Sanskrit word, popup shows:
- Word breakdown (sandhi splitting if compound)
- Gender (लिङ्ग)
- Number (वचन) - singular/dual/plural
- Case (विभक्ति)
- Suffix and prefix variations
- **The word's declension family** - all related forms, not just current

### Phase 2: Sentence-Level Graph View
- Transformer-style attention visualization
- How surrounding words are impacted by declensions
- Grammatical relationships (कारक relations)
- Which words agree in gender/number/case

### Phase 3: Sentence Families
- Example sentences for each declension variation
- "Sentence families" organized by paradigm
- Builds intuition for usage patterns

## Technical Stack (To Decide)

### Chrome Extension
- Manifest V3 (required for new extensions)
- Content script for page interaction
- Popup UI for analysis display
- Consider: React/Preact or vanilla JS

### Backend Options
1. **Use Existing APIs** (faster to MVP)
   - Sanskrit Heritage Site API
   - Sanskrit Dictionary API

2. **Build Own Engine** (more control)
   - Ashtadhyayi-based rule engine
   - ML-based morphological analyzer

### Key Technical Challenges
- Sandhi splitting (compound word analysis)
- Morphological analysis accuracy
- Performance on page with many Sanskrit words
- Devanagari + IAST transliteration support

## Project Structure

```
sanskrit-aid-chrome-plugin/
├── CLAUDE.md           # This file - project context
├── docs/
│   ├── PROJECT.md      # Detailed project spec
│   ├── BRAINSTORM.md   # Original ideas and vision
│   └── RESOURCES.md    # APIs, tools, references
├── extension/          # Chrome extension code
│   ├── manifest.json
│   ├── content/        # Content scripts
│   ├── popup/          # Popup UI
│   ├── background/     # Service worker
│   └── styles/
├── server/             # Optional backend (if needed)
└── tests/
```

## Development Workflow

1. Research phase: Evaluate existing morphological analyzers
2. Prototype: Basic word hover with API integration
3. MVP: Phase 1 complete with declension families
4. Iterate: Add visualization features

## Commands

```bash
# Development
npm run dev           # Watch mode for extension
npm run build         # Production build

# Testing
npm test              # Run tests
npm run test:e2e      # Extension E2E tests

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer Mode
# 3. Load unpacked -> select extension/ folder
```

## Key Decisions Needed

- [ ] Backend approach: Use existing API vs build own
- [ ] UI framework: React/Preact vs vanilla JS
- [ ] Transliteration: Support IAST, Devanagari, or both?
- [ ] Data source for declension tables
- [ ] Monetization model (if any)

## Resources

See `docs/RESOURCES.md` for:
- Sanskrit Heritage Site (Gérard Huet)
- Digital Corpus of Sanskrit (DCS)
- Ashtadhyayi resources
- Existing Chrome extensions to study

## Notes for Claude Code

- Owner (Mahesh) is a Sanskrit learner himself - build for personal use first
- This connects to broader goal of accessing ancient texts in original language
- Keep MVP focused - word analysis + declension family display
- Consider accessibility of popup UI
- Devanagari font rendering matters
