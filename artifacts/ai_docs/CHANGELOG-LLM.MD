# Changelog (LLM-assisted changes)

## 2025-02-05

### Implementation plan review (DANCE-PRACTICE-APP.md)

- **artifacts/ai_docs/CHAT-HISTORY.MD** — Appended review of implementation plan and identified next step: complete Cast receiver (integrate Cast Receiver SDK v3, get receiver app ID, add test sender page using Cast Web Sender API). No code or config changes.

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

### Web: video URL in address bar and fix forever load on Play

- **server/static/web/index.html** — Added `<p id="player-status">` for loading/error messages; main `<video>` set to `preload="auto"` so playback can start sooner.
- **server/static/web/app.js** — When a video is selected, the URL is updated with `history.replaceState` to `#/watch<path>` so the address bar reflects the current video; "Back to list" clears the hash. On initial load, if the hash is `#/watch/...`, that video is opened automatically. In `playVideo()`: call `video.play()` after setting `src`/`load()` so playback starts without requiring a separate Play click; add `canplay`/`waiting`/`error` listeners and `setPlayerStatus()` to show "Loading…" and errors. `showList()` clears `currentVideoPath` and the watch hash.
- **server/static/web/style.css** — Added `.player-status` and `.player-status.visible` for the loading/error message under "Now playing".

### Web: no autoplay, stop video when Back to list

- **server/static/web/app.js** — Removed `video.play()` from `playVideo()` so videos load but do not autoplay; user clicks Play when ready. In `showList()`: call `video.pause()`, `video.removeAttribute("src")`, and `video.load()` so playback and audio stop when returning to the list.

### Web: fix streaming stuck at ~1/3; normalize filenames with spaces

- **server/main.py** — Video streaming: always send `Accept-Ranges: bytes` on all video responses. When the client does not send a Range header, respond with 200 and stream the full file via `StreamingResponse` + `_stream_file_range` (same as range responses) with `Content-Length` and `Accept-Ranges` so the browser can request further ranges and load the rest of the video. Filename handling: use `urllib.parse.unquote` on the path segment so URL-encoded names (e.g. `my%20video.mp4`) resolve to files with spaces/special characters; docstrings for `list_videos` and `serve_video` updated to describe encoding/decoding.

### Web: faster index load — lazy thumbnails and concurrency limit

- **server/static/web/app.js** — Thumbnails no longer load on initial render. Cards are built with `data-video-path`, no `src` on thumbnail videos, so the list and "Pick a video:" show immediately. `IntersectionObserver` (with `rootMargin: "100px"`) lazy-loads thumbnails when a card enters (or nears) the viewport. At most 3 thumbnail loads run at once; a small queue (`thumbPending`) and `thumbTryLoadNext()` start the next load when one finishes. Fallback when `IntersectionObserver` is missing: load thumbnails in batches of 3 in document order.

### Web + server: reduce flakiness when switching videos and back to list

- **server/static/web/app.js** — `resetVideoElement()` added (pause, remove src, load). `playVideo(path)` now resets the main video first, then sets the new `src`/`load()` inside `setTimeout(..., 0)` so the previous request is aborted before starting the new one. `playerVisible` flag: thumbnail queue does not run while the player is visible; `showList()` sets `playerVisible = false` and calls `thumbTryLoadNext()` so thumbnails resume when returning to the list.
- **server/main.py** — For video requests without a `Range` header, use `FileResponse` with `Accept-Ranges: bytes` instead of custom `StreamingResponse`, so the framework handles the response and client disconnect more reliably.

### Video URLs by index (no filenames in path)

- **server/main.py** — Added `_get_video_list()` returning a sorted list of video `Path`s. List API now returns `path` as `/videos/0`, `/videos/1`, … (0-based index) and `name` unchanged for display. Replaced `GET /videos/{filename:path}` with `GET /videos/{index:int}`; serve by index into `_get_video_list()`. Removed `unquote` import. URLs no longer contain filenames, spaces, or emojis.

### Web: hash URL with slashes (no %2F)

- **server/static/web/app.js** — Build watch hash as `"#/watch" + path` so the URL shows `#/watch/videos/0` instead of `#/watch%2Fvideos%2F0`. Paths are index-based and safe; comment updated to match.

### Web: all thumbnails load; cancel thumbnails when opening video

- **server/static/web/app.js** — Intersection Observer rootMargin set to `9999px 0px 9999px 0px` so all cards are queued for thumbnails (still 3 at a time), fixing “later ones never load.” Added `thumbCancelAll()`: clears each thumbnail video’s src, resets loaded/error state, removes `thumbStarted`, re-observes cards (using stored `thumbObserver`), and clears `thumbPending` so connections are freed. `playVideo()` calls `thumbCancelAll()` before loading the main video so the main request isn’t blocked by the 6-connection limit. Observer stored in `thumbObserver` for re-observe after cancel.
