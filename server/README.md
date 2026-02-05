# Dancecast — Video Server

FastAPI server that serves video files with **range request** support, lists videos via API, hosts the web frontend and receiver, and runs a **WebSocket hub** so the Flutter app (sender) can control the receiver (browser on TV/Pi) without Google Cast.

## Why range requests?

Browsers and the receiver send `Range: bytes=start-end` when the user seeks. The server must respond with `206 Partial Content` and only that byte range. Without it, seeking is slow or broken because the client would have to download the whole file first. The Flutter app and receiver both use video URLs that point at this server, so range support is required for seeking from the remote.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos` | GET | List video files in the media directory. Returns `{ "videos": [ { "name", "path" }, ... ] }` where `path` is e.g. `/videos/0`. |
| `/api/displays` | GET | List displays currently registered with the WebSocket hub (receiver browsers that have connected and sent `register`). Returns `{ "displays": [ { "id", "name" }, ... ] }`. Used by the Flutter app to discover which TV/Pi to cast to. |
| `/videos/{index}` | GET | Serve a video file by index (0-based, same order as `/api/videos`). Supports `Range`; returns 206 for range requests. |
| `/health` | GET | Health check. Returns `{ "status": "ok", "media_path": "..." }`. |

The web frontend is at `/` and the receiver at `/receiver/`. Both are static files under `static/web/` and `static/receiver/`.

## WebSocket hub (`/ws`)

A single WebSocket endpoint accepts two roles:

- **Receiver (display):** A browser on the TV or Pi opens the receiver page, which connects to `/ws` and sends the first message: `{ "type": "register", "name": "Living Room TV" }`. The server assigns an id and stores the connection. Later, commands from a sender are forwarded to this connection.
- **Sender (Flutter):** The app connects to `/ws`, sends `{ "type": "attach", "displayId": "..." }` to attach to a display (get ids from `GET /api/displays`), then sends `LOAD`, `PLAY`, `PAUSE`, `SEEK`, `SET_RATE`, `SET_LOOP`. The server forwards those messages to the attached display’s WebSocket.

**Protocol summary:**

| From     | Message | Server action |
|----------|---------|----------------|
| Receiver | `{ "type": "register", "name": "…" }` | Add to registry; reply `{ "type": "registered", "id": "…" }`. |
| Sender   | `{ "type": "list_displays" }` | Reply `{ "type": "displays", "displays": [ { "id", "name" }, ... ] }`. (Or use `GET /api/displays`.) |
| Sender   | `{ "type": "attach", "displayId": "…" }` | Store attachment; subsequent commands from this sender go to that display. |
| Sender   | `{ "type": "LOAD", "url", ... }` etc. | Forward to attached display’s WebSocket. |
| Receiver | (disconnect) | Remove from registry; notify any sender attached to that display with `{ "type": "display_gone" }`. |

We forward commands instead of handling them in the server so that playback and A/V stay in the receiver; the server only routes messages.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DANCE_MEDIA_PATH` | `../media` (project’s `media/` folder) | Absolute or relative path to the directory containing video files. In Docker, the compose file mounts the host `./media` at `/media` and sets this to `/media`. |
| `PORT` | `8000` | Port to bind. Use `0.0.0.0` so other devices on the LAN can reach the server (e.g. `uvicorn main:app --host 0.0.0.0 --port 8000`). |

## Run

**With Docker (from repo root):**

```bash
docker compose up -d
```

The server runs in a container; videos in `dancecast/media/` are mounted read-only at `/media` inside the container.

**On the host** — from the `server/` directory:

```bash
pip install -r requirements.txt
python main.py
```

Or with uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

To use a custom media folder:

```bash
set DANCE_MEDIA_PATH=C:\Videos\Dance
python main.py
```

## CORS

CORS is enabled for all origins so the web frontend and the Flutter app can call the API from another origin or port (e.g. phone on LAN).
