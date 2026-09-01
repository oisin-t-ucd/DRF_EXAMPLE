from rest_framework import status

# api_app/auth_views.py
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import RegisterManualSerializer, UserManualSerializer

# api_app/auth_views.py


class RegisterAPIView(APIView):
    # Registration must be public (we could just skip this line, but it makes the intent more explicit)
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterManualSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "User created successfully."},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CookieTokenObtainPairView(TokenObtainPairView):
    """Handles login: Returns access token in JSON, sets refresh token in HttpOnly cookie."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            refresh_token = response.data.get("refresh")
            # 1. Remove it from the JSON payload
            del response.data["refresh"]

            # 2. Attach it as an HttpOnly cookie
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                max_age=24 * 60 * 60,  # 1 day
                httponly=True,
                samesite="Lax",  # Required for cross-origin local development
                secure=False,  # IMPORTANT: Set to True in production (HTTPS)
            )
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Handles refreshing: Reads the refresh token from the cookie."""

    def post(self, request, *args, **kwargs):
        # Inject the cookie into the request data so SimpleJWT can validate it
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            request.data["refresh"] = refresh_token

        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    """Handles logout: Deletes the HttpOnly cookie."""

    def post(self, request):
        response = Response(
            {"message": "Logged out successfully"}, status=status.HTTP_200_OK
        )
        response.delete_cookie("refresh_token")
        return response


class CurrentUserAPIView(APIView):
    # The user MUST have a valid token to access this view
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Serialize the user making the request
        serializer = UserManualSerializer(request.user)
        return Response(serializer.data)
