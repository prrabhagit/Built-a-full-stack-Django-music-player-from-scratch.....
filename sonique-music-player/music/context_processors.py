from .models import Favorite


def favorite_song_ids(request):
    if not request.user.is_authenticated:
        return {"user_favorite_ids": []}
    ids = list(
        Favorite.objects.filter(user=request.user).values_list("song_id", flat=True)
    )
    return {"user_favorite_ids": ids}
