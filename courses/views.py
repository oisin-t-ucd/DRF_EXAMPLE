from pprint import pprint

from django.shortcuts import get_object_or_404

# api_app/views.py
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course
from .serializers import CourseManualSerializer, CourseSerializer


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer


class CourseListCreateAPIView(APIView):
    """
    Handles GET (list all courses) and POST (create a new course).
    """

    def get(self, request):
        courses = Course.objects.all()
        # 'many=True' tells DRF we are serializing a list of objects, not just one.
        serializer = CourseManualSerializer(courses, many=True)
        print("DATA:")

        for object in serializer.data:
            pprint(object, indent=2)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        # request.data contains the incoming JSON payload from the frontend

        serializer = CourseManualSerializer(data=request.data)
        print("DATA IN POST REQUEST:")
        pprint(request.data)
        # We MUST validate the data before saving
        if serializer.is_valid():
            serializer.save()  # This triggers the create() method in our serializer
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # If invalid, return the exact errors to the frontend
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CourseDetailAPIView(APIView):
    """
    Handles GET, PUT, and DELETE for a single course item.
    """

    def get(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        serializer = CourseManualSerializer(course)
        print("GET SINGLE COURSE RESPONSE:")
        pprint(serializer.data, indent=2)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        print("REQUEST DATA:")
        pprint(request.data)
        serializer = CourseManualSerializer(instance=course, data=request.data)
        if serializer.is_valid():
            print("REQUEST DATA:")
            pprint(serializer.validated_data)
            serializer.save()  # This triggers the update() method in our serializer
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        course.delete()
        # 204 No Content is the standard response for a successful deletion
        return Response(status=status.HTTP_204_NO_CONTENT)
