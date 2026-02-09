# Technical Resources

## Morphological Analyzers & APIs

### Sanskrit Heritage Site (Gérard Huet)
- **URL:** https://sanskrit.inria.fr/
- **What:** Comprehensive Sanskrit morphological analyzer
- **API:** Has a CGI interface, may need to wrap
- **Pros:** Highly accurate, well-maintained, Paninian approach
- **Cons:** Not a REST API, may need scraping or local install
- **Source:** https://gitlab.inria.fr/huet/Heritage_Platform

### Digital Corpus of Sanskrit (DCS)
- **URL:** http://www.sanskrit-linguistics.org/dcs/
- **What:** Large tagged corpus of Sanskrit texts
- **Pros:** Pre-analyzed texts, sentence examples
- **Cons:** Academic access, may have usage restrictions

### Sanskrit Dictionary API
- **URL:** https://www.sanskritdictionary.com/
- **What:** Multiple dictionary lookups
- **Pros:** Simple API, multiple dictionaries
- **Cons:** Dictionary only, no morphological analysis

### Ashtadhyayi.com
- **URL:** https://ashtadhyayi.com/
- **What:** Paninian grammar reference
- **Pros:** Rule-based, comprehensive
- **Cons:** Reference tool, not an API

### Sanskrit Parser (Open Source)
- **URL:** https://github.com/kmadathil/sanskrit_parser
- **What:** Python-based Sanskrit parser
- **Pros:** Open source, can run locally
- **Cons:** May need backend server

### Vidyut (Rust-based)
- **URL:** https://github.com/ambuda-org/vidyut
- **What:** Fast Sanskrit toolkit in Rust
- **Pros:** Very fast, WASM-compatible (could run in extension!)
- **Cons:** Newer, less battle-tested

## Declension Tables

### Declension Data Sources
- Sanskrit grammar textbooks (digitized)
- Wikisource Sanskrit grammar pages
- Generate programmatically from stem + pattern rules

### Standard Paradigms
Need data for:
- अ-stem masculine (राम pattern)
- अ-stem neuter (फल pattern)
- आ-stem feminine (रमा pattern)
- इ-stem (कवि, मति patterns)
- उ-stem (गुरु, धेनु patterns)
- Consonant stems (various)
- Pronouns (irregular)
- Verbs (10 classes × tenses × persons)

## Chrome Extension Development

### Manifest V3 Resources
- https://developer.chrome.com/docs/extensions/mv3/intro/
- https://developer.chrome.com/docs/extensions/mv3/content_scripts/

### Similar Extensions to Study
- Google Translate extension (hover behavior)
- Language Learning with Netflix (in-context learning)
- Readlang (word saving, definitions)
- Zhongwen Chinese Popup Dictionary (hover dictionary)

### UI Libraries (lightweight)
- Preact (3kb React alternative)
- Lit (web components)
- Vanilla JS + CSS (smallest bundle)

## Sanskrit Text Detection

### Unicode Ranges
- Devanagari: U+0900 to U+097F
- Vedic Extensions: U+1CD0 to U+1CFF
- Devanagari Extended: U+A8E0 to U+A8FF

### IAST Detection
- Diacritics: ā ī ū ṛ ṝ ḷ ḹ ṅ ñ ṭ ḍ ṇ ś ṣ ḥ ṃ
- Pattern matching needed

## Transliteration

### Libraries
- Sanscript.js - https://github.com/sanskrit/sanscript.js
- Aksharamukha - https://aksharamukha.appspot.com/

### Schemes to Support
- Devanagari (primary)
- IAST (academic standard)
- Harvard-Kyoto (ASCII-safe)
- Velthuis (ASCII-safe)

## Corpus for Examples (Phase 3)

### Public Domain Texts
- Bhagavad Gita
- Ramayana
- Mahabharata
- Upanishads
- Panchtantra
- Hitopadesha

### Sources
- GRETIL (Göttingen Register of Electronic Texts in Indian Languages)
- Wikisource Sanskrit
- Sacred-texts.com (public domain)

## Research Papers

### Computational Sanskrit
- "Sanskrit Computational Linguistics" symposium papers
- Gerard Huet's papers on Sanskrit morphology
- DCS methodology papers

## Learning Resources (for context)

- Sanskrit grammar by Thomas Egenes
- "A Sanskrit Grammar for Students" by A.A. Macdonell
- Panini's Ashtadhyayi (the source)
