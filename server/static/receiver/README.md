# Dancecast — Cast Receiver

Web app that runs on the Cast device (Chromecast/Android TV) or in Chromium on the Raspberry Pi. It receives “load this video” and “play/pause/seek/speed/loop” from the sender and plays the video with A/V in sync.

## Message protocol (custom channel)

When the Cast SDK is integrated, the sender will send JSON messages. The receiver handles:

| Type | Payload | Action |
|------|---------|--------|
| `LOAD` | `url`, optional `loopStart`, `loopEnd`, `rate` | Set video `src`, playback rate, and A–B loop; play. |
| `PLAY` | — | `video.play()` |
| `PAUSE` | — | `video.pause()` |
| `SEEK` | `time` (seconds) | `video.currentTime = time` |
| `SET_RATE` | `rate` | `video.playbackRate = rate` |
| `SET_LOOP` | `loopStart`, `loopEnd` | Set loop bounds; on `timeupdate`, if `currentTime >= loopEnd`, set `currentTime = loopStart`. |

A single `<video>` element and one URL keep audio and video in sync; the same logic is used in the web frontend.

## Receiver application ID

To use this as a **custom Cast receiver**, register an application in the [Google Cast Developer Console](https://cast.google.com/publish) and get a **receiver application ID**. The Flutter sender will use that ID to launch this receiver. The receiver URL will be something like `https://<your-desktop>/receiver/` (HTTPS is required for Cast in production).

## Testing without Cast

You can open the receiver in a browser with a video URL:

- `http://localhost:8000/receiver/?url=/videos/yourfile.mp4`

The receiver will load and play that URL. The same control logic (A–B loop, speed) is available once the Cast custom channel is wired up.
