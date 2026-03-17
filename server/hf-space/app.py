"""
Sanskrit TTS API — HuggingFace Space with ZeroGPU

Serves ai4bharat/indic-parler-tts for the Sanskrit Aid Chrome Extension.
Optimized for single-word pronunciation of declension forms.

Deploy as a Gradio Space with ZeroGPU hardware.
"""

try:
    import spaces
except ImportError:
    # Local development fallback — decorator becomes a no-op
    class spaces:
        @staticmethod
        def GPU(*args, **kwargs):
            def decorator(func):
                return func
            if len(args) == 1 and callable(args[0]):
                return args[0]
            return decorator

import io
import torch
import gradio as gr
import numpy as np
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

# ---------------------------------------------------------------------------
# Model loading (global scope — loads to CPU, transferred to GPU by ZeroGPU)
# ---------------------------------------------------------------------------

MODEL_ID = "ai4bharat/indic-parler-tts"

model = ParlerTTSForConditionalGeneration.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float32,
).to("cuda")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
description_tokenizer = AutoTokenizer.from_pretrained(
    model.config.text_encoder._name_or_path
)

# ---------------------------------------------------------------------------
# Voice presets optimized for Sanskrit word pronunciation
# ---------------------------------------------------------------------------

VOICE_PRESETS = {
    "slow_clear_male": (
        "Aryan speaks at a slow pace with a moderate pitch, captured clearly "
        "in a close-sounding environment with excellent recording quality."
    ),
    "clear_female": (
        "Divya speaks at a moderate pace with a slightly expressive tone. "
        "The recording is clear, with a close sound and only minimal ambient noise."
    ),
    "clear_male": (
        "Rohit speaks at a moderate pace with a slightly expressive tone. "
        "The recording is clear, with a close sound and only minimal ambient noise."
    ),
    "expressive_female": (
        "Rani speaks with an expressive and animated tone with varied pitch and speed. "
        "The recording is clear, with a close sound and excellent recording quality."
    ),
}

DEFAULT_VOICE = "slow_clear_male"

# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

@spaces.GPU(duration=60)
def generate_speech(text: str, voice_preset: str) -> tuple[int, np.ndarray]:
    """Generate speech audio for Sanskrit text.

    Args:
        text: Sanskrit text in Devanagari script.
        voice_preset: Key from VOICE_PRESETS, or a custom voice description.

    Returns:
        Tuple of (sample_rate, audio_numpy_array).
    """
    if not text or not text.strip():
        raise gr.Error("Text is required.")

    text = text.strip()

    # Resolve voice description
    if voice_preset in VOICE_PRESETS:
        description = VOICE_PRESETS[voice_preset]
    else:
        description = voice_preset if voice_preset.strip() else VOICE_PRESETS[DEFAULT_VOICE]

    # Tokenize
    desc_inputs = description_tokenizer(description, return_tensors="pt").to("cuda")
    prompt_inputs = tokenizer(text, return_tensors="pt").to("cuda")

    # Generate
    with torch.inference_mode():
        generation = model.generate(
            input_ids=desc_inputs.input_ids,
            attention_mask=desc_inputs.attention_mask,
            prompt_input_ids=prompt_inputs.input_ids,
            prompt_attention_mask=prompt_inputs.attention_mask,
        )

    audio_arr = generation.cpu().numpy().squeeze()
    sample_rate = model.config.sampling_rate

    return (sample_rate, audio_arr)


# ---------------------------------------------------------------------------
# API endpoint (for Chrome extension via CF Worker)
# ---------------------------------------------------------------------------

def api_generate(text: str, voice_preset: str = DEFAULT_VOICE) -> tuple[int, np.ndarray]:
    """API-friendly wrapper. Returns (sample_rate, audio_array)."""
    return generate_speech(text, voice_preset)


# ---------------------------------------------------------------------------
# Gradio UI (also serves as API)
# ---------------------------------------------------------------------------

with gr.Blocks(title="Sanskrit TTS", theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        """
        # Sanskrit TTS (indic-parler-tts)

        Generate pronunciation audio for Sanskrit words and phrases.
        Optimized for declension form pronunciation in the Sanskrit Aid Chrome Extension.

        **API usage:** `POST /api/predict` with `{"data": ["रामः", "slow_clear_male"]}`
        """
    )

    with gr.Row():
        with gr.Column(scale=2):
            text_input = gr.Textbox(
                label="Sanskrit text (Devanagari)",
                placeholder="रामः",
                lines=1,
            )
            voice_dropdown = gr.Dropdown(
                label="Voice",
                choices=list(VOICE_PRESETS.keys()),
                value=DEFAULT_VOICE,
            )
            generate_btn = gr.Button("Generate", variant="primary")

        with gr.Column(scale=2):
            audio_output = gr.Audio(label="Audio", type="numpy")

    generate_btn.click(
        fn=generate_speech,
        inputs=[text_input, voice_dropdown],
        outputs=audio_output,
        api_name="predict",
    )

    gr.Examples(
        examples=[
            ["रामः", "slow_clear_male"],
            ["रामम्", "slow_clear_male"],
            ["रामेण", "slow_clear_male"],
            ["धर्मः एव हतो हन्ति", "clear_female"],
        ],
        inputs=[text_input, voice_dropdown],
        outputs=audio_output,
        fn=generate_speech,
        cache_examples=False,
    )

demo.launch()
