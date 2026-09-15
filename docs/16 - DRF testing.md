# Automated Testing with DRF: Verifying the Courses App

Testing is a critical part of engineering a robust, secure API. Rather than manually clicking through your React frontend or making endless Postman requests, automated tests verify your backend logic in seconds. Here is how to test your `courses` application using Django REST Framework's testing tools.

## The Foundation: APITestCase

Standard Django uses `TestCase`, but for APIs, we use `APITestCase`. This provides an `APIClient` that mimics frontend requests and spins up a blank, isolated PostgreSQL test database that safely destroys itself when the tests finish.


## Testing API Permissions and Responses

Your API likely requires authentication for certain actions. We can use the test client to verify both unauthorized and authorized requests without needing to manually fetch JWT tokens. 


# Comprehensive DRF Testing: Full CRUD Lifecycle

To guarantee your API is secure and reliable, it's recommended to test every possible action a user can take. This means testing the full CRUD lifecycle (List, Retrieve, Create, Update, Delete) and ensuring our permission classes are actively protecting our data.

Below is a complete test suite for the `courses` app. We will set up two different users in our test database to verify that users can only edit or delete the courses they actually own.

## The Complete Test Suite

Open your `courses/tests.py` file and replace your initial tests with this comprehensive suite.

```python
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from .models import Course


class CourseApiTests(APITestCase):
    def setUp(self):
        # 1. Create an 'owner' user and a 'stranger' user to test permissions
        self.owner = User.objects.create_user(
            username="instructor_jane", password="password123"
        )
        self.stranger = User.objects.create_user(
            username="student_bob", password="password123"
        )

        # 2. Create a course owned by the first user
        self.course = Course.objects.create(
            title="Fullstack Web Development", instructor=self.owner
        )

        # 3. Define the URLs (Ensure these match your courses/urls.py router names)
        self.list_url = reverse("course-list")
        self.detail_url = reverse("course-detail", kwargs={"pk": self.course.pk})

    # --- 1. READ (GET) ---
    def test_get_course_list(self):
        """Verify that anyone can view the list of courses."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_get_course_detail(self):
        """Verify that anyone can view a single course's details."""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Fullstack Web Development")

    # --- 2. CREATE (POST) ---
    def test_create_course_authenticated(self):
        """Verify that a logged-in user can create a course."""
        self.client.force_authenticate(user=self.owner)
        data = {"title": "Advanced DRF Testing", "description": "TEST"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Course.objects.count(), 2)

    def test_create_course_unauthenticated(self):
        """Verify that anonymous users cannot create courses."""
        data = {"title": "Hacker Course"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- 3. UPDATE (PUT/PATCH) ---
    def test_update_course_as_owner(self):
        """Verify that the course creator can update their own course."""
        self.client.force_authenticate(user=self.owner)
        data = {"title": "Updated Fullstack Course", "description": "New"}

        # We use PATCH for partial updates
        response = self.client.put(self.detail_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh from database to ensure it actually changed
        self.course.refresh_from_db()
        self.assertEqual(self.course.title, "Updated Fullstack Course")

    def test_update_course_as_stranger(self):
        """Verify that a different user CANNOT update someone else's course."""
        self.client.force_authenticate(user=self.stranger)
        data = {"title": "Malicious Update"}

        response = self.client.put(self.detail_url, data)

        # Expecting a 403 Forbidden because of our custom permissions.py
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- 4. DELETE (DELETE) ---
    def test_delete_course_as_owner(self):
        """Verify that the owner can delete their course."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Course.objects.count(), 0)

    def test_delete_course_as_stranger(self):
        """Verify that a non-owner cannot delete the course."""
        self.client.force_authenticate(user=self.stranger)
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Course.objects.count(), 1)  # Course should still exist

```

## What This Suite Achieves

By running this suite, you are proving three critical things about your API:

1. **Routing works:** The `reverse()` function successfully finds your endpoints.
2. **Serialization works:** Data is successfully entering the database and returning as JSON.
3. **Security works:** The rules defined in your `courses/permissions.py` file are actively blocking unauthorized edits and deletions.





## Running Your Tests

Execute your test suite from your terminal using Django's management commands.

* **Run all tests:** Execute `python manage.py test` to run the entire project suite.
* **Run targeted tests:** Execute `python manage.py test courses` to only run this specific app.
* **Read the output:** A dot (`.`) means a pass, while an `F` or `E` indicates a failure or error.

Start by writing one failing test, update your views or serializers to make it pass, and then move on to the next feature.


