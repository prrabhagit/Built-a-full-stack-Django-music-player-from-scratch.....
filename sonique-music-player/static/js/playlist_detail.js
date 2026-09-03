(function () {
  "use strict";

  const csrfHeaders = () => ({
    "Content-Type": "application/json",
    "X-CSRFToken": window.SONIQUE.csrfToken,
  });

  const playAllBtn = document.getElementById("play-all-btn");
  const renameBtn = document.getElementById("rename-playlist-btn");
  const deleteBtn = document.getElementById("delete-playlist-btn");
  const listWrap = document.getElementById("playlist-song-list");

  if (playAllBtn) {
    playAllBtn.addEventListener("click", () => {
      if (!listWrap) return;
      const nodes = Array.from(listWrap.querySelectorAll("[data-song-id][data-audio]"));
      const songs = nodes.map((el) => ({
        id: parseInt(el.dataset.songId, 10),
        title: el.dataset.title,
        artist: el.dataset.artist,
        audioUrl: el.dataset.audio,
        coverUrl: el.dataset.cover || null,
      }));
      if (!songs.length) {
        window.soniqueToast("This playlist is empty", "error");
        return;
      }
      window.soniquePlayer.setQueue(songs, 0);
    });
  }

  if (renameBtn) {
    renameBtn.addEventListener("click", () => {
      const playlistId = renameBtn.dataset.playlistId;
      const currentName = document.getElementById("playlist-name-display").textContent.trim();
      const newName = prompt("Rename playlist", currentName);
      if (!newName || newName.trim() === currentName) return;

      fetch(`/api/playlists/${playlistId}/`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ name: newName.trim() }),
      })
        .then((r) => r.json())
        .then((data) => {
          document.getElementById("playlist-name-display").textContent = data.name;
          document.title = `${data.name} — Sonique`;
          window.soniqueToast("Playlist renamed", "success");
        })
        .catch(() => window.soniqueToast("Couldn't rename playlist", "error"));
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      const playlistId = deleteBtn.dataset.playlistId;
      if (!confirm("Delete this playlist? This can't be undone.")) return;
      fetch(`/api/playlists/${playlistId}/`, {
        method: "DELETE",
        headers: csrfHeaders(),
      })
        .then(() => {
          window.location.href = "/playlists/";
        })
        .catch(() => window.soniqueToast("Couldn't delete playlist", "error"));
    });
  }

  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".row-remove-btn");
    if (!removeBtn) return;
    e.preventDefault();
    const songId = removeBtn.dataset.songId;
    const playlistId = removeBtn.dataset.playlistId;
    fetch(`/api/playlists/${playlistId}/songs/`, {
      method: "DELETE",
      headers: csrfHeaders(),
      body: JSON.stringify({ song_id: songId }),
    })
      .then((r) => r.json())
      .then(() => {
        removeBtn.closest(".song-row").remove();
        window.soniqueToast("Removed from playlist", "success");
      })
      .catch(() => window.soniqueToast("Couldn't remove song", "error"));
  });
})();
