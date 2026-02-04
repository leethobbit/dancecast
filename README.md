# Dancecast

A system for practicing dance with video: host videos on your desktop, cast them to a TV or Raspberry Pi, and control playback (speed, rewind, loop A–B) from your phone.

**Full implementation plan:** [../DANCE-PRACTICE-APP.md](../DANCE-PRACTICE-APP.md)

## What’s in this repo

| Part | Description |
|------|-------------|
| **server/** | Python (FastAPI) video server: serves videos with range support, list API, web frontend, and Cast receiver static files. |
| **server/static/web/** | Web frontend for testing and fallback: list videos, play with speed and loop. |
| **server/static/receiver/** | Cast receiver app (HTML/JS) for Chromecast/Android TV or Pi browser. |
| **media/** | Default folder for video files (override with `DANCE_MEDIA_PATH`). |

## Quick start

### Option A: Run with Docker (recommended)

No Python install on the host; everything runs in a container.

1. **Put video files** (e.g. `.mp4`) in `media/` in this folder.

2. **From `dancecast/`:**
   ```bash
   docker compose up -d
   ```

3. **Open in a browser:** same URLs as below. To stop: `docker compose down`.

### Option B: Run on the host

1. **Install Python 3.10+** and create a virtualenv (optional but recommended).

2. **Install server dependencies:**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

3. **Put some video files** (e.g. `.mp4`) in `media/` at the project root, or set `DANCE_MEDIA_PATH` to your own folder.

4. **Run the server** from the `server/` directory:
   ```bash
   cd server
   python main.py
   ```
   Or: `uvicorn main:app --host 0.0.0.0 --port 8000`

5. **Open in a browser:**
   - **Web frontend (list + play):** [http://localhost:8000/](http://localhost:8000/)
   - **Receiver (for Cast or Pi):** [http://localhost:8000/receiver/](http://localhost:8000/receiver/)
   - **API (video list):** [http://localhost:8000/api/videos](http://localhost:8000/api/videos)

To use from your phone or a Cast device on the same Wi‑Fi, replace `localhost` with your computer’s LAN IP (e.g. `http://192.168.1.100:8000/`).

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `DANCE_MEDIA_PATH` | `media/` (next to `server/`) | Folder containing video files. |
| `PORT` | `8000` | Server port. |

## Next steps (from the plan)

- **Cast receiver:** Register a custom receiver in Google Cast Developer Console and add the Cast Receiver SDK to `receiver/receiver.js` so the Flutter app can discover and control it.
- **HTTPS:** Add HTTPS (e.g. self-signed or Caddy) so Cast devices can load the custom receiver.
- **Flutter app:** Mobile sender for discovery, video picker, and remote UI (play/pause, seek, speed, loop).
- **Pi:** Chromium kiosk on Raspberry Pi loading the receiver URL; optional WebSocket bridge for “cast to Pi” from the app.

## Docs

- [server/README.md](server/README.md) — API overview, range serving, env vars.
- [server/static/receiver/README.md](server/static/receiver/README.md) — Receiver app ID, message protocol.
