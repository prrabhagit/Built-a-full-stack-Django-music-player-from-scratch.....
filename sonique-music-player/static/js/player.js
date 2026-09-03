/**
 * MusicPlayer — a small, dependency-free wrapper around the HTML5 <audio>
 * element. Owns the playback queue, shuffle/repeat state, and volume, and
 * dispatches window-level custom events so any page can react to changes
 * without being tightly coupled to this class.
 *
 * Events dispatched on `window`:
 *   sonique:songchange  -> { detail: { song } }
 *   sonique:playstate   -> { detail: { playing } }
 *   sonique:timeupdate  -> { detail: { currentTime, duration } }
 *   sonique:queuechange -> { detail: { queue, currentIndex } }
 *   sonique:volumechange-> { detail: { volume, muted } }
 */
class MusicPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = "metadata";

    this.queue = [];
    this.currentIndex = -1;
    this.shuffleOrder = [];
    this.shuffle = localStorage.getItem("sonique:shuffle") === "true";
    this.repeat = localStorage.getItem("sonique:repeat") || "off"; // off | all | one
    this._playedSongIds = new Set();

    const storedVolume = parseFloat(localStorage.getItem("sonique:volume"));
    this.audio.volume = Number.isFinite(storedVolume) ? storedVolume : 0.8;
    this.muted = localStorage.getItem("sonique:muted") === "true";
    this.audio.muted = this.muted;

    this._bindAudioEvents();
  }

  _bindAudioEvents() {
    this.audio.addEventListener("loadedmetadata", () => {
      this._emit("timeupdate", {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration || 0,
      });
    });

    this.audio.addEventListener("timeupdate", () => {
      this._emit("timeupdate", {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration || 0,
      });
    });

    this.audio.addEventListener("play", () => this._emit("playstate", { playing: true }));
    this.audio.addEventListener("pause", () => this._emit("playstate", { playing: false }));

    this.audio.addEventListener("ended", () => {
      if (this.repeat === "one") {
        this.seekTo(0);
        this.audio.play();
        return;
      }
      this.nextSong({ auto: true });
    });

    this.audio.addEventListener("volumechange", () => {
      this._emit("volumechange", { volume: this.audio.volume, muted: this.audio.muted });
    });

    this.audio.addEventListener("error", () => {
      this._emit("error", { song: this.currentSong() });
    });
  }

  _emit(name, detail) {
    window.dispatchEvent(new CustomEvent(`sonique:${name}`, { detail }));
  }

  currentSong() {
    return this.queue[this.currentIndex] || null;
  }

  /** Replace the whole queue and start playing at `startIndex`. */
  setQueue(songs, startIndex = 0) {
    this.queue = songs.slice();
    this._rebuildShuffleOrder();
    this._emit("queuechange", { queue: this.queue, currentIndex: startIndex });
    this.playAt(startIndex);
  }

  addToQueue(song) {
    this.queue.push(song);
    this._rebuildShuffleOrder();
    this._emit("queuechange", { queue: this.queue, currentIndex: this.currentIndex });
  }

  /** Play a single song immediately, replacing the queue with just that song. */
  playSong(song) {
    this.setQueue([song], 0);
  }

  playAt(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.currentIndex = index;
    const song = this.queue[index];
    this.audio.src = song.audioUrl;
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {
      /* Autoplay can be blocked before a user gesture; UI stays paused. */
    });
    this._emit("songchange", { song });
    this._logPlay(song);
  }

  _logPlay(song) {
    // Only ping the server once per song per session to keep play_count sane.
    if (this._playedSongIds.has(song.id)) return;
    this._playedSongIds.add(song.id);
    const url = (window.SONIQUE.urls.playSongTemplate || "").replace("0", song.id);
    fetch(url, {
      method: "POST",
      headers: { "X-CSRFToken": window.SONIQUE.csrfToken },
    }).catch(() => {});
  }

  pauseSong() {
    this.audio.pause();
  }

  resumeSong() {
    if (this.currentSong()) this.audio.play().catch(() => {});
  }

  togglePlayPause() {
    if (!this.currentSong()) return;
    if (this.audio.paused) this.resumeSong();
    else this.pauseSong();
  }

  nextSong({ auto = false } = {}) {
    if (!this.queue.length) return;

    if (this.shuffle) {
      const pos = this.shuffleOrder.indexOf(this.currentIndex);
      const nextPos = pos + 1;
      if (nextPos >= this.shuffleOrder.length) {
        if (this.repeat === "all") this._rebuildShuffleOrder();
        else if (auto) return this.pauseSong();
        this.playAt(this.shuffleOrder[0]);
        return;
      }
      this.playAt(this.shuffleOrder[nextPos]);
      return;
    }

    const next = this.currentIndex + 1;
    if (next >= this.queue.length) {
      if (this.repeat === "all") this.playAt(0);
      else if (auto) this.pauseSong();
      return;
    }
    this.playAt(next);
  }

  previousSong() {
    if (!this.queue.length) return;
    // Restart current track if we're more than 3s in (standard player UX).
    if (this.audio.currentTime > 3) {
      this.seekTo(0);
      return;
    }

    if (this.shuffle) {
      const pos = this.shuffleOrder.indexOf(this.currentIndex);
      const prevPos = pos - 1;
      if (prevPos < 0) return;
      this.playAt(this.shuffleOrder[prevPos]);
      return;
    }

    const prev = this.currentIndex - 1;
    if (prev < 0) return;
    this.playAt(prev);
  }

  seekTo(seconds) {
    if (!Number.isFinite(seconds)) return;
    this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
  }

  seekToPercent(percent) {
    const duration = this.audio.duration || 0;
    this.seekTo((percent / 100) * duration);
  }

  setVolume(percent) {
    const v = Math.max(0, Math.min(1, percent / 100));
    this.audio.volume = v;
    this.audio.muted = false;
    this.muted = false;
    localStorage.setItem("sonique:volume", String(v));
    localStorage.setItem("sonique:muted", "false");
  }

  toggleMute() {
    this.muted = !this.muted;
    this.audio.muted = this.muted;
    localStorage.setItem("sonique:muted", String(this.muted));
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    localStorage.setItem("sonique:shuffle", String(this.shuffle));
    this._rebuildShuffleOrder();
    return this.shuffle;
  }

  /** Cycles off -> all -> one -> off */
  toggleRepeat() {
    const order = ["off", "all", "one"];
    this.repeat = order[(order.indexOf(this.repeat) + 1) % order.length];
    localStorage.setItem("sonique:repeat", this.repeat);
    return this.repeat;
  }

  _rebuildShuffleOrder() {
    const indices = this.queue.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    // Keep the currently playing track first in the shuffle order so
    // "next" behaves intuitively right after a shuffle toggle.
    if (this.currentIndex >= 0) {
      const pos = indices.indexOf(this.currentIndex);
      if (pos > -1) {
        indices.splice(pos, 1);
        indices.unshift(this.currentIndex);
      }
    }
    this.shuffleOrder = indices;
  }
}

window.soniquePlayer = new MusicPlayer();
