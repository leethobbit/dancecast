# Changelog (LLM-assisted changes)

## 2025-02-04

### Project renamed to "dancecast"

- **README.md** — Main title and path references: "Dance Practice App" → "Dancecast", `dance-practice-app/` → `dancecast/`.
- **docker-compose.yml** — Comments and `container_name`: `dance-practice-server` → `dancecast-server`.
- **server/main.py** — Docstring and FastAPI app title: "Dance Practice Video Server" → "Dancecast Video Server".
- **server/Dockerfile** — Comments updated to Dancecast and `dancecast/`.
- **server/requirements.txt** — Top comment updated to Dancecast.
- **server/README.md** — Title and path refs: "Dance Practice — Video Server" → "Dancecast — Video Server"; `dance-practice-app/` → `dancecast/`.
- **server/static/web/index.html** — Page title and h1: "Dance Practice" → "Dancecast".
- **server/static/receiver/index.html** — Page title: "Dance Practice — Cast Receiver" → "Dancecast — Cast Receiver".
- **server/static/receiver/README.md** — Title: "Dance Practice — Cast Receiver" → "Dancecast — Cast Receiver".
- **server/static/web/style.css** — Header comment updated to Dancecast.
- **server/static/web/app.js** — File header comment updated to Dancecast.
- **server/static/receiver/receiver.js** — File header comment updated to Dancecast.
- **DANCE-PRACTICE-APP.md** — Plan title: "Dance Practice App — Implementation Plan" → "Dancecast — Implementation Plan".

### Web: thumbnails and video loading fixes

- **server/main.py** — In `serve_video`, normalize `filename`: `filename.lstrip("/").replace("\\", "/")` and reject empty filename so `MEDIA_PATH / filename` always resolves under the media directory (avoids 404s from leading slash or path quirks).
- **server/static/web/index.html** — Main `<video>`: added `preload="metadata"` so duration loads without downloading the full file.
- **server/static/web/app.js** — Thumbnail videos: set `crossorigin="anonymous"`; set `src` with `encodeURI(v.path).replace(/%2F/g, "/")`; use `loadedmetadata` to seek to 1s (or 50% of duration for short clips); add `.loaded` on `seeked` or on `loadeddata` when `readyState >= 2` as fallback; keep `error` → `.error`. Main player: `playVideo(path)` now sets `video.src` with the same encoded path so filenames with spaces/special characters load correctly.
