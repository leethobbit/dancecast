# Dancecast — Receiver

Web app that runs in a **browser on the TV or Raspberry Pi**. It does **not** use the Google Cast SDK. Instead it connects to the Dancecast server over **WebSocket**, registers as a “display”, and receives commands (LOAD, PLAY, PAUSE, SEEK, SET_RATE, SET_LOOP) that the server forwards from the Flutter app. It plays video in a single `<video>` element so A/V stay in sync and supports A–B loop (on `timeupdate`, when `currentTime >= loopEnd`, jump back to `loopStart`).

## How to open the receiver

1. On the device that will show the video (TV browser or Pi with Chromium), open:
   - **http://\<server-ip\>:8000/receiver/**
2. Optional: give the display a name so the Flutter app shows a friendly label:
   - **http://\<server-ip\>:8000/receiver/?name=Living%20Room**
3. The page will connect to the server’s WebSocket at `/ws` and send `{ "type": "register", "name": "…" }`. Once registered, it shows “Ready — connect from the app to load a video”.
4. The Flutter app (or any sender) discovers this display via `GET /api/displays` and then attaches and sends commands through the same server.

No receiver application ID or Google Cast Developer Console is required.

## Message protocol

The server forwards JSON messages from the sender to this page. The receiver handles:

| Type      | Payload | Action |
|-----------|---------|--------|
| `LOAD`    | `url`, optional `loopStart`, `loopEnd`, `rate` | Set video `src`, playback rate, and A–B loop; play. |
| `PLAY`    | — | `video.play()` |
| `PAUSE`   | — | `video.pause()` |
| `SEEK`    | `time` (seconds) | `video.currentTime = time` |
| `SET_RATE`| `rate` | `video.playbackRate = rate` |
| `SET_LOOP`| `loopStart`, `loopEnd` | Set loop bounds; on `timeupdate`, if `currentTime >= loopEnd`, set `currentTime = loopStart`. |

A single `<video>` and one URL keep audio and video in sync; the same logic is used in the web frontend.

## Testing without the app

You can open the receiver in a browser with a video URL and it will play locally (no WebSocket needed for the video):

- **http://localhost:8000/receiver/?url=/videos/0**

The receiver will load and play that URL. The same control logic (A–B loop, speed) is used when commands come from the app via the WebSocket.
