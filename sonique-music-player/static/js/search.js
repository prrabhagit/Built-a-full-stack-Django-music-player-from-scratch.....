(function () {
  "use strict";

  const input = document.getElementById("search-input");
  if (!input) return;

  const emptyState = document.getElementById("search-empty");
  const songsWrap = document.getElementById("search-songs-wrap");
  const songsList = document.getElementById("search-songs");
  const artistsWrap = document.getElementById("search-artists-wrap");
  const artistsList = document.getElementById("search-artists");
  const albumsWrap = document.getElementById("search-albums-wrap");
  const albumsList = document.getElementById("search-albums");
  const genresWrap = document.getElementById("search-genres-wrap");
  const genresList = document.getElementById("search-genres");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function songRowHtml(song) {
    return `
      <div class="song-row"
           data-song-id="${song.id}"
           data-title="${escapeHtml(song.title)}"
           data-artist="${escapeHtml(song.artist)}"
           data-audio="${song.audioUrl || ""}"
           data-cover="${song.coverUrl || ""}">
        <button class="row-play-btn" aria-label="Play ${escapeHtml(song.title)}">
          <svg class="row-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <span class="row-index">&#9835;</span>
        </button>
        <div class="row-art">
          ${song.coverUrl ? `<img src="${song.coverUrl}" alt="">` : `<div class="art-fallback small">&#9835;</div>`}
        </div>
        <div class="row-info">
          <p class="row-title">${escapeHtml(song.title)}</p>
          <p class="row-artist">${escapeHtml(song.artist)}</p>
        </div>
        <span class="row-album">${escapeHtml(song.album || "—")}</span>
        <span class="row-duration"></span>
        <div class="row-actions">
          <button class="icon-btn row-like-btn" data-song-id="${song.id}" aria-label="Like">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.35-9.5-8.8C1 8 2.4 4.5 6 4.1c2-.2 3.6.9 4.5 2.4a5 5 0 0 1 3-2.4c3.6-.4 5 3 4 7.1C15.9 15.65 12 20 12 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
          </button>
          <button class="icon-btn row-add-btn" data-song-id="${song.id}" aria-label="Add to playlist">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>`;
  }

  function render(data) {
    const hasResults =
      data.songs.length || data.artists.length || data.albums.length || data.genres.length;
    emptyState.style.display = hasResults ? "none" : "block";
    emptyState.textContent = hasResults ? "" : "No results found.";

    songsWrap.style.display = data.songs.length ? "block" : "none";
    songsList.innerHTML = data.songs.map(songRowHtml).join("");
    const favIds = new Set(window.SONIQUE.favoriteIds || []);
    songsList.querySelectorAll(".row-like-btn").forEach((btn) => {
      if (favIds.has(Number(btn.dataset.songId))) btn.classList.add("active");
    });

    artistsWrap.style.display = data.artists.length ? "block" : "none";
    artistsList.innerHTML = data.artists
      .map((a) => `<span class="chip">${escapeHtml(a.name)}</span>`)
      .join("");

    albumsWrap.style.display = data.albums.length ? "block" : "none";
    albumsList.innerHTML = data.albums
      .map((a) => `<span class="chip">${escapeHtml(a.title)} — ${escapeHtml(a.artist)}</span>`)
      .join("");

    genresWrap.style.display = data.genres.length ? "block" : "none";
    genresList.innerHTML = data.genres
      .map((g) => `<span class="chip">${escapeHtml(g.name)}</span>`)
      .join("");
  }

  let debounceTimer = null;
  function runSearch(query) {
    if (!query.trim()) {
      emptyState.style.display = "block";
      emptyState.textContent = "Start typing to search your library.";
      [songsWrap, artistsWrap, albumsWrap, genresWrap].forEach((el) => (el.style.display = "none"));
      return;
    }
    fetch(`${window.SONIQUE.urls.apiSearch}?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then(render)
      .catch(() => {});
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(input.value), 250);
  });

  if (input.value.trim()) runSearch(input.value);
})();
