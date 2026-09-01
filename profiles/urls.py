# urls.py
from django.urls import path

from .views import ProfileUpdateView

urlpatterns = [
    path("profile/me/", ProfileUpdateView.as_view(), name="update_profile"),
]
