# 02 - DRF Deep Dive: Under the Hood of APIs

In the previous guide, you used `ModelSerializer` and `ViewSets`, which combine the logic for listing, creating, retrieving, updating, and deleting items into a single class. That "magic" is fantastic for rapid development, but as a full-stack developer, you need to know exactly how data flows between your server and a frontend framework like React.

Today, we are going to peel back the layers. We will rebuild our `Course` API by manually defining our fields, handling the data validation step-by-step, and explicitly defining our HTTP request methods.

## The Explicit Serializer

A `ModelSerializer` automatically inspects your database model and generates fields for you. To understand how that works, we will write a base `Serializer`.

Using a base `Serializer` requires you to explicitly define every field and manually tell Django how to create or update an object. This is highly useful when you need an API endpoint that doesn't strictly match a database table (like a contact form or a complex search filter).

Create a new class in `api_app/serializers.py`:

```python
from rest_framework import serializers
from .models import Course

class CourseManualSerializer(serializers.Serializer):
    # 1. Explicitly define the fields to serialize/deserialize
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    is_active = serializers.BooleanField(default=True)

    # 2. Define how to handle saving NEW data (POST)
    def create(self, validated_data):
        """
        Create and return a new `Course` instance, given the validated data.
        """
        return Course.objects.create(**validated_data)

    # 3. Define how to handle UPDATING existing data (PUT/PATCH)
    def update(self, instance, validated_data):
        """
        Update and return an existing `Course` instance, given the validated data.
        """
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        
        instance.save()
        return instance

```

## The Explicit APIView

A `ViewSet` hides the routing of HTTP verbs (GET, POST, PUT, DELETE). When preparing to connect a React frontend, it is crucial to understand exactly which HTTP method triggers which block of code, and what HTTP status code is returned.

We will replace the `ViewSet` with `APIView`, separating our logic into two views: one for the list/create operations, and one for individual item operations.

In `api_app/views.py`:

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Course
from .serializers import CourseManualSerializer

class CourseListCreateAPIView(APIView):
    """
    Handles GET (list all courses) and POST (create a new course).
    """
    def get(self, request):
        courses = Course.objects.all()
        # 'many=True' tells DRF we are serializing a list of objects, not just one.
        serializer = CourseManualSerializer(courses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        # request.data contains the incoming JSON payload from the frontend
        serializer = CourseManualSerializer(data=request.data)
        
        # We MUST validate the data before saving
        if serializer.is_valid():
            serializer.save() # This triggers the create() method in our serializer
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
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        serializer = CourseManualSerializer(course, data=request.data)
        
        if serializer.is_valid():
            serializer.save() # This triggers the update() method in our serializer
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        course.delete()
        # 204 No Content is the standard response for a successful deletion
        return Response(status=status.HTTP_204_NO_CONTENT)

```

### The Data Lifecycle Explained

When reading the code above, notice the exact lifecycle of data passing between the client (React/Browser) and the database (Django):

* **Inbound (Frontend to Backend):** JSON arrives $\rightarrow$ `request.data` parses it $\rightarrow$ Passed into `CourseManualSerializer(data=...)` $\rightarrow$ `is_valid()` checks types and constraints $\rightarrow$ `save()` writes to the database.
* **Outbound (Backend to Frontend):** Python objects fetched via `Course.objects.all()` $\rightarrow$ Passed into `CourseManualSerializer(instance)` $\rightarrow$ Converted to dictionaries in `serializer.data` $\rightarrow$ Returned as JSON via `Response()`.

## Wiring Up Manual URLs

Because we are no longer using a `DefaultRouter`, we must explicitly map our URL paths to these specific views.

In `api_app/urls.py`:

```python
from django.urls import path
from .views import CourseListCreateAPIView, CourseDetailAPIView

urlpatterns = [
    # Endpoint for the collection (List/Create)
    path('courses/', CourseListCreateAPIView.as_view(), name='course-list'),
    
    # Endpoint for a specific item (Retrieve/Update/Delete)
    path('courses/<int:pk>/', CourseDetailAPIView.as_view(), name='course-detail'),
]

```

## Preparing for React & Authentication

Writing explicit `APIViews` sets the foundation for modern frontend integration. When we transition to React, you will be making `fetch()` or `axios` calls to these endpoints.

React needs to know if a request succeeded or failed so it can update the UI or show an error message. This is why we explicitly import and return `status.HTTP_201_CREATED` or `status.HTTP_400_BAD_REQUEST`. In future lessons, we will add permissions (e.g., ensuring a user is logged in). When an unauthenticated React client tries to POST a new course, your `APIView` will automatically reject it and return a `401 Unauthorized` or `403 Forbidden` status code, signaling React to redirect the user to a login screen.
