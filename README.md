# Dancecast

A system for practicing dance with video: host videos on your server (or Pi), cast them to a TV or Raspberry Pi, and control playback (speed, seek, loop A–B) from your phone. No Google Cast — the Flutter app and the receiver (browser on the TV) talk through the same server via WebSocket.

## What’s in this repo

| Part | Description |
|------|-------------|
| **server/** | Python (FastAPI) video server: serves videos with range support, list API, web frontend, receiver static files, and a **WebSocket hub** so the phone app can control the receiver. |
| **server/static/web/** | Web frontend for testing and fallback: list videos, play with speed and loop. |
| **server/static/receiver/** | Receiver app (HTML/JS): open in a browser on the TV or Pi; it registers with the server and accepts LOAD/PLAY/PAUSE/SEEK/SET_RATE/SET_LOOP from the Flutter app. |
| **mobile_app/** | Flutter app: set server URL, pick a display and video, then use the remote (play/pause, seek, speed). |
| **media/** | Default folder for video files (override with `DANCE_MEDIA_PATH`). |

## Quick start

### 1. Run the server

**With Docker (recommended)** — same on a dev laptop or a Pi 5:

1. Put video files (e.g. `.mp4`) in `media/` in this folder.
2. From the repo root:
   ```bash
   docker compose up -d
   ```
3. Server is at `http://localhost:8000` (or `http://<this-machine-ip>:8000` from other devices).

**Without Docker:** see [server/README.md](server/README.md) for Python setup and `DANCE_MEDIA_PATH` / `PORT`.

### 2. Open the web frontend (optional)

- **List and play videos in the browser:** [http://localhost:8000/](http://localhost:8000/)  
  Use this to test the server and play with speed/loop without the phone.

### 3. Use the receiver on your TV or Pi

1. On the device that will show the video (TV browser or Raspberry Pi with Chromium), open:
   - **http://\<server-ip\>:8000/receiver/**
   - Optional: add a display name, e.g. `?name=Living%20Room`
2. The page connects to the server and registers as a “display”. It will show “Ready — connect from the app to load a video” when connected.

### 4. Use the Flutter app on your phone

1. Install [Flutter](https://flutter.dev/docs/get-started/install), then from `mobile_app/` run `flutter pub get` and `flutter run` (with a device or emulator).
2. **First launch:** open **Settings** (gear icon) and enter the server URL (e.g. `http://192.168.1.10:8000`). Tap **Save**.
3. On the home screen you’ll see **Videos** (from the server) and **Displays** (receiver browsers that have opened the receiver URL). If no displays appear, open the receiver on the TV/Pi first, then pull-to-refresh on the app.
4. Tap a **video** → choose a **display** → the remote screen opens and sends the video to that display. Use play/pause, speed, and seek.
5. Or tap a **display** first → pick a video → same remote.

The TV must have the receiver page open **before** you try to cast; the app only sees displays that are already connected.

## Run on dev laptop vs deploy on Pi 5

- **Dev laptop:** Run `docker compose up -d` on your machine, put videos in `media/`. Open the receiver in a browser tab or on another device. Point the Flutter app at `http://<laptop-ip>:8000`.
- **Pi 5:** Same `docker compose up -d` on the Pi (or copy the repo and run there). Put videos in `media/` (or bind-mount another folder). On the Pi, open Chromium (kiosk or normal) and load `http://localhost:8000/receiver/` (or the Pi’s LAN IP). On your phone, set the app’s server URL to `http://<pi-ip>:8000`. One box does everything: server + receiver on the Pi, phone as remote.

No separate “desktop server” and “Pi hub” — one server image, same compose, run wherever you want.

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `DANCE_MEDIA_PATH` | `media/` (next to `server/`) | Folder containing video files. In Docker, the compose file mounts `./media` at `/media`. |
| `PORT` | `8000` | Server port. |

## Troubleshooting

- **Server unreachable from phone:** Ensure phone and server are on the same LAN. Use the server machine’s IP (e.g. `192.168.1.10`) not `localhost`. Check firewall allows port 8000.
- **No displays listed:** The receiver (browser on TV/Pi) must be open at `http://<server>/receiver/` and connected. Pull to refresh on the app. If the receiver page shows “Disconnected — reconnecting…”, the server may be down or the URL wrong.
- **Video not loading on TV:** The receiver loads the video URL from the server; the TV/Pi must be able to reach the server (same LAN). Video paths are like `http://<server>:8000/videos/0`; the server serves them with range support for seeking.

## Docs

- [server/README.md](server/README.md) — API overview, WebSocket protocol, range serving, env vars.
- [server/static/receiver/README.md](server/static/receiver/README.md) — What the receiver is, how to open it, message protocol.
- [mobile_app/README.md](mobile_app/README.md) — How to run the Flutter app and set the server URL.
