from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

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
        self.assertEqual(Course.objects.count(), 1)

    # --- 3. UPDATE (PUT/PATCH) ---
    def test_update_course_as_owner(self):
        """Verify that the course creator can update their own course."""
        self.client.force_authenticate(user=self.owner)
        data = {"title": "Updated Fullstack Course", "description": "New"}

        # We use PUT for updates
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
