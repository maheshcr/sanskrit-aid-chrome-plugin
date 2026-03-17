# TTS Batch Generation Cron Setup

## Quick Start (run manually)

```bash
cd /path/to/sanskrit-aid-chrome-plugin
source server/venv/bin/activate
python server/batch_generate_audio.py                    # 400 forms/day (default)
python server/batch_generate_audio.py --daily-limit 300  # custom limit
python server/batch_generate_audio.py --status           # check progress
```

## Option 1: macOS (launchd)

```bash
# Install the plist
cp server/cron/com.sanskrit-tts.batch.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.sanskrit-tts.batch.plist

# Check status
launchctl list | grep sanskrit

# Unload when done
launchctl unload ~/Library/LaunchAgents/com.sanskrit-tts.batch.plist
```

Runs daily at 2 AM. Logs to `server/cron/batch.log`.

## Option 2: Linux (crontab)

```bash
# Add to crontab
crontab -e

# Add this line (runs daily at 2 AM UTC):
0 2 * * * cd /path/to/sanskrit-aid-chrome-plugin && server/venv/bin/python server/batch_generate_audio.py >> server/cron/batch.log 2>&1
```

## Option 3: Hetzner + Coolify

Deploy as a simple cron service in Coolify with the Dockerfile in this directory.

## Monitoring

```bash
# Check progress
python server/batch_generate_audio.py --status

# View state file
cat server/data/audio_generation_state.json | python -m json.tool

# View recent logs
tail -50 server/cron/batch.log
```

## Timeline

- 1722 unique forms to generate
- Default: 400/day → ~5 days to complete
- After completion, the job becomes a no-op ("All forms generated!")
