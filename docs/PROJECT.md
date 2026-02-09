# Project Specification

## Problem Statement

Current Sanskrit learning tools are dictionary-focused. They help you look up a word, but they don't:
- Show the word in its full paradigm (declension family)
- Visualize grammatical relationships in sentences
- Build intuition for how declensions work across contexts

## Solution

A Chrome extension that transforms any Sanskrit text on the web into a learning environment.

## User Stories

### Phase 1: Word Analysis
- As a learner, when I hover over a Sanskrit word, I see its grammatical breakdown
- As a learner, I see the full declension table for the word's stem
- As a learner, I can understand compound words through sandhi splitting
- As a learner, I can switch between Devanagari and IAST views

### Phase 2: Sentence Visualization
- As a learner, I can see how words in a sentence relate grammatically
- As a learner, I understand which words agree in gender/number/case
- As a learner, I can visualize कारक (karaka) relationships

### Phase 3: Sentence Families
- As a learner, I can see example sentences for each form of a word
- As a learner, I build intuition by seeing patterns across sentences

## Feature Specification

### Word Popup (Phase 1)

**Trigger:** Hover or select Sanskrit text

**Display:**
```
┌─────────────────────────────────────────────┐
│  रामस्य (rāmasya)                           │
│                                             │
│  Stem: राम (rāma) - m. "Rama, joy"         │
│  Case: Genitive (षष्ठी)                     │
│  Number: Singular (एकवचन)                   │
│  Gender: Masculine (पुल्लिङ्ग)              │
│                                             │
│  ┌─ Declension Family ─────────────────┐   │
│  │         Sing.    Dual     Plur.    │   │
│  │ Nom.    रामः     रामौ     रामाः    │   │
│  │ Acc.    रामम्    रामौ     रामान्   │   │
│  │ Inst.   रामेण   रामाभ्याम् रामैः    │   │
│  │ Dat.    रामाय   रामाभ्याम् रामेभ्यः │   │
│  │ Abl.    रामात्  रामाभ्याम् रामेभ्यः │   │
│  │ Gen.    रामस्य  रामयोः    रामाणाम् │   │  ← highlighted
│  │ Loc.    रामे    रामयोः    रामेषु   │   │
│  │ Voc.    राम     रामौ     रामाः    │   │
│  └────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Sandhi Splitting (for compounds):**
```
┌─────────────────────────────────────────────┐
│  नरेन्द्रः (narendraḥ)                      │
│                                             │
│  Compound: नर + इन्द्र → नरेन्द्र            │
│  Meaning: "king of men" (nara + indra)     │
│                                             │
│  [Click each part for full analysis]        │
└─────────────────────────────────────────────┘
```

### Settings

- Toggle: Show Devanagari / IAST / Both
- Toggle: Auto-popup on hover vs click-only
- Theme: Light / Dark / System
- Hotkey: Customize trigger key

## Technical Requirements

### Browser Compatibility
- Chrome (primary, Manifest V3)
- Future: Firefox, Edge (compatible with MV3)

### Performance
- Popup should appear within 200ms
- Should not slow down page load
- Efficient DOM scanning for Sanskrit text detection

### Accessibility
- Keyboard navigation for popup
- Screen reader support
- Sufficient color contrast

## Success Metrics

- Personal use: Does it help Mahesh learn faster?
- Time to lookup reduced vs traditional dictionary
- Paradigm retention improved through family display
