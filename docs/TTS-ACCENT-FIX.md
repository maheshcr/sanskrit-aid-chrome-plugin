# TTS Accent Fix: From Western to Authentic Sanskrit Pronunciation

**Date:** 2026-03-17
**Issue:** [#1](https://github.com/maheshcr/sanskrit-aid-chrome-plugin/issues/1) (closed)
**Commits:** `4471db3`, `186347a`

## The Problem

The Sanskrit Aid Chrome Extension uses AI text-to-speech (ai4bharat/indic-parler-tts) to pronounce Sanskrit words. After deployment, the pronunciation had a noticeable Western accent — a male voice trying to read Sanskrit but clearly not an Indian speaker. For a tool meant to help learn Sanskrit, this was a dealbreaker.

## The Architecture

The TTS pipeline has three layers:

```
Chrome Extension  -->  Cloudflare Worker  -->  HuggingFace Space
                        (R2 cache)              (GPU inference)
```

1. User clicks a Sanskrit word in the extension
2. CF Worker checks R2 cache for pre-generated audio
3. On cache miss, Worker calls the HF Space running indic-parler-tts on ZeroGPU
4. Audio is cached in R2 for future requests, returned to the extension

## Root Cause 1: Float16 Model Loading

The model was loaded without specifying precision:

```python
# Before (implicit dtype — may default to float16 on ZeroGPU)
model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_ID).to("cuda")

# After (explicit float32 — preserves voice quality)
model = ParlerTTSForConditionalGeneration.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float32,
).to("cuda")
```

On HuggingFace's ZeroGPU (A100 40GB), the environment can default to float16 for memory efficiency. For a 0.9B parameter model (~3.6GB in float32), this is unnecessary — it fits comfortably. But the precision reduction degrades the acoustic model's output, introducing subtle artifacts that manifest as accent drift.

## Root Cause 2: Generic Voice Descriptions (The Real Culprit)

indic-parler-tts uses text descriptions to control voice characteristics. Our original descriptions were generic English-style prompts:

```python
# Before — generic, no Indian speaker identity
"A male speaker delivers very clear speech with slow speed and moderate pitch. "
"Very high quality recording with the speaker's voice sounding clear and very close up."
```

The model was trained with **named Indian speakers** as anchors. Using generic descriptions was like asking the model "just pick any voice" — and it picked a Western-sounding one.

```python
# After — using the model's trained speaker identities
"Aryan speaks at a slow pace with a moderate pitch, captured clearly "
"in a close-sounding environment with excellent recording quality."
```

The key speakers:
- **Aryan** — recommended for Sanskrit (99.79% Native Speaker Score)
- **Rohit** — Hindi male speaker
- **Divya** — Hindi female speaker
- **Rani** — expressive female speaker

## The Cache Problem

Fixing the model wasn't enough. The Cloudflare R2 cache had **854 audio files** generated with the old Western-accented voice. Every cached word would continue serving bad audio regardless of the model fix.

Solution: purge the entire R2 cache. We added a temporary `/purge-cache` endpoint to the CF Worker (which already had R2 access), batched deletes in groups of 100 to stay within Worker CPU limits, then removed the endpoint.

```
Before purge: 1,517 objects, 215 MB
After purge:  0 objects, 0 MB
```

New audio is regenerated on first request and cached fresh.

## Verification

Tested end-to-end with "धर्मो रक्षति रक्षितः" (dharmo rakshati rakshitah — "Dharma protects those who protect it"). Clear Indian pronunciation, no Western tinge.

## Lessons

1. **Named speakers > generic descriptions** for Parler-TTS family models. The model card has this info — read it.
2. **Explicit dtypes always.** Never rely on environment defaults for inference precision. What works on your dev GPU may not behave the same on cloud infrastructure.
3. **Caching amplifies mistakes.** A bad model produces one bad audio file. A bad model behind a cache produces hundreds of bad audio files that persist after the model is fixed.
4. **Test the deployed system, not just the model.** The model on its own might sound fine in a notebook. The full pipeline (model + voice config + cache + worker) is what the user hears.

## Technical Details

- **Model:** ai4bharat/indic-parler-tts (0.9B params)
- **Infrastructure:** HuggingFace Space (ZeroGPU A100) + Cloudflare Worker + R2
- **Worker URL:** https://sanskrit-tts.mahesh-cr.workers.dev
- **HF Space:** https://huggingface.co/spaces/maheshcr/sanskrit-tts
- **GPU budget:** 25 min/day on HF Pro ($9/mo), ~100-150 new words/day
