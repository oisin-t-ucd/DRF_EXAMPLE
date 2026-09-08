# api_app/serializers.py
from rest_framework import serializers

from .models import Course


class TagSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=50)


class LessonSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()
    order = serializers.IntegerField()
    # We do NOT include the 'course' field here.
    # Since this will be nested inside the Course data, including it would be redundant!


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"  # This tells DRF to include all model fields in the JSON


class CourseManualSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    is_active = serializers.BooleanField(default=True)
    instructor = serializers.CharField(source="instructor.username", read_only=True)

    # 1. READ-ONLY NESTED FIELDS
    # 'many=True' tells DRF to expect a list of objects.
    lessons = LessonSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    # 2. WRITE-ONLY RELATION FIELDS
    # The frontend will send an array of IDs like: { "tag_ids": [1, 3] }
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    def create(self, validated_data):
        # Extract the tag_ids before creating the course, because M2M fields
        # cannot be assigned until the parent object actually exists in the database.
        tag_ids = validated_data.pop("tag_ids", [])

        course = Course.objects.create(**validated_data)

        # Now that the course has an ID, we can assign the tags
        if tag_ids:
            course.tags.set(tag_ids)

        return course

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
