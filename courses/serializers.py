# api_app/serializers.py
from rest_framework import serializers

from .models import Course


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"  # This tells DRF to include all model fields in the JSON


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
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.is_active = validated_data.get("is_active", instance.is_active)

        instance.save()
        return instance
