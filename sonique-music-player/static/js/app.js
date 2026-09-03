(function () {
  "use strict";

  const player = window.soniquePlayer;
  const csrfHeaders = () => ({
    "Content-Type": "application/json",
    "X-CSRFToken": window.SONIQUE.csrfToken,
  });

  /* ---------------------------------------------------------------- */
  /* Toasts                                                            */
  /* ---------------------------------------------------------------- */

  function toast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  window.soniqueToast = toast;

  /* ---------------------------------------------------------------- */
  /* Player bar UI binding                                             */
  /* ---------------------------------------------------------------- */

  const els = {
    bar: document.getElementById("player-bar"),
    cover: document.getElementById("player-cover"),
    title: document.getElementById("player-title"),
    artist: document.getElementById("player-artist"),
    likeBtn: document.getElementById("player-like-btn"),
    playPauseBtn: document.getElementById("play-pause-btn"),
    iconPlay: document.getElementById("icon-play"),
    iconPause: document.getElementById("icon-pause"),
    prevBtn: document.getElementById("prev-btn"),
    nextBtn: document.getElementById("next-btn"),
    shuffleBtn: document.getElementById("shuffle-btn"),
    repeatBtn: document.getElementById("repeat-btn"),
    repeatOneDot: document.getElementById("repeat-one-dot"),
    seekBar: document.getElementById("seek-bar"),
    currentTime: document.getElementById("current-time"),
    totalTime: document.getElementById("total-time"),
    volumeBar: document.getElementById("volume-bar"),
    muteBtn: document.getElementById("mute-btn"),
    iconVolOn: document.getElementById("icon-vol-on"),
    iconVolOff: document.getElementById("icon-vol-off"),
    queueBtn: document.getElementById("queue-btn"),
    queueDrawer: document.getElementById("queue-drawer"),
    queueList: document.getElementById("queue-list"),
    closeQueueBtn: document.getElementById("close-queue-btn"),
    drawerOverlay: document.getElementById("drawer-overlay"),
  };

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  let favoriteIds = new Set(window.SONIQUE.favoriteIds || []);

  function syncLikeButtons(songId, isFavorited) {
    document.querySelectorAll(`[data-song-id="${songId}"].row-like-btn`).forEach((btn) => {
      btn.classList.toggle("active", isFavorited);
    });
    if (els.likeBtn && els.likeBtn.dataset.songId === String(songId)) {
      els.likeBtn.classList.toggle("active", isFavorited);
    }
  }

  function updatePlayerUI(song) {
    if (!song) return;
    els.cover.src = song.coverUrl || "";
    els.cover.style.visibility = song.coverUrl ? "visible" : "hidden";
    els.title.textContent = song.title;
    els.artist.textContent = song.artist;
    els.likeBtn.dataset.songId = song.id;
    els.likeBtn.classList.toggle("active", favoriteIds.has(Number(song.id)));
    document.title = `${song.title} — Sonique`;

    document.querySelectorAll(".song-row.playing, .song-card.playing").forEach((n) =>
      n.classList.remove("playing")
    );
    document
      .querySelectorAll(`[data-song-id="${song.id}"]`)
      .forEach((n) => {
        if (n.classList.contains("song-row") || n.classList.contains("song-card")) {
          n.classList.add("playing");
        }
      });

    renderQueue();
  }

  function renderQueue() {
    if (!els.queueList) return;
    els.queueList.innerHTML = "";
    player.queue.forEach((song, i) => {
      const item = document.createElement("div");
      item.className = "queue-item" + (i === player.currentIndex ? " current" : "");
      item.innerHTML = `
        <img src="${song.coverUrl || ""}" alt="">
        <div class="queue-item-info">
          <p class="row-title">${escapeHtml(song.title)}</p>
          <p class="row-artist">${escapeHtml(song.artist)}</p>
        </div>`;
      item.addEventListener("click", () => player.playAt(i));
      els.queueList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  window.addEventListener("sonique:songchange", (e) => updatePlayerUI(e.detail.song));

  window.addEventListener("sonique:playstate", (e) => {
    els.iconPlay.style.display = e.detail.playing ? "none" : "block";
    els.iconPause.style.display = e.detail.playing ? "block" : "none";
    els.playPauseBtn.setAttribute("aria-label", e.detail.playing ? "Pause" : "Play");
  });

  window.addEventListener("sonique:timeupdate", (e) => {
    const { currentTime, duration } = e.detail;
    els.currentTime.textContent = formatTime(currentTime);
    els.totalTime.textContent = formatTime(duration);
    if (duration > 0 && !els.seekBar.dragging) {
      els.seekBar.value = (currentTime / duration) * 100;
    }
  });

  window.addEventListener("sonique:queuechange", renderQueue);

  window.addEventListener("sonique:volumechange", (e) => {
    if (!els.volumeBar.dragging) {
      els.volumeBar.value = e.detail.muted ? 0 : Math.round(e.detail.volume * 100);
    }
    const showMuted = e.detail.muted || e.detail.volume === 0;
    els.iconVolOn.style.display = showMuted ? "none" : "block";
    els.iconVolOff.style.display = showMuted ? "block" : "none";
  });

  // Restore persisted volume/shuffle/repeat visuals on load.
  els.volumeBar.value = Math.round((player.audio.muted ? 0 : player.audio.volume) * 100);
  els.shuffleBtn.classList.toggle("active", player.shuffle);
  els.repeatBtn.classList.toggle("active", player.repeat !== "off");
  els.repeatOneDot.style.display = player.repeat === "one" ? "block" : "none";

  els.playPauseBtn.addEventListener("click", () => player.togglePlayPause());
  els.nextBtn.addEventListener("click", () => player.nextSong());
  els.prevBtn.addEventListener("click", () => player.previousSong());

  els.shuffleBtn.addEventListener("click", () => {
    const on = player.toggleShuffle();
    els.shuffleBtn.classList.toggle("active", on);
    toast(on ? "Shuffle on" : "Shuffle off");
  });

  els.repeatBtn.addEventListener("click", () => {
    const mode = player.toggleRepeat();
    els.repeatBtn.classList.toggle("active", mode !== "off");
    els.repeatOneDot.style.display = mode === "one" ? "block" : "none";
  });

  els.seekBar.addEventListener("input", () => {
    els.seekBar.dragging = true;
  });
  els.seekBar.addEventListener("change", () => {
    player.seekToPercent(parseFloat(els.seekBar.value));
    els.seekBar.dragging = false;
  });

  els.volumeBar.addEventListener("input", () => {
    els.volumeBar.dragging = true;
    player.setVolume(parseFloat(els.volumeBar.value));
  });
  els.volumeBar.addEventListener("change", () => {
    els.volumeBar.dragging = false;
  });

  els.muteBtn.addEventListener("click", () => player.toggleMute());

  els.likeBtn.addEventListener("click", () => toggleFavorite(els.likeBtn.dataset.songId, els.likeBtn));

  els.queueBtn.addEventListener("click", () => {
    els.queueDrawer.classList.add("open");
    els.drawerOverlay.classList.add("open");
  });
  function closeQueue() {
    els.queueDrawer.classList.remove("open");
    els.drawerOverlay.classList.remove("open");
  }
  els.closeQueueBtn.addEventListener("click", closeQueue);
  els.drawerOverlay.addEventListener("click", closeQueue);

  /* ---------------------------------------------------------------- */
  /* Mobile sidebar toggle                                             */
  /* ---------------------------------------------------------------- */

  const menuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.querySelector(".sidebar");
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
      sidebar.style.display = sidebar.style.display === "flex" ? "none" : "flex";
      if (sidebar.style.display === "flex") {
        sidebar.style.position = "fixed";
        sidebar.style.zIndex = "250";
        sidebar.style.boxShadow = "0 0 0 100vmax rgba(0,0,0,0.5)";
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Click-to-play delegation for song cards / rows                    */
  /* ---------------------------------------------------------------- */

  function songFromEl(el) {
    return {
      id: parseInt(el.dataset.songId, 10),
      title: el.dataset.title,
      artist: el.dataset.artist,
      audioUrl: el.dataset.audio,
      coverUrl: el.dataset.cover || null,
    };
  }

  function playFromContainer(clickedEl) {
    const container =
      clickedEl.closest(".song-list, .card-grid") || clickedEl.parentElement;
    const nodes = Array.from(
      (container || document).querySelectorAll("[data-song-id][data-audio]")
    );
    const songs = nodes.map(songFromEl).filter((s) => s.audioUrl);
    const clickedId = parseInt(clickedEl.dataset.songId, 10);
    const startIndex = songs.findIndex((s) => s.id === clickedId);
    if (!songs.length) return;
    player.setQueue(songs, Math.max(startIndex, 0));
  }

  document.addEventListener("click", (e) => {
    const overlayBtn = e.target.closest(".play-overlay-btn");
    if (overlayBtn) {
      e.preventDefault();
      const card = overlayBtn.closest(".song-card");
      if (card) playFromContainer(card);
      return;
    }

    const rowPlayBtn = e.target.closest(".row-play-btn");
    if (rowPlayBtn) {
      e.preventDefault();
      const row = rowPlayBtn.closest(".song-row");
      if (row) playFromContainer(row);
      return;
    }

    // Clicking the card body itself (not a nested button) also plays it.
    const card = e.target.closest(".song-card");
    if (card && !e.target.closest("button")) {
      playFromContainer(card);
      return;
    }
    const row = e.target.closest(".song-row");
    if (row && !e.target.closest("button")) {
      playFromContainer(row);
      return;
    }

    const likeBtn = e.target.closest(".row-like-btn");
    if (likeBtn) {
      e.preventDefault();
      toggleFavorite(likeBtn.dataset.songId, likeBtn);
      return;
    }

    const addBtn = e.target.closest(".row-add-btn");
    if (addBtn) {
      e.preventDefault();
      openAddToPlaylist(addBtn.dataset.songId);
      return;
    }
  });

  /* ---------------------------------------------------------------- */
  /* Favorites                                                         */
  /* ---------------------------------------------------------------- */

  function toggleFavorite(songId, btnEl) {
    if (!window.SONIQUE.isAuthenticated) {
      window.location.href = "/login/";
      return;
    }
    fetch(window.SONIQUE.urls.apiFavorites, {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ song_id: songId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.favorited) favoriteIds.add(Number(songId));
        else favoriteIds.delete(Number(songId));
        syncLikeButtons(songId, data.favorited);
        toast(data.favorited ? "Added to Liked Songs" : "Removed from Liked Songs", "success");
      })
      .catch(() => toast("Something went wrong", "error"));
  }

  /* ---------------------------------------------------------------- */
  /* Add-to-playlist picker                                            */
  /* ---------------------------------------------------------------- */

  function openAddToPlaylist(songId) {
    if (!window.SONIQUE.isAuthenticated) {
      window.location.href = "/login/";
      return;
    }
    fetch(window.SONIQUE.urls.apiPlaylists)
      .then((r) => r.json())
      .then((data) => {
        let overlay = document.getElementById("add-to-playlist-overlay");
        if (overlay) overlay.remove();

        overlay = document.createElement("div");
        overlay.className = "modal-overlay open";
        overlay.id = "add-to-playlist-overlay";

        const items = data.results.length
          ? data.results
              .map(
                (p) => `
            <div class="picker-item">
              <span>${escapeHtml(p.name)}</span>
              <button data-playlist-id="${p.id}">Add</button>
            </div>`
              )
              .join("")
          : `<p class="empty-state">No playlists yet. Create one from the Playlists page.</p>`;

        overlay.innerHTML = `
          <div class="modal">
            <h2>Add to playlist</h2>
            <div class="picker-list">${items}</div>
            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" id="cancel-add-btn">Close</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);

        overlay.querySelectorAll("[data-playlist-id]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const playlistId = btn.dataset.playlistId;
            fetch(`/api/playlists/${playlistId}/songs/`, {
              method: "POST",
              headers: csrfHeaders(),
              body: JSON.stringify({ song_id: songId }),
            })
              .then((r) => r.json())
              .then((res) => {
                toast(
                  res.status === "added" ? "Added to playlist" : "Already in that playlist",
                  "success"
                );
                overlay.remove();
              })
              .catch(() => toast("Something went wrong", "error"));
          });
        });

        overlay.querySelector("#cancel-add-btn").addEventListener("click", () => overlay.remove());
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) overlay.remove();
        });
      })
      .catch(() => toast("Couldn't load playlists", "error"));
  }
})();
