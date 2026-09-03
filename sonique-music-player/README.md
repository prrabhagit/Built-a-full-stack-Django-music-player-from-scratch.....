# Sonique — Django Music Player

A full-stack, Spotify-inspired music player built with Django, vanilla
JavaScript, and the HTML5 Audio API. No frontend frameworks.

## Architecture

- **Backend:** Django 6 app (`music`) with models for `Artist`, `Album`,
  `Genre`, `Song`, `Playlist`, `PlaylistSong`, `Favorite`, `PlayHistory`,
  and `UserProfile`.
- **Pages** (server-rendered): home dashboard, search, favorites, playlists,
  playlist detail, login/register, profile.
- **JSON API** under `/api/` for everything the JavaScript player needs:
  listing/searching songs, toggling favorites, and managing playlists.
- **Frontend:** a single reusable `MusicPlayer` class (`static/js/player.js`)
  that wraps the `<audio>` element, plus `static/js/app.js` which wires the
  persistent player bar UI to that class and handles click-to-play,
  favoriting, and "add to playlist" across every page via event delegation.
  `static/js/search.js` and `static/js/playlist_detail.js` handle the
  behavior specific to those two pages.
- **How the backend talks to the player:** Django templates render song
  cards/rows with `data-*` attributes (`data-song-id`, `data-audio`,
  `data-cover`, etc.). `app.js` reads those attributes to build a queue and
  hand it to `MusicPlayer`. Mutations (favorite, add/remove from playlist,
  rename/delete playlist) go through the JSON API using `fetch` with the
  CSRF token embedded in `window.SONIQUE` by `base.html`.

## 1. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

## 3. Run migrations

The project ships with migrations already generated, so you just need to
apply them:

```bash
python manage.py migrate
```

(If you ever change `music/models.py`, run
`python manage.py makemigrations music` first.)

## 4. Create a superuser

```bash
python manage.py createsuperuser
```

## 5. Run the development server

```bash
python manage.py runserver
```

Visit `http://127.0.0.1:8000/`.

## 6. Upload music through Django Admin

1. Go to `http://127.0.0.1:8000/admin/` and log in with your superuser.
2. Add a **Genre** and an **Artist** (and optionally an **Album**).
3. Add a **Song**: pick the artist/album/genre, upload an audio file and
   cover image, and set the duration in seconds (optional — the player
   still works if you leave it as `0`; the seek bar uses the real audio
   duration once loaded).
4. Repeat for a handful of songs so the homepage has something to show.

## 7. Create a regular user account

Use the "Sign up" link on the site (`/register/`) to create a normal user
for testing playlists/favorites — these are private per-user, so the admin
account and a regular account will see different playlists/favorites.

## Testing checklist

- [ ] Homepage shows recently added / popular songs as cards
- [ ] Clicking a song card starts playback in the bottom player bar
- [ ] Play/pause, next, previous, seek bar, and volume all work
- [ ] Shuffle and repeat (off → all → one) toggle correctly and persist
      across a page reload (stored in `localStorage`)
- [ ] Search page returns live results as you type (songs/artists/albums/genres)
- [ ] Logged-in user can like a song (heart icon) and see it under Favorites
- [ ] Logged-in user can create a playlist, add songs to it, rename it,
      remove songs from it, play the whole playlist, and delete it
- [ ] Logged-out user is redirected to `/login/` when trying to like a song
      or open the playlist picker
- [ ] Each user only sees their own playlists and favorites
- [ ] Layout adapts correctly on a narrow (mobile) viewport: sidebar
      collapses behind a menu button, bottom nav appears, player bar
      switches to its compact stacked layout
- [ ] Django admin lets you add songs, artists, albums, genres and manage
      users/playlists with search, filters, and image previews

## Project layout

```text
music_player/
├── manage.py
├── requirements.txt
├── music_player/          # project settings, urls, wsgi/asgi
├── music/                 # the app: models, views, urls, admin, forms, signals
│   └── migrations/
├── templates/              # base.html + page templates + partials/
├── static/
│   ├── css/style.css
│   └── js/                 # player.js, app.js, search.js, playlist_detail.js
└── media/                  # uploaded songs/ and covers/ (gitignored)
```
