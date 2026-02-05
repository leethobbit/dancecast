/**
 * Dancecast — Web frontend (testing/fallback).
 *
 * Talks to the same server API (GET /api/videos) to list videos, then plays
 * them via /videos/<name>. Control logic (speed, loop A–B) is aligned with the
 * Cast receiver so behavior is consistent when you use the app on TV or Pi.
 */

(function () {
  "use strict";

  const API_BASE = ""; // same origin; server is the same host
  const listStatus = document.getElementById("list-status");
  const videoList = document.getElementById("video-list");
  const videoListSection = document.getElementById("video-list-section");
  const playerSection = document.getElementById("player-section");
  const video = document.getElementById("video");
  const timeDisplay = document.getElementById("time-display");
  const seekBar = document.getElementById("seek");
  const speedSelect = document.getElementById("speed");
  const loopStatus = document.getElementById("loop-status");
  const playerStatus = document.getElementById("player-status");

  let loopA = null;
  let loopB = null;
  let currentVideoPath = null;
  var playerVisible = false;

  function showPlayer() {
    videoListSection.classList.add("hidden");
    playerSection.classList.remove("hidden");
  }

  function formatTime(s) {
    if (s === undefined || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function updateTimeDisplay() {
    const current = video.currentTime;
    const duration = video.duration;
    timeDisplay.textContent = formatTime(current) + " / " + formatTime(duration);
  }

  function updateSeekBar() {
    const d = video.duration;
    if (!d || !isFinite(d)) return;
    seekBar.max = 100;
    seekBar.value = (video.currentTime / d) * 100;
  }

  function updateLoopStatus() {
    if (loopA != null && loopB != null) {
      loopStatus.textContent = "A=" + formatTime(loopA) + " B=" + formatTime(loopB);
    } else {
      loopStatus.textContent = "Off";
    }
  }

  // A–B loop: when playback reaches B, jump back to A (same logic as receiver).
  function onTimeUpdate() {
    updateTimeDisplay();
    updateSeekBar();
    if (loopA != null && loopB != null && video.currentTime >= loopB) {
      video.currentTime = loopA;
    }
  }

  video.addEventListener("timeupdate", onTimeUpdate);
  video.addEventListener("durationchange", function () {
    updateTimeDisplay();
    updateSeekBar();
  });
  video.addEventListener("loadedmetadata", function () {
    updateTimeDisplay();
    updateSeekBar();
  });
  video.addEventListener("canplay", function () {
    setPlayerStatus("");
  });
  video.addEventListener("waiting", function () {
    setPlayerStatus("Loading…");
  });
  video.addEventListener("error", function () {
    var msg = "Failed to load video.";
    if (video.error && video.error.message) msg += " " + video.error.message;
    setPlayerStatus(msg);
  });

  function setPlayerStatus(text) {
    if (playerStatus) {
      playerStatus.textContent = text;
      playerStatus.className = "player-status" + (text ? " visible" : "");
    }
  }

  seekBar.addEventListener("input", function () {
    const pct = seekBar.value / 100;
    video.currentTime = pct * video.duration;
  });

  speedSelect.addEventListener("change", function () {
    video.playbackRate = parseFloat(speedSelect.value);
  });

  document.getElementById("btn-play").addEventListener("click", function () {
    video.play();
  });
  document.getElementById("btn-pause").addEventListener("click", function () {
    video.pause();
  });
  document.getElementById("btn-back").addEventListener("click", function () {
    video.currentTime = Math.max(0, video.currentTime - 10);
  });
  document.getElementById("btn-fwd").addEventListener("click", function () {
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
  });
  document.getElementById("btn-set-a").addEventListener("click", function () {
    loopA = video.currentTime;
    if (loopB != null && loopB <= loopA) loopB = null;
    updateLoopStatus();
  });
  document.getElementById("btn-set-b").addEventListener("click", function () {
    loopB = video.currentTime;
    if (loopA != null && loopB <= loopA) loopA = null;
    updateLoopStatus();
  });
  document.getElementById("btn-back-to-list").addEventListener("click", showList);

  // Thumbnail lazy-loading: max concurrent loads so the list stays responsive.
  var thumbMaxConcurrent = 3;
  var thumbActiveLoads = 0;
  var thumbPending = [];
  var thumbObserver = null;

  function thumbTryLoadNext() {
    if (playerVisible) return;
    if (thumbActiveLoads >= thumbMaxConcurrent || thumbPending.length === 0) return;
    var item = thumbPending.shift();
    if (!item || !item.card.dataset.videoPath) return;
    var thumbVideo = item.thumbVideo;
    var path = item.card.dataset.videoPath;
    thumbVideo.src = API_BASE + encodeURI(path).replace(/%2F/g, "/");
    thumbActiveLoads += 1;
    function done() {
      thumbActiveLoads -= 1;
      thumbTryLoadNext();
    }
    thumbVideo.addEventListener("loadedmetadata", done, { once: true });
    thumbVideo.addEventListener("error", done, { once: true });
  }

  function thumbOnVisible(entries, observer) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var card = entry.target;
      observer.unobserve(card);
      if (card.dataset.thumbStarted) return;
      var thumbVideo = card.querySelector(".video-card-thumb video");
      if (!thumbVideo || thumbVideo.src) return;
      card.dataset.thumbStarted = "1";
      thumbPending.push({ card: card, thumbVideo: thumbVideo });
      thumbTryLoadNext();
    });
  }

  function thumbCancelAll() {
    videoList.querySelectorAll(".video-card").forEach(function (card) {
      var v = card.querySelector(".video-card-thumb video");
      if (v && v.src) {
        v.removeAttribute("src");
        v.load();
        var thumbWrap = card.querySelector(".video-card-thumb");
        if (thumbWrap) {
          thumbWrap.classList.remove("loaded", "error");
        }
        delete card.dataset.thumbStarted;
        if (thumbObserver) thumbObserver.observe(card);
      }
    });
    thumbPending.length = 0;
  }

  // Load video list from server API (same API the Flutter app will use).
  function loadList() {
    listStatus.textContent = "Loading…";
    fetch(API_BASE + "/api/videos")
      .then(function (r) {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(function (data) {
        listStatus.textContent = data.videos.length ? "Pick a video:" : "No videos found. Add files to the server media folder.";
        videoList.innerHTML = "";
        thumbPending.length = 0;

        data.videos.forEach(function (v) {
          const card = document.createElement("div");
          card.className = "video-card";
          card.setAttribute("role", "button");
          card.tabIndex = 0;
          card.dataset.videoPath = v.path;

          const thumbWrap = document.createElement("div");
          thumbWrap.className = "video-card-thumb";
          const thumbVideo = document.createElement("video");
          thumbVideo.muted = true;
          thumbVideo.preload = "metadata";
          thumbVideo.playsInline = true;
          thumbVideo.setAttribute("crossorigin", "anonymous");
          // src set later when card is visible (lazy load)
          thumbVideo.addEventListener("loadedmetadata", function onMeta() {
            var targetTime = thumbVideo.duration >= 1 ? 1 : (thumbVideo.duration || 1) * 0.5;
            thumbVideo.currentTime = Math.min(targetTime, Math.max(0, thumbVideo.duration - 0.1));
          });
          thumbVideo.addEventListener("seeked", function () {
            thumbWrap.classList.add("loaded");
          });
          thumbVideo.addEventListener("loadeddata", function () {
            if (!thumbWrap.classList.contains("loaded") && thumbVideo.readyState >= 2) {
              thumbWrap.classList.add("loaded");
            }
          });
          thumbVideo.addEventListener("error", function () {
            thumbWrap.classList.add("error");
          });
          thumbWrap.appendChild(thumbVideo);
          card.appendChild(thumbWrap);

          const nameEl = document.createElement("div");
          nameEl.className = "video-card-name";
          nameEl.textContent = v.name;
          card.appendChild(nameEl);

          function openVideo(e) {
            if (e) e.preventDefault();
            playVideo(v.path);
          }
          card.addEventListener("click", openVideo);
          card.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openVideo(e);
            }
          });

          videoList.appendChild(card);
        });

        // Lazy-load thumbnails when cards enter the viewport (max 3 at a time).
        // Large rootMargin so cards below the fold are queued too; they load 3 at a time.
        if (typeof IntersectionObserver !== "undefined") {
          thumbObserver = new IntersectionObserver(thumbOnVisible, {
            root: null,
            rootMargin: "9999px 0px 9999px 0px",
            threshold: 0.01
          });
          videoList.querySelectorAll(".video-card").forEach(function (card) {
            thumbObserver.observe(card);
          });
        } else {
          // Fallback: load all thumbnails in sequence (no IntersectionObserver).
          videoList.querySelectorAll(".video-card").forEach(function (card) {
            thumbPending.push({
              card: card,
              thumbVideo: card.querySelector(".video-card-thumb video")
            });
            card.dataset.thumbStarted = "1";
          });
          thumbTryLoadNext();
        }
      })
      .catch(function (err) {
        listStatus.textContent = "Error loading list: " + err.message;
      });
  }

  function showList() {
    video.pause();
    video.removeAttribute("src");
    video.load();
    playerSection.classList.add("hidden");
    videoListSection.classList.remove("hidden");
    currentVideoPath = null;
    playerVisible = false;
    thumbTryLoadNext();
    if (location.hash && location.hash.indexOf("#/watch") === 0) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function resetVideoElement() {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  function playVideo(path) {
    thumbCancelAll();
    resetVideoElement();
    currentVideoPath = path;
    playerVisible = true;
    var videoUrl = API_BASE + encodeURI(path).replace(/%2F/g, "/");
    // Defer setting src so the previous request is fully aborted before we start a new one.
    setTimeout(function () {
      if (currentVideoPath !== path) return;
      video.src = videoUrl;
      video.load();
    }, 0);
    video.playbackRate = parseFloat(speedSelect.value);
    loopA = loopB = null;
    updateLoopStatus();
    setPlayerStatus("Loading…");
    showPlayer();
    // Update browser URL so it reflects the current video (not just "index").
    var hash = "#/watch" + path;
    if (location.hash !== hash) {
      history.replaceState({ path: path }, "", location.pathname + location.search + hash);
    }
  }

  loadList();

  // Restore video from URL hash on load (e.g. refresh or bookmark #/watch/videos/0).
  if (location.hash.indexOf("#/watch") === 0) {
    try {
      var path = decodeURIComponent(location.hash.slice("#/watch".length));
      if (path) playVideo(path);
    } catch (e) {}
  }
})();
