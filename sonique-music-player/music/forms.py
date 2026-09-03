from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import Playlist, UserProfile


class RegisterForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.update({"class": "field-input"})

    def save(self, commit=True):
        user = super().save(commit=commit)
        if commit:
            UserProfile.objects.get_or_create(user=user)
        return user


class PlaylistForm(forms.ModelForm):
    class Meta:
        model = Playlist
        fields = ("name", "description")
        widgets = {
            "name": forms.TextInput(
                attrs={"placeholder": "My Playlist", "maxlength": 200, "class": "field-input"}
            ),
            "description": forms.TextInput(
                attrs={
                    "placeholder": "Optional description",
                    "maxlength": 300,
                    "class": "field-input",
                }
            ),
        }


class ProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ("avatar", "bio")
        widgets = {
            "bio": forms.TextInput(attrs={"class": "field-input", "maxlength": 300}),
            "avatar": forms.ClearableFileInput(attrs={"class": "field-file"}),
        }
