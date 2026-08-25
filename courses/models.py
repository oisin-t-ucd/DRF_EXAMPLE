# api_app/models.py
from django.contrib.auth.models import User
from django.db import models


class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    # Add this line to link the course to a user
    instructor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="courses", null=True
    )

    def __str__(self):
        return self.title
