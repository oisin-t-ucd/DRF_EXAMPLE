# api_app/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CourseViewSet

# Create a router and register our viewset with it.
router = DefaultRouter()
router.register(r"courses", CourseViewSet)

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path("api/", include(router.urls)),
]
