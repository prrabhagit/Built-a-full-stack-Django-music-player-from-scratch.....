from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Album,
    Artist,
    Favorite,
    Genre,
    PlayHistory,
    Playlist,
    PlaylistSong,
    Song,
    UserProfile,
)


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("name", "image_preview", "album_count", "song_count")
    search_fields = ("name",)
    ordering = ("name",)

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:40px;width:40px;object-fit:cover;'
                'border-radius:6px;" />',
                obj.image.url,
            )
        return "-"

    image_preview.short_description = "Image"

    def album_count(self, obj):
        return obj.albums.count()

    def song_count(self, obj):
        return obj.songs.count()


class SongInline(admin.TabularInline):
    model = Song
    extra = 0
    fields = ("title", "genre", "duration")


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "release_date", "cover_preview", "song_count")
    list_filter = ("artist", "release_date")
    search_fields = ("title", "artist__name")
    ordering = ("-release_date",)
    inlines = [SongInline]

    def cover_preview(self, obj):
        if obj.cover_image:
            return format_html(
                '<img src="{}" style="height:40px;width:40px;object-fit:cover;'
                'border-radius:6px;" />',
                obj.cover_image.url,
            )
        return "-"

    cover_preview.short_description = "Cover"

    def song_count(self, obj):
        return obj.songs.count()


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "artist",
        "album",
        "genre",
        "duration_display",
        "play_count",
        "cover_preview",
        "uploaded_at",
    )
    list_filter = ("genre", "artist", "album", "uploaded_at")
    search_fields = ("title", "artist__name", "album__title")
    ordering = ("-uploaded_at",)
    readonly_fields = ("play_count", "uploaded_at")
    fieldsets = (
        (None, {"fields": ("title", "artist", "album", "genre")}),
        ("Media", {"fields": ("audio_file", "cover_image", "duration")}),
        ("Stats", {"fields": ("play_count", "uploaded_at")}),
    )

    def cover_preview(self, obj):
        url = obj.get_cover_url()
        if url:
            return format_html(
                '<img src="{}" style="height:40px;width:40px;object-fit:cover;'
                'border-radius:6px;" />',
                url,
            )
        return "-"

    cover_preview.short_description = "Cover"


class PlaylistSongInline(admin.TabularInline):
    model = PlaylistSong
    extra = 0


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "song_count", "created_at", "updated_at")
    list_filter = ("owner",)
    search_fields = ("name", "owner__username")
    inlines = [PlaylistSongInline]

    def song_count(self, obj):
        return obj.song_count()


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "song", "created_at")
    list_filter = ("user",)
    search_fields = ("user__username", "song__title")


@admin.register(PlayHistory)
class PlayHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "song", "played_at")
    list_filter = ("user",)
    search_fields = ("user__username", "song__title")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "bio")
    search_fields = ("user__username",)


admin.site.site_header = "Sonique Admin"
admin.site.site_title = "Sonique Admin"
admin.site.index_title = "Music Library Management"
