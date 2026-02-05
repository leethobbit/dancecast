"""
Dancecast — Video server (FastAPI).

Serves video files with range-request support (required for seeking in browsers
and Cast receivers), lists videos via API, and hosts the web frontend and
Cast receiver static assets.

Media path and port are configured via environment variables; see README.md.
"""

import os
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, Response

# -----------------------------------------------------------------------------
# Configuration: media path and port. These are used to resolve where video
# files live and how the server is exposed to the LAN (mobile/Cast use desktop IP).
# Default media path is the project's media/ folder (sibling of server/).
# -----------------------------------------------------------------------------
SERVER_DIR = Path(__file__).resolve().parent
_default_media = SERVER_DIR.parent / "media"
MEDIA_PATH = Path(os.environ.get("DANCE_MEDIA_PATH", str(_default_media))).resolve()
PORT = int(os.environ.get("PORT", "8000"))

app = FastAPI(
    title="Dancecast Video Server",
    description="Serves dance videos with range support and hosts web frontend + Cast receiver.",
    version="0.1.0",
)

# CORS: allow the web frontend (and later Flutter app) to call the API from
# other origins (e.g. phone browser, different port in dev).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_WEB_DIR = SERVER_DIR / "static" / "web"
STATIC_RECEIVER_DIR = SERVER_DIR / "static" / "receiver"


def _stream_file_range(file_path: Path, start: int, end: int, file_size: int):
    """
    Yield chunks of the file from start to end (inclusive).
    Used for Range request responses so the client can seek in the video.
    """
    with open(file_path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        chunk_size = 256 * 1024  # 256 KiB
        while remaining > 0:
            read_size = min(chunk_size, remaining)
            data = f.read(read_size)
            if not data:
                break
            remaining -= len(data)
            yield data


def _get_video_list() -> list[Path]:
    """
    Return a sorted list of video file paths in MEDIA_PATH.
    Same order is used for the list API and for serving by index, so /videos/0
    always refers to the first file in this list.
    """
    if not MEDIA_PATH.exists():
        return []
    allowed = {".mp4", ".webm", ".mkv", ".mov", ".m4v"}
    out = []
    for f in sorted(MEDIA_PATH.iterdir()):
        if f.is_file() and f.suffix.lower() in allowed:
            out.append(f)
    return out


@app.get("/api/videos")
def list_videos():
    """
    List video files in the media directory.

    Returns a JSON array with `name` (display filename, may contain spaces/emojis)
    and `path` (URL path by index, e.g. /videos/0, /videos/1). Paths are safe for
    URLs; the actual filename is never in the path.
    """
    files = _get_video_list()
    videos = [{"name": f.name, "path": f"/videos/{i}"} for i, f in enumerate(files)]
    return {"videos": videos}


@app.get("/videos/{index:int}")
def serve_video(request: Request, index: int):
    """
    Serve a video file by index (0-based, same order as GET /api/videos).

    Uses index instead of filename so URLs stay safe (no spaces, emojis, or
    special characters). Range requests are supported for seeking.
    """
    files = _get_video_list()
    if index < 0 or index >= len(files):
        raise HTTPException(status_code=404, detail="Video not found")
    file_path = files[index]

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    # Always advertise range support so the browser requests ranges and can continue loading.
    accept_ranges_headers = {"Accept-Ranges": "bytes"}

    if not range_header or not range_header.strip().lower().startswith("bytes="):
        # No range: return full file (200). FileResponse is more reliable than a custom
        # stream when the client may disconnect or navigate away; Accept-Ranges lets
        # the browser use range requests for subsequent seeks.
        return FileResponse(
            file_path,
            media_type="video/mp4",
            headers=accept_ranges_headers,
        )

    # Parse "bytes=start-end" (end is inclusive). Optional end => to end of file.
    try:
        parts = range_header.strip()[6:].strip().split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
    except (ValueError, IndexError):
        raise HTTPException(status_code=416, detail="Invalid Range header")
    if start > end or start < 0:
        raise HTTPException(status_code=416, detail="Invalid Range header")
    end = min(end, file_size - 1)
    content_length = end - start + 1

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        **accept_ranges_headers,
        "Content-Length": str(content_length),
    }
    return StreamingResponse(
        _stream_file_range(file_path, start, end, file_size),
        status_code=206,
        media_type="video/mp4",
        headers=headers,
    )


@app.get("/receiver/{path:path}")
def serve_receiver(path: str):
    """
    Serve the Cast receiver app static files at /receiver/...

    The receiver is a web app (HTML/JS) that runs on the Cast device or in
    Chromium on the Pi. It is mounted here so the same server hosts both
    the API and the receiver; Cast devices load it via the receiver URL
    (e.g. http://<desktop-ip>:8000/receiver/).
    """
    if not path or path == "index.html" or path == "":
        file_path = STATIC_RECEIVER_DIR / "index.html"
    else:
        file_path = (STATIC_RECEIVER_DIR / path).resolve()
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="Not found")
        try:
            file_path.relative_to(STATIC_RECEIVER_DIR)
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(file_path)


@app.get("/health")
def health():
    """Simple health check for scripts or load balancers."""
    return {"status": "ok", "media_path": str(MEDIA_PATH)}


@app.get("/")
@app.get("/index.html")
def serve_web_index():
    """Serve the web frontend index at / (testing/fallback)."""
    file_path = STATIC_WEB_DIR / "index.html"
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Web frontend not found")
    return FileResponse(file_path)


@app.get("/{path:path}")
def serve_web_static(path: str):
    """
    Serve other web frontend static files (e.g. app.js, style.css).

    Only serves files under static/web/; returns 404 otherwise. Registered
    last so /api/, /videos/, /receiver/, /health take precedence.
    """
    if not path or path == "index.html":
        file_path = STATIC_WEB_DIR / "index.html"
    else:
        file_path = (STATIC_WEB_DIR / path).resolve()
        try:
            file_path.relative_to(STATIC_WEB_DIR)
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(file_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
    )
