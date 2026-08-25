# 06 - Securing Your API: Permissions & Access Control

In the previous guide, we set up the system to verify *who* a user is (Authentication). Now, we need to define *what* they are allowed to do (Permissions).

Currently, anyone can send a `POST` or `DELETE` request to your endpoints and modify your database. We are going to lock down those routes using DRF's permission classes, ensure new courses are tied to the user who created them, and prevent users from deleting courses they do not own.

## The Difference: Authentication vs. Permissions

* **Authentication:** "Are you logged in, and who are you?" (Handled by our JWT setup).
* **Permissions:** "Are you allowed to perform this specific action on this specific data?"

## Step 1: Built-in Permission Classes

DRF provides several built-in permission classes out of the box. The most common ones you will use are:

* `AllowAny`: Open to the public (the default).
* `IsAuthenticated`: The user must be logged in to access this view at all.
* `IsAdminUser`: The user must have `is_staff = True` in the Django database.
* `IsAuthenticatedOrReadOnly`: Anyone can make `GET` requests (read), but `POST`, `PUT`, and `DELETE` requests require the user to be logged in.

Let's apply `IsAuthenticatedOrReadOnly` to our explicit API views.

Open `api_app/views.py` and update your classes:

```python
# api_app/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from .models import Course
from .serializers import CourseManualSerializer

class CourseListCreateAPIView(APIView):
    # 1. Apply the permission class here
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        courses = Course.objects.all()
        serializer = CourseManualSerializer(courses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CourseManualSerializer(data=request.data)
        if serializer.is_valid():
            # 2. We can now safely access request.user because of our permission class!
            print(f"Course created by: {request.user.username}")
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

```

Now, if a logged-out user (or your React app without a token) tries to send a `POST` request, DRF will automatically block it and return a `401 Unauthorized` status code. (Your React Axios interceptor will catch this and redirect them to the login page!).

---

## Step 2: Connecting Data to the User

Just blocking routes isn't enough. When a user creates a course, we should save them as the "instructor" or "owner" of that course.

First, let's update the model in `api_app/models.py`:

```python
# api_app/models.py
from django.db import models
from django.contrib.auth.models import User

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    # Add this line to link the course to a user
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses', null=True)

    def __str__(self):
        return self.title

```

*(Remind your students to run `python manage.py makemigrations` and `python manage.py migrate` after updating the model!)*

Next, we need to pass the user to the serializer when we save the data. Update the `post` method in your `CourseListCreateAPIView`:

```python
    def post(self, request):
        serializer = CourseManualSerializer(data=request.data)
        if serializer.is_valid():
            # Pass the logged-in user directly to the save method
            serializer.save(instructor=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

```

Then, update your `CourseManualSerializer` in `serializers.py` to accept and save this new field:

```python
# api_app/serializers.py
# ... inside CourseManualSerializer:

    def create(self, validated_data):
        # Pop the instructor out of the validated_data (if it exists) or grab it from kwargs
        return Course.objects.create(**validated_data)

```

*(Note: Because we are passing `instructor=request.user` into `serializer.save()`, DRF automatically merges it into `validated_data` for you).*

---

## Step 3: Custom Object-Level Permissions (The Final Layer)

Right now, a user must be logged in to delete a course. However, **User A** could still delete a course owned by **User B** by sending a `DELETE` request to `/api/courses/2/`.

To fix this, we write a custom permission class.

Create a new file called `api_app/permissions.py`:

```python
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

```

Finally, apply this custom permission to your `CourseDetailAPIView` alongside the standard authentication check:

```python
# api_app/views.py
from .permissions import IsInstructorOrReadOnly

class CourseDetailAPIView(APIView):
    # Require login for edits, AND require the user to be the owner
    permission_classes = [IsAuthenticatedOrReadOnly, IsInstructorOrReadOnly]

    def get(self, request, pk):
        # ... same as before
        
    def put(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        
        # Manually trigger the object-level permission check
        self.check_object_permissions(request, course)
        
        serializer = CourseManualSerializer(course, data=request.data)
        if serializer.is_valid():
            serializer.save() 
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        
        # Manually trigger the object-level permission check
        self.check_object_permissions(request, course)
        
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

```

> **Important Note:** When using standard generic views or ViewSets, DRF checks object-level permissions automatically. But because we wrote an explicit `APIView` to understand the mechanics, we must explicitly call `self.check_object_permissions(request, course)` before modifying or deleting the object.
> 
> 
