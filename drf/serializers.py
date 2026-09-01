# api_app/serializers.py
from rest_framework import serializers


class UserManualSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField()
    email = serializers.EmailField()
