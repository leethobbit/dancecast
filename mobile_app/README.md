# Dancecast — Mobile app

Flutter app that acts as the remote control: set the server URL, pick a display (TV/Pi with the receiver open) and a video, then control playback (play/pause, seek, speed, loop A–B) via the server’s WebSocket hub.

## How to run

1. Install [Flutter](https://flutter.dev/docs/get-started/install).
2. If this project was created without the Flutter CLI, generate platform folders first: from this directory run `flutter create .` (this adds `android/`, `ios/`, etc.).
3. From this directory run: `flutter pub get`, then `flutter run` (with a device or emulator connected).
3. On first launch, open **Settings** and enter the Dancecast server URL (e.g. `http://192.168.1.10:8000`). The server must be running (e.g. `docker compose up -d` in the repo root).
4. Open the **receiver** in a browser on your TV or Pi: `http://<server>/receiver/`. It will register as a display.
5. On the app home you’ll see **Videos** and **Displays**. Tap a video, choose a display, then use the remote (play/pause, speed, seek). Or tap a display first and then pick a video.

## Setting the server URL

- **First time:** Open Settings (gear icon), enter the server base URL (e.g. `http://192.168.1.10:8000`), tap Save.
- **To change:** Open Settings again and edit the URL.

The URL is stored on the device so you don’t have to re-enter it after restarting the app.

## App structure

- **lib/main.dart** — Entry point; runs `DancecastApp`.
- **lib/app.dart** — Material app and routes (home, settings).
- **lib/screens/** — Home (videos + displays list), Settings (server URL), DisplayPicker (choose display after picking video), Remote (attach, LOAD, play/pause, seek, speed).
- **lib/services/** — `server_config` (persist server URL), `api_client` (GET /api/videos, /api/displays, build video URLs), `control_channel` (WebSocket: attach, LOAD/PLAY/PAUSE/SEEK/SET_RATE/SET_LOOP).

User actions on the remote screen map to JSON messages sent over the WebSocket; the server forwards them to the receiver browser on the TV/Pi.
