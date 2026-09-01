# views.py
from rest_framework import generics, permissions

from .serializers import ProfileSerializer


class ProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Always return/update the profile of the currently logged-in user
    def get_object(self):
        return self.request.user.profile
