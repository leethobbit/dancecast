# Dancecast — Video Server

FastAPI server that serves video files with **range request** support, lists videos via API, and hosts the web frontend and Cast receiver.

## Why range requests?

Browsers and Cast receivers send `Range: bytes=start-end` when the user seeks. The server must respond with `206 Partial Content` and only that byte range. Without it, seeking is slow or broken because the client would have to download the whole file first.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos` | GET | List video files in the media directory. Returns `{ "videos": [ { "name", "path" }, ... ] }`. |
| `/videos/{filename}` | GET | Serve a video file. Supports `Range`; returns 206 for range requests. |
| `/health` | GET | Health check. Returns `{ "status": "ok", "media_path": "..." }`. |

The web frontend is at `/` and the Cast receiver at `/receiver/`. Both are static files under `static/web/` and `static/receiver/`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DANCE_MEDIA_PATH` | `../media` (project’s `media/` folder) | Absolute or relative path to the directory containing video files. |
| `PORT` | `8000` | Port to bind. Use `0.0.0.0` so other devices on the LAN can reach the server (e.g. `uvicorn main:app --host 0.0.0.0 --port 8000`). |

## Run

**With Docker (from `dancecast/`):**

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

CORS is enabled for all origins so the web frontend (and later the Flutter app) can call the API from another origin or port during development.
