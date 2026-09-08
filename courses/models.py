# api_app/models.py
from django.contrib.auth.models import User
from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name  # api_app/models.py


class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    # Add this line to link the course to a user
    instructor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="courses", null=True
    )

    # NEW: A Many-to-Many relationship. A course can have many tags, and a tag can belong to many courses.
    tags = models.ManyToManyField(Tag, related_name="courses", blank=True)

    def __str__(self):
        return self.title


class Lesson(models.Model):
    # NEW: A One-to-Many relationship. A course can have many lessons, but a lesson belongs to exactly one course.
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    content = models.TextField()
    order = models.IntegerField(default=0)  # Helps us sort lessons logically

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.course.title} - {self.title}"
