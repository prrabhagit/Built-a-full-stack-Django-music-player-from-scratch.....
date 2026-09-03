import uuid

from django.conf import settings
from django.db import models


def song_upload_path(instance, filename):
    ext = filename.split(".")[-1]
    return f"songs/{uuid.uuid4().hex}.{ext}"


def cover_upload_path(instance, filename):
    ext = filename.split(".")[-1]
    return f"covers/{uuid.uuid4().hex}.{ext}"


class Genre(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Artist(models.Model):
    name = models.CharField(max_length=200, unique=True)
    bio = models.TextField(blank=True)
    image = models.ImageField(upload_to=cover_upload_path, blank=True, null=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Album(models.Model):
    title = models.CharField(max_length=200)
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="albums")
    cover_image = models.ImageField(upload_to=cover_upload_path, blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)

    class Meta:
        ordering = ["-release_date", "title"]
        unique_together = ("title", "artist")

    def __str__(self):
        return f"{self.title} - {self.artist.name}"


class Song(models.Model):
    title = models.CharField(max_length=200)
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="songs")
    album = models.ForeignKey(
        Album, on_delete=models.SET_NULL, related_name="songs", blank=True, null=True
    )
    genre = models.ForeignKey(
        Genre, on_delete=models.SET_NULL, related_name="songs", blank=True, null=True
    )
    audio_file = models.FileField(upload_to=song_upload_path)
    cover_image = models.ImageField(upload_to=cover_upload_path, blank=True, null=True)
    duration = models.PositiveIntegerField(
        default=0, help_text="Duration in seconds. Player will also read real duration client-side."
    )
    play_count = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.title} - {self.artist.name}"

    def get_cover_url(self):
        if self.cover_image:
            return self.cover_image.url
        if self.album and self.album.cover_image:
            return self.album.cover_image.url
        return None

    def duration_display(self):
        minutes, seconds = divmod(self.duration or 0, 60)
        return f"{minutes}:{seconds:02d}"

    def to_dict(self, request=None):
        cover = self.get_cover_url()
        audio = self.audio_file.url if self.audio_file else None
        if request is not None:
            if cover:
                cover = request.build_absolute_uri(cover)
            if audio:
                audio = request.build_absolute_uri(audio)
        return {
            "id": self.id,
            "title": self.title,
            "artist": self.artist.name,
            "artistId": self.artist_id,
            "album": self.album.title if self.album else None,
            "albumId": self.album_id,
            "genre": self.genre.name if self.genre else None,
            "audioUrl": audio,
            "coverUrl": cover,
            "duration": self.duration,
        }


class Playlist(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="playlists"
    )
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.name} ({self.owner.username})"

    def song_count(self):
        return self.playlist_songs.count()

    def cover_urls(self, limit=4):
        covers = []
        for ps in self.playlist_songs.select_related("song")[:limit]:
            url = ps.song.get_cover_url()
            if url:
                covers.append(url)
        return covers


class PlaylistSong(models.Model):
    playlist = models.ForeignKey(
        Playlist, on_delete=models.CASCADE, related_name="playlist_songs"
    )
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="in_playlists")
    order = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "added_at"]
        unique_together = ("playlist", "song")

    def __str__(self):
        return f"{self.song.title} in {self.playlist.name}"


class Favorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites"
    )
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("user", "song")

    def __str__(self):
        return f"{self.user.username} likes {self.song.title}"


class PlayHistory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="play_history"
    )
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="play_history")
    played_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-played_at"]
        verbose_name_plural = "Play history"

    def __str__(self):
        return f"{self.user.username} played {self.song.title}"


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    avatar = models.ImageField(upload_to=cover_upload_path, blank=True, null=True)
    bio = models.CharField(max_length=300, blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"
