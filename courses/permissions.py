# api_app/permissions.py
from rest_framework import permissions


class IsInstructorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow the instructor of a course to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the instructor of the course.
        return obj.instructor == request.user
