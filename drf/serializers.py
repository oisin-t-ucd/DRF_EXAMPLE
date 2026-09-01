# serializers.py
from django.contrib.auth.models import User
from rest_framework import serializers

from profiles.serializers import ProfileSerializer


class UserManualSerializer(serializers.ModelSerializer):
    # Nest the profile serializer. read_only=True ensures we don't
    # break standard JSON user updates with complex multipart payloads.
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile"]


class RegisterManualSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    # write_only=True ensures passwords are NEVER sent back in the JSON response
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate(self, data):
        # 1. Check if passwords match
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        # 2. Check if username already exists
        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError(
                {"username": "This username is already taken."}
            )

        return data

    def create(self, validated_data):
        # Use create_user (not create) so Django automatically hashes the password!
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user
