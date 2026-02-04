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

  let loopA = null;
  let loopB = null;

  function showList() {
    playerSection.classList.add("hidden");
    videoListSection.classList.remove("hidden");
  }

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
        data.videos.forEach(function (v) {
          const card = document.createElement("div");
          card.className = "video-card";
          card.setAttribute("role", "button");
          card.tabIndex = 0;

          const thumbWrap = document.createElement("div");
          thumbWrap.className = "video-card-thumb";
          const thumbVideo = document.createElement("video");
          thumbVideo.muted = true;
          thumbVideo.preload = "metadata";
          thumbVideo.playsInline = true;
          thumbVideo.setAttribute("crossorigin", "anonymous");
          // Encode path so filenames with spaces/special chars work
          thumbVideo.src = API_BASE + encodeURI(v.path).replace(/%2F/g, "/");
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
      })
      .catch(function (err) {
        listStatus.textContent = "Error loading list: " + err.message;
      });
  }

  function playVideo(path) {
    video.src = API_BASE + encodeURI(path).replace(/%2F/g, "/");
    video.load();
    video.playbackRate = parseFloat(speedSelect.value);
    loopA = loopB = null;
    updateLoopStatus();
    showPlayer();
  }

  loadList();
})();
