# api_app/serializers.py
from rest_framework import serializers

from .models import Course


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"  # This tells DRF to include all model fields in the JSON
