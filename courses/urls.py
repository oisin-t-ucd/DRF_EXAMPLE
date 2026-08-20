# api_app/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CourseDetailAPIView, CourseListCreateAPIView, CourseViewSet

# Create a router and register our viewset with it.
router = DefaultRouter()
router.register(r"courses", CourseViewSet)

# The API URLs are now determined automatically by the router.
# urlpatterns = [
#     path("api/", include(router.urls)),
# ]


urlpatterns = [
    # Endpoint for the collection (List/Create)
    path("courses/", CourseListCreateAPIView.as_view(), name="course-list"),
    # Endpoint for a specific item (Retrieve/Update/Delete)
    path("courses/<int:pk>/", CourseDetailAPIView.as_view(), name="course-detail"),
]
