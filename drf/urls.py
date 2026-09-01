"""
URL configuration for drf project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path

# Create a router and register our viewset with it.
# router = DefaultRouter()
# router.register(r"courses", CourseViewSet)
from courses import urls as courses_urls
from profiles import urls as profiles_urls

from .views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CurrentUserAPIView,
    LogoutView,
    RegisterAPIView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(courses_urls)),
    path("api/", include(profiles_urls)),
    path("api/users/me/", CurrentUserAPIView.as_view(), name="current-user"),
    path("api/login/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("api/logout/", LogoutView.as_view(), name="logout"),
    path("api/register/", RegisterAPIView.as_view(), name="register"),
]
