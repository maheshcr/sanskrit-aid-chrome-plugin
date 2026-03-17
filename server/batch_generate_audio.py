#!/usr/bin/env python3
"""
Batch pre-generate TTS audio for all declension forms.

Calls the CF Worker endpoint for each form. The Worker handles:
  - R2 cache check (skips if already cached)
  - HF Space generation on miss
  - R2 storage

Designed to run daily as a cron job, respecting ZeroGPU quota.

Usage:
    python batch_generate_audio.py                    # Run with defaults (400/day)
    python batch_generate_audio.py --daily-limit 300  # Custom daily limit
    python batch_generate_audio.py --status           # Show progress without generating
    python batch_generate_audio.py --reset            # Reset tracking (start over)

State is tracked in server/data/audio_generation_state.json.
The script picks up where it left off each run.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import httpx

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "server", "data", "declensions")
STATE_FILE = os.path.join(PROJECT_ROOT, "server", "data", "audio_generation_state.json")
INDEX_FILE = os.path.join(DATA_DIR, "_index.json")

WORKER_URL = "https://sanskrit-tts.mahesh-cr.workers.dev"
VOICE = "slow_clear_male"

# Conservative default: 400/day leaves headroom in the 500-word ZeroGPU budget
# for on-demand requests from actual users
DEFAULT_DAILY_LIMIT = 400

# Pause between requests to avoid overwhelming the HF Space queue
DELAY_BETWEEN_REQUESTS = 1.0  # seconds

# Timeout for a single TTS request (HF Space can take up to 30s on cold start)
REQUEST_TIMEOUT = 60.0


# ---------------------------------------------------------------------------
# State management
# ---------------------------------------------------------------------------

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {
        "generated": {},  # "text|voice" → { timestamp, cache_key, size_bytes }
        "errors": {},     # "text|voice" → { timestamp, error, attempts }
        "daily_log": {},  # "2026-02-14" → { count, new_generated, cache_hits }
        "started_at": datetime.now(timezone.utc).isoformat(),
    }


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Build the full work queue from declension data
# ---------------------------------------------------------------------------

def build_work_queue():
    """Return a list of all (devanagari_form, stem_info) to generate."""
    with open(INDEX_FILE) as f:
        index = json.load(f)

    queue = []
    for entry in index:
        fpath = os.path.join(DATA_DIR, entry["file"])
        with open(fpath) as f:
            paradigm = json.load(f)

        stem_deva = paradigm["stem"]["deva"]
        linga = paradigm["linga"]["en"]

        for vib in paradigm["vibhaktis"]:
            vib_name = vib["vibhakti"]["en"]
            for vac_key, form in vib["forms"].items():
                if form is None:
                    continue
                queue.append({
                    "text": form["deva"],
                    "iast": form["iast"],
                    "stem": stem_deva,
                    "linga": linga,
                    "vibhakti": vib_name,
                    "vacana": vac_key,
                })

    # Deduplicate: same Devanagari form may appear in multiple paradigms
    # (e.g., रामौ is both nom.dual and acc.dual)
    seen = set()
    unique_queue = []
    for item in queue:
        key = item["text"]
        if key not in seen:
            seen.add(key)
            unique_queue.append(item)

    return unique_queue


# ---------------------------------------------------------------------------
# Generate audio via CF Worker
# ---------------------------------------------------------------------------

def generate_one(client, text, voice=VOICE):
    """Call the CF Worker. Returns (cache_status, size_bytes) or raises."""
    resp = client.get(
        f"{WORKER_URL}/tts",
        params={"text": text, "voice": voice},
        timeout=REQUEST_TIMEOUT,
    )

    if resp.status_code == 429:
        return "RATE_LIMITED", 0

    if resp.status_code != 200:
        raise Exception(f"HTTP {resp.status_code}: {resp.text[:200]}")

    cache_status = resp.headers.get("x-cache", "UNKNOWN")
    size = len(resp.content)

    # Verify it's actually a WAV
    if size < 100 or resp.content[:4] != b"RIFF":
        raise Exception(f"Invalid audio response: {size} bytes, header={resp.content[:4]}")

    return cache_status, size


# ---------------------------------------------------------------------------
# Main batch loop
# ---------------------------------------------------------------------------

def run_batch(daily_limit):
    state = load_state()
    queue = build_work_queue()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Initialize today's log
    if today not in state["daily_log"]:
        state["daily_log"][today] = {"count": 0, "new_generated": 0, "cache_hits": 0, "errors": 0}

    today_log = state["daily_log"][today]
    already_today = today_log["count"]

    # Filter queue: skip already generated
    pending = [
        item for item in queue
        if f"{item['text']}|{VOICE}" not in state["generated"]
    ]

    # Also skip items that have failed 3+ times
    pending = [
        item for item in pending
        if state["errors"].get(f"{item['text']}|{VOICE}", {}).get("attempts", 0) < 3
    ]

    remaining_today = daily_limit - already_today
    if remaining_today <= 0:
        print(f"Daily limit reached ({daily_limit}). Already processed {already_today} today.")
        print(f"Run again tomorrow, or increase --daily-limit.")
        return

    batch = pending[:remaining_today]

    total_all = len(queue)
    total_done = len(state["generated"])
    total_pending = len(pending)

    print(f"Sanskrit TTS Batch Generator")
    print(f"{'=' * 60}")
    print(f"Total unique forms:     {total_all}")
    print(f"Already generated:      {total_done}")
    print(f"Pending:                {total_pending}")
    print(f"Today's limit:          {daily_limit}")
    print(f"Already today:          {already_today}")
    print(f"Will process now:       {len(batch)}")
    print(f"Days remaining:         {max(1, (total_pending - len(batch)) // daily_limit + 1)}")
    print(f"{'=' * 60}")
    print()

    if not batch:
        if total_pending == 0:
            print("🎉 All forms have been generated! Nothing to do.")
        else:
            print("Nothing to process in this run.")
        return

    client = httpx.Client()
    start_time = time.time()
    generated = 0
    hits = 0
    errors = 0

    for i, item in enumerate(batch):
        text = item["text"]
        state_key = f"{text}|{VOICE}"
        elapsed_total = time.time() - start_time
        rate = (i / elapsed_total * 60) if elapsed_total > 1 else 0

        # Progress line
        pct = (total_done + generated) / total_all * 100
        sys.stdout.write(
            f"\r  [{i+1}/{len(batch)}] {text:<16} "
            f"| {pct:.1f}% overall | {rate:.0f}/min | "
            f"new:{generated} hit:{hits} err:{errors}"
        )
        sys.stdout.flush()

        try:
            cache_status, size = generate_one(client, text)

            if cache_status == "RATE_LIMITED":
                print(f"\n\n⚠️  Rate limited by Worker. Stopping batch.")
                print(f"   Generated {generated} new, {hits} cache hits, {errors} errors.")
                break

            if cache_status == "HIT":
                hits += 1
            else:
                generated += 1

            state["generated"][state_key] = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "size_bytes": size,
                "cache_status": cache_status,
                "stem": item["stem"],
                "vibhakti": item["vibhakti"],
                "vacana": item["vacana"],
            }

            # Clear any previous error
            if state_key in state["errors"]:
                del state["errors"][state_key]

            today_log["count"] += 1
            if cache_status == "HIT":
                today_log["cache_hits"] += 1
            else:
                today_log["new_generated"] += 1

        except Exception as e:
            errors += 1
            today_log["errors"] += 1
            err_entry = state["errors"].get(state_key, {"attempts": 0})
            err_entry["attempts"] += 1
            err_entry["timestamp"] = datetime.now(timezone.utc).isoformat()
            err_entry["error"] = str(e)[:200]
            state["errors"][state_key] = err_entry

        # Save state periodically (every 10 items)
        if (i + 1) % 10 == 0:
            save_state(state)

        # Delay between requests
        time.sleep(DELAY_BETWEEN_REQUESTS)

    # Final save
    save_state(state)
    client.close()

    elapsed = time.time() - start_time
    total_done_now = len(state["generated"])

    print(f"\n\n{'=' * 60}")
    print(f"Batch complete in {elapsed:.0f}s")
    print(f"  New generated:  {generated}")
    print(f"  Cache hits:     {hits}")
    print(f"  Errors:         {errors}")
    print(f"  Overall:        {total_done_now}/{total_all} ({total_done_now/total_all*100:.1f}%)")
    remaining = total_all - total_done_now
    if remaining > 0:
        days_left = remaining // daily_limit + 1
        print(f"  Remaining:      {remaining} forms (~{days_left} more days)")
    else:
        print(f"  🎉 ALL DONE!")
    print(f"{'=' * 60}")


# ---------------------------------------------------------------------------
# Status display
# ---------------------------------------------------------------------------

def show_status():
    state = load_state()
    queue = build_work_queue()

    total = len(queue)
    done = len(state["generated"])
    errored = len(state["errors"])
    pending = total - done

    print(f"Sanskrit TTS Audio Generation Status")
    print(f"{'=' * 50}")
    print(f"Total unique forms:  {total}")
    print(f"Generated:           {done} ({done/total*100:.1f}%)")
    print(f"Pending:             {pending}")
    print(f"Errored (retryable): {errored}")
    print()

    if state["daily_log"]:
        print(f"Daily log:")
        for date in sorted(state["daily_log"].keys())[-7:]:
            log = state["daily_log"][date]
            print(f"  {date}: {log['count']} processed "
                  f"({log.get('new_generated', 0)} new, "
                  f"{log.get('cache_hits', 0)} hits, "
                  f"{log.get('errors', 0)} errors)")

    if state["errors"]:
        print(f"\nRecent errors:")
        for key, err in list(state["errors"].items())[-5:]:
            text = key.split("|")[0]
            print(f"  {text}: {err['error'][:80]} (attempt {err['attempts']})")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Batch generate TTS audio via CF Worker")
    parser.add_argument("--daily-limit", type=int, default=DEFAULT_DAILY_LIMIT,
                        help=f"Max forms to process per run (default: {DEFAULT_DAILY_LIMIT})")
    parser.add_argument("--status", action="store_true",
                        help="Show progress without generating")
    parser.add_argument("--reset", action="store_true",
                        help="Reset state file and start tracking from scratch")
    args = parser.parse_args()

    if args.reset:
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)
            print("State reset. Run again without --reset to start generating.")
        else:
            print("No state file to reset.")
        return

    if args.status:
        show_status()
        return

    run_batch(args.daily_limit)


if __name__ == "__main__":
    main()
