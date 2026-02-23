# backend/apps/incident/serializers.py
from rest_framework import serializers


class FallJudgeRequestSerializer(serializers.Serializer):
    images = serializers.ListField(
        child=serializers.CharField(
            help_text="Base64-encoded JPG string (data:image/jpeg;base64,... or raw base64)"
        ),
        min_length=5,
        max_length=5,
        help_text="Exactly 5 images in chronological order (oldest → newest)",
    )


class FallJudgeResponseSerializer(serializers.Serializer):
    is_fall_or_imminent_fall = serializers.BooleanField()
    confidence = serializers.FloatField()
    reasoning = serializers.CharField()