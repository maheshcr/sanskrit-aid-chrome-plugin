# Brainstorm & Ideas

*Original braindump captured 2026-02-01*

## Core Concept

Chrome plugin for Sanskrit learners with progressive feature depth.

### Phase 1: Word-Level Analysis
On hover/select of a Sanskrit word, popup shows:
- Word breakdown (sandhi splitting if compound)
- Gender (लिङ्ग)
- Number (वचन) - singular/dual/plural
- Case (विभक्ति)
- Suffix and prefix variations possible
- **The word's declension family** - not just this form, but all related forms

**Core insight:** Don't just teach the specific declension in context - show its family. Learner sees the word in its full paradigm.

### Phase 2: Sentence-Level Graph View
Transformer-style attention visualization:
- How surrounding words are impacted by declensions in the selected word
- Draw in the "word family in the sentence"
- Show grammatical relationships visually (कारक relations)
- Which words agree in gender/number/case

### Phase 3: Sentence Families
For each declension variation of the selected word:
- Show example sentences where that variation occurs
- "Sentence families" organized by declension
- Builds intuition for usage patterns

## Why This Matters

- Current Sanskrit learning tools are dictionary-focused
- Missing: paradigm awareness, grammatical context visualization
- The language's regularity (Paninian grammar) makes systematic display possible
- Graph view could leverage transformer attention patterns as UI metaphor

## Questions to Explore

- Build on existing APIs or create own morphological engine?
- What corpus to use for sentence examples?
- Desktop-first or also mobile?
- Monetization: free/freemium/paid?

## Visual Ideas

### Attention-Style Visualization (Phase 2)

```
    रामः     गृहं      गच्छति
     ↑         ↑          ↑
     │         └────┬─────┘
     │              │
   Subject      Object + Verb
   (कर्ता)      (कर्म + क्रिया)
```

Lines drawn between grammatically related words, thicker = stronger relationship.

### Declension Highlighting

When viewing a declension table, highlight:
- Current form (bold)
- Related forms on the page (underline in text)
- Click any form to find examples

## Product Ideas

### Free Tier
- Basic word lookup
- Declension display
- Limited queries/day

### Premium
- Unlimited queries
- Sentence visualization
- Sentence families
- Custom word lists
- Progress tracking

### Future Extensions
- Flashcard generation from highlighted words
- Integration with Anki
- Reading progress tracking
- Difficulty scoring for texts

## Competitive Landscape

### Existing Tools
- Google Translate (poor for Sanskrit)
- Spoken Sanskrit Dictionary (lookup only)
- Sanskrit Heritage Site (excellent but not extension)
- Ashtadhyayi.com (reference, not learning)

### Differentiation
- In-context learning (not separate dictionary tab)
- Paradigm-first approach
- Visual grammatical relationships
- Built by a learner for learners
