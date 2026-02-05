/**
 * Dancecast — Receiver (runs in browser on TV or Pi).
 *
 * This is a WebSocket-based receiver: no Google Cast SDK. On load we open a
 * WebSocket to the same origin (/ws), send { type: "register", name: "..." },
 * and then accept commands LOAD, PLAY, PAUSE, SEEK, SET_RATE, SET_LOOP from
 * the server (which forwards them from the Flutter app). We play video in a
 * single <video> element so A/V stay in sync; A–B loop is implemented on
 * timeupdate by seeking back to loopStart when currentTime >= loopEnd.
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
  // (same decode clock); changing playbackRate also stays in sync.
  video.addEventListener("timeupdate", function () {
    if (loopStart != null && loopEnd != null && video.currentTime >= loopEnd) {
      video.currentTime = loopStart;
    }
  });

  // Build WebSocket URL from current page (ws:// or wss://, same host, path /ws)
  function getWsUrl() {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return proto + "//" + window.location.host + "/ws";
  }

  // API the sender commands call into: load a video, play, pause, seek, set rate, set loop
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

  // Optional: load from URL param for testing without a sender (e.g. /receiver/?url=/videos/0)
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get("url");
  const displayName = params.get("name") || "TV";

  if (urlParam) {
    const base = window.location.origin;
    const src = urlParam.startsWith("http") ? urlParam : base + urlParam;
    video.src = src;
    video.play().catch(function () {});
    setStatus("Playing: " + urlParam);
  } else {
    setStatus("Connecting…");
  }

  // Connect to WebSocket hub and register as a display so the Flutter app can find us
  (function connectWs() {
    const ws = new WebSocket(getWsUrl());

    ws.onopen = function () {
      ws.send(JSON.stringify({ type: "register", name: displayName }));
    };

    ws.onmessage = function (event) {
      var msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      var type = msg.type;
      // Sender sends LOAD/PLAY/PAUSE/SEEK/SET_RATE/SET_LOOP; server forwards them here.
      // Each handler calls the corresponding danceReceiver method (see above).
      if (type === "LOAD") {
        window.danceReceiver.loadVideo(msg);
      } else if (type === "PLAY") {
        window.danceReceiver.play();
      } else if (type === "PAUSE") {
        window.danceReceiver.pause();
      } else if (type === "SEEK") {
        // Sender may send "time" or "position" (seconds).
        var t = msg.time != null ? msg.time : msg.position;
        if (t != null) window.danceReceiver.seek(t);
      } else if (type === "SET_RATE") {
        var r = msg.rate;
        if (r != null) window.danceReceiver.setRate(r);
      } else if (type === "SET_LOOP") {
        // A–B loop: set loop start (a) and end (b) in seconds.
        var a = msg.loopStart != null ? msg.loopStart : msg.a;
        var b = msg.loopEnd != null ? msg.loopEnd : msg.b;
        if (a != null && b != null) window.danceReceiver.setLoop(a, b);
      } else if (type === "registered") {
        if (!urlParam) setStatus("Ready — connect from the app to load a video");
      }
    };

    ws.onclose = function () {
      if (!urlParam) setStatus("Disconnected — reconnecting…");
      setTimeout(connectWs, 3000);
    };

    ws.onerror = function () {
      if (!urlParam) setStatus("Connection error — reconnecting…");
    };
  })();
})();
