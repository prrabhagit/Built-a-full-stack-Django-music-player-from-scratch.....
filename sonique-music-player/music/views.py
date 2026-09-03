import json

from django.contrib.auth import login as auth_login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.views import LoginView, LogoutView
from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .forms import PlaylistForm, ProfileForm, RegisterForm
from .models import (
    Album,
    Artist,
    Favorite,
    Genre,
    PlayHistory,
    Playlist,
    PlaylistSong,
    Song,
)


# ---------------------------------------------------------------------------
# Page views (server-rendered templates)
# ---------------------------------------------------------------------------

def home(request):
    recently_added = Song.objects.select_related("artist", "album")[:12]
    popular = Song.objects.select_related("artist", "album").order_by(
        "-play_count", "-uploaded_at"
    )[:12]

    recently_played = []
    user_playlists = []
    if request.user.is_authenticated:
        history_song_ids = list(
            PlayHistory.objects.filter(user=request.user)
            .order_by("-played_at")
            .values_list("song_id", flat=True)
            .distinct()[:12]
        )
        songs_by_id = Song.objects.select_related("artist", "album").in_bulk(history_song_ids)
        recently_played = [songs_by_id[i] for i in history_song_ids if i in songs_by_id]
        user_playlists = Playlist.objects.filter(owner=request.user)[:8]

    albums = Album.objects.select_related("artist")[:10]
    artists = Artist.objects.all()[:10]
    genres = Genre.objects.annotate(song_count=Count("songs"))[:10]

    context = {
        "recently_added": recently_added,
        "recently_played": recently_played,
        "popular": popular,
        "albums": albums,
        "artists": artists,
        "genres": genres,
        "playlists": user_playlists,
    }
    return render(request, "home.html", context)


def register(request):
    if request.user.is_authenticated:
        return redirect("home")
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            auth_login(request, user)
            return redirect("home")
    else:
        form = RegisterForm()
    return render(request, "register.html", {"form": form})


class SoniqueLoginView(LoginView):
    template_name = "login.html"
    redirect_authenticated_user = True
    authentication_form = AuthenticationForm


class SoniqueLogoutView(LogoutView):
    next_page = "login"


def search_page(request):
    return render(request, "search.html", {"query": request.GET.get("q", "")})


@login_required
def favorites_page(request):
    favorites = (
        Favorite.objects.filter(user=request.user)
        .select_related("song", "song__artist", "song__album")
        .order_by("-created_at")
    )
    songs = [f.song for f in favorites]
    return render(request, "favorites.html", {"songs": songs})


@login_required
def playlists_page(request):
    if request.method == "POST":
        form = PlaylistForm(request.POST)
        if form.is_valid():
            playlist = form.save(commit=False)
            playlist.owner = request.user
            playlist.save()
            return redirect("playlist_detail", pk=playlist.pk)
    else:
        form = PlaylistForm()
    playlists = Playlist.objects.filter(owner=request.user)
    return render(request, "playlists.html", {"playlists": playlists, "form": form})


@login_required
def playlist_detail(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk, owner=request.user)
    playlist_songs = (
        PlaylistSong.objects.filter(playlist=playlist)
        .select_related("song", "song__artist", "song__album")
        .order_by("order", "added_at")
    )
    return render(
        request,
        "playlist_detail.html",
        {"playlist": playlist, "playlist_songs": playlist_songs},
    )


@login_required
def profile_page(request):
    profile = request.user.profile
    if request.method == "POST":
        form = ProfileForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            return redirect("profile")
    else:
        form = ProfileForm(instance=profile)
    stats = {
        "playlist_count": Playlist.objects.filter(owner=request.user).count(),
        "favorite_count": Favorite.objects.filter(user=request.user).count(),
        "songs_played": PlayHistory.objects.filter(user=request.user).count(),
    }
    return render(request, "profile.html", {"form": form, "stats": stats})


# ---------------------------------------------------------------------------
# JSON API
# ---------------------------------------------------------------------------

def _paginate(request, queryset, default_limit=50, max_limit=100):
    try:
        limit = min(int(request.GET.get("limit", default_limit)), max_limit)
    except (TypeError, ValueError):
        limit = default_limit
    try:
        offset = max(int(request.GET.get("offset", 0)), 0)
    except (TypeError, ValueError):
        offset = 0
    total = queryset.count()
    items = queryset[offset : offset + limit]
    return items, {"total": total, "limit": limit, "offset": offset}


@require_GET
def api_songs(request):
    qs = Song.objects.select_related("artist", "album", "genre")

    genre = request.GET.get("genre")
    artist = request.GET.get("artist")
    album = request.GET.get("album")
    ordering = request.GET.get("ordering")

    if genre:
        qs = qs.filter(genre__id=genre)
    if artist:
        qs = qs.filter(artist__id=artist)
    if album:
        qs = qs.filter(album__id=album)
    if ordering == "popular":
        qs = qs.order_by("-play_count", "-uploaded_at")
    elif ordering == "title":
        qs = qs.order_by("title")

    items, meta = _paginate(request, qs)
    data = {
        "results": [song.to_dict(request) for song in items],
        **meta,
    }
    return JsonResponse(data)


@require_GET
def api_search(request):
    q = (request.GET.get("q") or "").strip()
    if not q:
        return JsonResponse({"songs": [], "artists": [], "albums": [], "genres": []})

    songs = Song.objects.select_related("artist", "album").filter(
        Q(title__icontains=q) | Q(artist__name__icontains=q) | Q(album__title__icontains=q)
    )[:25]
    artists = Artist.objects.filter(name__icontains=q)[:10]
    albums = Album.objects.select_related("artist").filter(title__icontains=q)[:10]
    genres = Genre.objects.filter(name__icontains=q)[:10]

    return JsonResponse(
        {
            "songs": [s.to_dict(request) for s in songs],
            "artists": [{"id": a.id, "name": a.name} for a in artists],
            "albums": [
                {"id": a.id, "title": a.title, "artist": a.artist.name} for a in albums
            ],
            "genres": [{"id": g.id, "name": g.name} for g in genres],
        }
    )


@require_POST
def api_play_song(request, song_id):
    song = get_object_or_404(Song, pk=song_id)
    Song.objects.filter(pk=song.pk).update(play_count=song.play_count + 1)
    if request.user.is_authenticated:
        PlayHistory.objects.create(user=request.user, song=song)
    return JsonResponse({"status": "ok"})


@require_http_methods(["GET", "POST"])
@login_required
def api_favorites(request):
    if request.method == "GET":
        favorites = Favorite.objects.filter(user=request.user).select_related(
            "song", "song__artist", "song__album"
        )
        return JsonResponse({"results": [f.song.to_dict(request) for f in favorites]})

    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    song_id = body.get("song_id")
    if not song_id:
        return JsonResponse({"error": "song_id is required"}, status=400)
    song = get_object_or_404(Song, pk=song_id)

    favorite, created = Favorite.objects.get_or_create(user=request.user, song=song)
    if not created:
        favorite.delete()
        return JsonResponse({"status": "removed", "favorited": False})
    return JsonResponse({"status": "added", "favorited": True})


@require_http_methods(["GET", "POST"])
@login_required
def api_playlists(request):
    if request.method == "GET":
        playlists = Playlist.objects.filter(owner=request.user)
        return JsonResponse(
            {
                "results": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "description": p.description,
                        "songCount": p.song_count(),
                        "covers": p.cover_urls(),
                    }
                    for p in playlists
                ]
            }
        )

    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    name = (body.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "name is required"}, status=400)
    playlist = Playlist.objects.create(
        owner=request.user, name=name, description=body.get("description", "")
    )
    return JsonResponse(
        {"id": playlist.id, "name": playlist.name, "description": playlist.description},
        status=201,
    )


@require_http_methods(["GET", "PATCH", "DELETE"])
@login_required
def api_playlist_detail(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk, owner=request.user)

    if request.method == "GET":
        songs = (
            PlaylistSong.objects.filter(playlist=playlist)
            .select_related("song", "song__artist", "song__album")
            .order_by("order", "added_at")
        )
        return JsonResponse(
            {
                "id": playlist.id,
                "name": playlist.name,
                "description": playlist.description,
                "songs": [ps.song.to_dict(request) for ps in songs],
            }
        )

    if request.method == "PATCH":
        try:
            body = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)
        if "name" in body:
            playlist.name = (body.get("name") or playlist.name).strip() or playlist.name
        if "description" in body:
            playlist.description = body.get("description", playlist.description)
        playlist.save()
        return JsonResponse({"id": playlist.id, "name": playlist.name})

    playlist.delete()
    return JsonResponse({"status": "deleted"})


@require_http_methods(["POST", "DELETE"])
@login_required
def api_playlist_songs(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk, owner=request.user)

    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        body = {}

    song_id = body.get("song_id") or request.GET.get("song_id")
    if not song_id:
        return JsonResponse({"error": "song_id is required"}, status=400)
    song = get_object_or_404(Song, pk=song_id)

    if request.method == "POST":
        last_order = (
            PlaylistSong.objects.filter(playlist=playlist).count()
        )
        obj, created = PlaylistSong.objects.get_or_create(
            playlist=playlist, song=song, defaults={"order": last_order}
        )
        if not created:
            return JsonResponse({"status": "already_in_playlist"})
        return JsonResponse({"status": "added"}, status=201)

    PlaylistSong.objects.filter(playlist=playlist, song=song).delete()
    return JsonResponse({"status": "removed"})


@require_POST
def api_queue(request):
    """Build an ordered list of full song objects from a list of song ids.

    Used by the client to hydrate a queue when playing an entire playlist,
    album, or a shuffled selection in one request.
    """
    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    ids = body.get("ids") or []
    songs_by_id = Song.objects.select_related("artist", "album").in_bulk(ids)
    ordered = [songs_by_id[i] for i in ids if i in songs_by_id]
    return JsonResponse({"results": [s.to_dict(request) for s in ordered]})
