---
title: Sanskrit TTS
emoji: "\U0001F50A"
colorFrom: yellow
colorTo: red
sdk: gradio
sdk_version: "5.12.0"
app_file: app.py
pinned: false
license: apache-2.0
models:
  - ai4bharat/indic-parler-tts
tags:
  - tts
  - text-to-speech
  - sanskrit
  - indic
  - parler-tts
short_description: Sanskrit pronunciation using indic-parler-tts
---

# Sanskrit TTS

Generate clear pronunciation audio for Sanskrit words and declension forms.

Powered by [ai4bharat/indic-parler-tts](https://huggingface.co/ai4bharat/indic-parler-tts) (99.79% Native Speaker Score for Sanskrit).

## API

```bash
curl -X POST https://<your-space>.hf.space/api/predict \
  -H "Content-Type: application/json" \
  -d '{"data": ["रामः", "slow_clear_male"]}'
```

### Voice presets

| Key | Best for |
|-----|----------|
| `slow_clear_male` | Individual words, declension forms |
| `clear_female` | Sentences, longer phrases |
| `clear_male` | Sentences |
| `expressive_female` | Shloka recitation |

## Part of

[Sanskrit Aid Chrome Extension](https://github.com/maheshcr/sanskrit-aid-chrome-plugin)
