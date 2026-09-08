from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

# api_app/views.py
from rest_framework import generics, status
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course
from .permissions import IsInstructorOrReadOnly
from .serializers import CourseManualSerializer

## BELOW ARE 3 OPTIONS FOR View Classes


# Option 1:
# Generic ApiViews, prebuilt CRUD functionality, can also be customized
class CourseListCreateAPIView(generics.ListCreateAPIView):
    queryset = Course.objects.all().order_by("-id")
    serializer_class = CourseManualSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    # 1. Register the filter backends
    filter_backends = [DjangoFilterBackend, SearchFilter]

    # 2. Define exact-match filters (?is_active=true)
    filterset_fields = ["is_active"]

    # 3. Define search fields (?search=python)
    search_fields = ["title", "description"]

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


# Option 2:
# ModelViewSet implementation (builds all standard CRUD views automatically from your serializer class)
# Great for standard setups, less granular control over behaviour for specific actions
# class CourseViewSet(viewsets.ModelViewSet):
#     queryset = Course.objects.all()
#     serializer_class = CourseSerializer


# Option 3:
# APIView implementation (manual definition of each class/HTTP method - get/post/put etc.)
#
# class CourseListCreateAPIView(APIView):
#     permission_classes = [IsAuthenticatedOrReadOnly]
#     """
#     Handles GET (list all courses) and POST (create a new course).
#     """

#     def get(self, request):
#         courses = Course.objects.all()
#         # 'many=True' tells DRF we are serializing a list of objects, not just one.
#         serializer = CourseManualSerializer(courses, many=True)
#         return Response(serializer.data, status=status.HTTP_200_OK)

#     def post(self, request):
#         # request.data contains the incoming JSON payload from the frontend

#         serializer = CourseManualSerializer(data=request.data)
#         print("DATA IN POST REQUEST:")
#         pprint(request.data)
#         # We MUST validate the data before saving
#         if serializer.is_valid():
#             serializer.save(
#                 instructor=request.user
#             )  # This triggers the create() method in our serializer
#             return Response(serializer.data, status=status.HTTP_201_CREATED)

#         # If invalid, return the exact errors to the frontend
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CourseDetailAPIView(APIView):
    """
    Handles GET, PUT, and DELETE for a single course item.
    """

    permission_classes = [IsAuthenticatedOrReadOnly, IsInstructorOrReadOnly]

    def get(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        serializer = CourseManualSerializer(course)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        self.check_object_permissions(request, course)

        serializer = CourseManualSerializer(instance=course, data=request.data)
        if serializer.is_valid():

            serializer.save()  # This triggers the update() method in our serializer
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        self.check_object_permissions(request, course)
        course.delete()
        # 204 No Content is the standard response for a successful deletion
        return Response(status=status.HTTP_204_NO_CONTENT)
