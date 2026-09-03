from django.urls import path

from . import views

urlpatterns = [
    # Pages
    path("", views.home, name="home"),
    path("register/", views.register, name="register"),
    path("login/", views.SoniqueLoginView.as_view(), name="login"),
    path("logout/", views.SoniqueLogoutView.as_view(), name="logout"),
    path("search/", views.search_page, name="search"),
    path("favorites/", views.favorites_page, name="favorites"),
    path("playlists/", views.playlists_page, name="playlists"),
    path("playlists/<int:pk>/", views.playlist_detail, name="playlist_detail"),
    path("profile/", views.profile_page, name="profile"),
    # JSON API
    path("api/songs/", views.api_songs, name="api_songs"),
    path("api/songs/<int:song_id>/play/", views.api_play_song, name="api_play_song"),
    path("api/search/", views.api_search, name="api_search"),
    path("api/favorites/", views.api_favorites, name="api_favorites"),
    path("api/playlists/", views.api_playlists, name="api_playlists"),
    path("api/playlists/<int:pk>/", views.api_playlist_detail, name="api_playlist_detail"),
    path(
        "api/playlists/<int:pk>/songs/",
        views.api_playlist_songs,
        name="api_playlist_songs",
    ),
    path("api/queue/", views.api_queue, name="api_queue"),
]
