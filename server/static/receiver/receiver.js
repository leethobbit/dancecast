/**
 * Dancecast — Cast Receiver (runs on Cast device or Pi browser).
 *
 * Cast Receiver SDK lifecycle: when a sender connects, the receiver gets a
 * session and can receive custom messages on a namespace. We define a simple
 * protocol: LOAD (url, loopStart, loopEnd, initialRate), PLAY, PAUSE, SEEK,
 * SET_RATE, SET_LOOP. The receiver plays video in a single <video> element
 * so A/V stay in sync; A–B loop is implemented on timeupdate by seeking back
 * to loopStart when currentTime >= loopEnd.
 *
 * This file is a minimal placeholder: it sets up the video element and
 * A–B loop logic. Cast SDK v3 integration (register app, handle session,
 * custom channel) will be added when we have a receiver application ID.
 */

(function () {
  "use strict";

  const video = document.getElementById("video");
  const statusEl = document.getElementById("status");

  let loopStart = null;
  let loopEnd = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  // A–B loop: when playback reaches loopEnd, jump back to loopStart.
  // Using a single <video> and one source keeps audio and video in sync
  // (same decode clock); changing playbackRate also stays in sync when the
  // player is implemented correctly.
  video.addEventListener("timeupdate", function () {
    if (loopStart != null && loopEnd != null && video.currentTime >= loopEnd) {
      video.currentTime = loopStart;
    }
  });

  // Optional: support loading via URL params for testing without Cast
  // (e.g. open /receiver/?url=/videos/dance.mp4)
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get("url");
  if (urlParam) {
    const base = window.location.origin;
    const src = urlParam.startsWith("http") ? urlParam : base + urlParam;
    video.src = src;
    video.play().catch(function () {});
    setStatus("Playing: " + urlParam);
  } else {
    setStatus("Connect from sender to load video (or add ?url=/videos/… to URL)");
  }

  // Export for Cast custom channel: when we add the SDK, the sender will
  // send JSON like { type: "LOAD", url, loopStart, loopEnd, rate } and we
  // will call loadVideo(msg) from the message handler.
  window.danceReceiver = {
    loadVideo: function (msg) {
      if (msg.url) {
        var src = msg.url;
        if (src.indexOf("http") !== 0) src = window.location.origin + src;
        video.src = src;
        video.playbackRate = msg.rate != null ? msg.rate : 1;
        loopStart = msg.loopStart != null ? msg.loopStart : null;
        loopEnd = msg.loopEnd != null ? msg.loopEnd : null;
        video.play().catch(function () {});
        setStatus("Playing");
      }
    },
    play: function () { video.play(); },
    pause: function () { video.pause(); },
    seek: function (t) { video.currentTime = t; },
    setRate: function (r) { video.playbackRate = r; },
    setLoop: function (a, b) { loopStart = a; loopEnd = b; }
  };
})();
